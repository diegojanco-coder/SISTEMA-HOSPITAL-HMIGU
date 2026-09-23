const {test,after}=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const {pool}=require('../src/config/db');const service=require('../src/services/calendario.service');const audit=require('../src/models/auditoria.model');
const connect=pool.getConnection.bind(pool);after(()=>pool.end());
async function isolated(run){const c=await connect();const original=audit.create;try{await c.beginTransaction();const tag=randomUUID().slice(0,8);
const [v]=await c.query('INSERT INTO vacunas(nombre,nombre_corto) VALUES (?,?)',['CAL-'+tag,tag]);const ids=[];
for(let n=1;n<3;n++){const [d]=await c.query('INSERT INTO dosis(vacuna_id,numero_dosis,nombre_dosis,edad_recomendada_dias) VALUES (?,?,?,0)',[v.insertId,n,'Prueba '+n]);ids.push(d.insertId);}
pool.getConnection=async()=>({query:c.query.bind(c),beginTransaction:()=>c.query('SAVEPOINT regla'),commit:async()=>{},rollback:()=>c.query('ROLLBACK TO SAVEPOINT regla'),release:()=>{}});
await run(c,ids);
}finally{audit.create=original;pool.getConnection=connect;await c.rollback();c.release();}}
const payload=()=>({version:0,edadValor:18,edadUnidad:'meses',toleranciaDias:30,regla:{tipo:'regular',minMeses:0,maxMesesExclusivo:60,fuente:'https://example.invalid/norma',habilitada:true,programacion:{base:'nacimiento'}}});
test('calendario guarda versión y auditoría juntas; rechaza edición obsoleta',()=>isolated(async(c,[id])=>{
 const r=await service.guardar(id,payload());assert.equal(r.regla_calendario.version,1);assert.equal(r.edad_recomendada_valor,18);
 const [[a]]=await c.query("SELECT COUNT(*) n FROM auditoria WHERE entidad='calendario' AND entidad_id=?",[id]);assert.equal(a.n,1);
 await assert.rejects(service.guardar(id,payload()),e=>e.status===409);
}));
test('fallo de auditoría revierte la regla',()=>isolated(async(c,[id])=>{
 audit.create=async()=>{throw new Error('fallo auditoria');};await assert.rejects(service.guardar(id,payload()),/fallo auditoria/);
 const [[r]]=await c.query('SELECT regla_calendario FROM dosis WHERE id=?',[id]);assert.equal(r.regla_calendario,null);
}));
test('impide ciclos y referencias a otras vacunas',()=>isolated(async(c,[id,anterior])=>{
 const p=payload();p.regla.programacion={base:'dosis_previa',dosisId:anterior,valor:1,unidad:'meses'};await service.guardar(id,p);
 const q=payload();q.regla.programacion={base:'dosis_previa',dosisId:id,valor:1,unidad:'meses'};await assert.rejects(service.guardar(anterior,q),/ciclo/);
 q.regla.programacion.dosisId=99999999;await assert.rejects(service.guardar(anterior,q),/misma vacuna/);
}));
test('rechaza campaña sin fechas, fuente insegura e intervalo inválido',()=>{
 const p=payload();p.regla.tipo='campana';assert.throws(()=>service.validarRegla(p),/campaña/);
 const q=payload();q.regla.fuente='javascript:alert(1)';assert.throws(()=>service.validarRegla(q),/dirección/);
 const r=payload();r.regla.programacion={base:'dosis_previa',dosisId:1,valor:0,unidad:'meses'};assert.throws(()=>service.validarRegla(r),/intervalo/);
});

test('guarda y audita rangos por sexo, conserva ante conflicto y permite retirarlos',()=>isolated(async(c,[id])=>{
 const p=payload();p.regla.minMeses=120;p.regla.maxMesesExclusivo=180;p.regla.programacion={base:'contacto'};
 p.regla.edadesPorSexo={F:{minMeses:120,maxMesesExclusivo:180},M:{minMeses:120,maxMesesExclusivo:132}};
 const r=await service.guardar(id,p);assert.deepEqual(r.regla_calendario.edadesPorSexo,p.regla.edadesPorSexo);
 const [[a]]=await c.query("SELECT datos_nuevos FROM auditoria WHERE entidad='calendario' AND entidad_id=? ORDER BY id DESC LIMIT 1",[id]);
 const json=x=>typeof x==='string'?JSON.parse(x):x;
 assert.deepEqual(json(json(a.datos_nuevos).regla_calendario).edadesPorSexo,p.regla.edadesPorSexo);
 await assert.rejects(service.guardar(id,{...p,regla:{...p.regla,edadesPorSexo:{F:{minMeses:0,maxMesesExclusivo:null}}}}),e=>e.status===409);
 const [[conservada]]=await c.query('SELECT regla_calendario FROM dosis WHERE id=?',[id]);assert.deepEqual(json(conservada.regla_calendario).edadesPorSexo,p.regla.edadesPorSexo);
 const q={...p,version:1,regla:{...p.regla}};delete q.regla.edadesPorSexo;
 const final=await service.guardar(id,q);assert.equal(final.regla_calendario.edadesPorSexo,undefined);assert.equal(final.regla_calendario.version,2);
}));
test('administración rechaza mapas por sexo inválidos con estado 422',()=>{
 for(const edadesPorSexo of [null,{},[],{X:{minMeses:0,maxMesesExclusivo:null}},{F:{minMeses:120,maxMesesExclusivo:120}},{F:{minMeses:'120',maxMesesExclusivo:180}},{F:{minMeses:120}},{F:{minMeses:120,maxMesesExclusivo:null,extra:true}}]){
  const p=payload();p.regla.edadesPorSexo=edadesPorSexo;
  assert.throws(()=>service.validarRegla(p),e=>e.status===422&&/sexo/.test(e.message));
 }
});
