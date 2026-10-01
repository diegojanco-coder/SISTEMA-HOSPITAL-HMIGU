const {test,after}=require('node:test');const assert=require('node:assert/strict');const {randomBytes}=require('node:crypto');const {pool}=require('../src/config/db');const {cargar,catalogo}=require('../src/database/loadVerifiedCatalog');after(()=>pool.end());
test('catálogo base crea dieciocho dosis, es repetible y conserva ajustes existentes',async()=>{
 const db=await pool.getConnection();const originales=catalogo.map(v=>({...v}));
 try{await db.beginTransaction();const tag=randomBytes(4).toString('hex');catalogo.forEach((v,i)=>{v.nombre='Prueba catalogo '+tag+i;v.codigo='T'+tag+i;});
 assert.deepEqual(await cargar(db),{vacunas:8,dosis:18});
 const [[bcg]]=await db.query('SELECT d.* FROM dosis d JOIN vacunas v ON v.id=d.vacuna_id WHERE v.nombre_corto=?',[catalogo[5].codigo]);
 const reglaBcg=typeof bcg.regla_calendario==='string'?JSON.parse(bcg.regla_calendario):bcg.regla_calendario;
 assert.equal(bcg.edad_recomendada_valor,0);
 assert.equal(require('../src/utils/elegibilidad.util').evaluarAlcance({fecha_nacimiento:'2025-09-13',sexo:'F'},{regla_calendario:reglaBcg},'2026-09-12'),null);
 assert.equal(require('../src/utils/elegibilidad.util').evaluarAlcance({fecha_nacimiento:'2025-09-13',sexo:'F'},{regla_calendario:reglaBcg},'2026-09-13'),null);
 const [nuevas]=await db.query('SELECT v.nombre_corto,d.numero_dosis,d.edad_recomendada_valor,d.regla_calendario FROM dosis d JOIN vacunas v ON v.id=d.vacuna_id WHERE v.nombre_corto IN (?,?)',[catalogo[3].codigo,catalogo[4].codigo]);
 assert.equal(nuevas.length,2);
 const parse=r=>typeof r==='string'?JSON.parse(r):r;
 const [polio]=await db.query('SELECT d.*,v.nombre_corto FROM dosis d JOIN vacunas v ON v.id=d.vacuna_id WHERE v.nombre_corto IN (?,?) ORDER BY d.numero_dosis',[catalogo[6].codigo,catalogo[7].codigo]);
 assert.deepEqual(polio.map(d=>d.numero_dosis),[1,2,3,4,5]);
 assert.deepEqual(polio.map(d=>d.edad_recomendada_valor),[2,4,6,18,48]);
 assert.deepEqual(polio.map(d=>d.nombre_corto),[catalogo[6].codigo,catalogo[7].codigo,catalogo[6].codigo,catalogo[7].codigo,catalogo[7].codigo]);
 assert.notEqual(polio[0].vacuna_id,polio[1].vacuna_id);
 assert.equal(parse(polio[0].regla_calendario).programacion.base,'nacimiento');
 for(let i=1;i<polio.length;i++){
  assert.deepEqual(parse(polio[i].regla_calendario).programacion,{base:'dosis_previa',dosisId:polio[i-1].id,valor:[0,2,2,12,30][i],unidad:'meses',permitirOtraVacuna:true});
  assert.equal(parse(polio[i].regla_calendario).maxMesesExclusivo,60);
  assert.equal(polio[i].intervalo_minimo_dias,0,'No confundir intervalo óptimo con mínimo biológico');
 }
 const fa=nuevas.find(d=>d.nombre_corto===catalogo[3].codigo),vph=nuevas.find(d=>d.nombre_corto===catalogo[4].codigo);
 assert.equal(fa.edad_recomendada_valor,12);assert.equal(fa.numero_dosis,1);
 assert.equal(parse(fa.regla_calendario).minMeses,12);assert.equal(parse(fa.regla_calendario).maxMesesExclusivo,24);
 assert.equal(vph.numero_dosis,1);assert.equal(parse(vph.regla_calendario).programacion.base,'contacto');
 assert.deepEqual(parse(vph.regla_calendario).edadesPorSexo,{F:{minMeses:120,maxMesesExclusivo:180},M:{minMeses:120,maxMesesExclusivo:132}});
 const {evaluarAlcance}=require('../src/utils/elegibilidad.util');
 const dosisVph={regla_calendario:parse(vph.regla_calendario)},dosisFa={regla_calendario:parse(fa.regla_calendario)};
 assert.equal(evaluarAlcance({fecha_nacimiento:'2012-09-12',sexo:'F'},dosisVph,'2026-09-12'),null);
 assert.equal(evaluarAlcance({fecha_nacimiento:'2012-09-12',sexo:'M'},dosisVph,'2026-09-12'),null);
 assert.equal(evaluarAlcance({fecha_nacimiento:'2016-09-12',sexo:'M'},dosisVph,'2026-09-12'),null);
 assert.equal(evaluarAlcance({fecha_nacimiento:'2025-09-12',sexo:'M'},dosisFa,'2026-09-11'),'fuera_alcance');
 assert.equal(evaluarAlcance({fecha_nacimiento:'2025-09-12',sexo:'M'},dosisFa,'2026-09-12'),null);
 assert.equal(evaluarAlcance({fecha_nacimiento:'2024-09-12',sexo:'F'},dosisFa,'2026-09-12'),null);
 const [[d]]=await db.query('SELECT d.id FROM dosis d JOIN vacunas v ON v.id=d.vacuna_id WHERE v.nombre_corto=? ORDER BY d.id LIMIT 1',[catalogo[0].codigo]);
 await db.query('UPDATE dosis SET tolerancia_dias=17 WHERE id=?',[d.id]);
 assert.deepEqual(await cargar(db),{vacunas:0,dosis:0});const [[actual]]=await db.query('SELECT tolerancia_dias FROM dosis WHERE id=?',[d.id]);assert.equal(actual.tolerancia_dias,17);
 }finally{originales.forEach((v,i)=>Object.assign(catalogo[i],v));await db.rollback();db.release();}
});

// Reproduce el contrato transaccional del comando sin persistir datos de ensayo.
async function falloAislado(preparar, esperado) {
 const db=await pool.getConnection(),originales=catalogo.map(v=>({...v}));
 const auditoria=require('../src/models/auditoria.model'),crearAuditoria=auditoria.create;
 try {
  await db.beginTransaction();
  const tag=randomBytes(4).toString('hex');
  catalogo.forEach((v,i)=>{v.nombre='Fallo catalogo '+tag+i;v.codigo='F'+tag+i;});
  await preparar(db,auditoria);
  const contar=async()=>{
   const [[r]]=await db.query('SELECT (SELECT COUNT(*) FROM vacunas) vacunas,(SELECT COUNT(*) FROM dosis) dosis,(SELECT COUNT(*) FROM auditoria) auditorias');return r;
  };
  const antes=await contar();
  await db.query('SAVEPOINT carga_fallida');
  await assert.rejects(cargar(db),esperado);
  await db.query('ROLLBACK TO SAVEPOINT carga_fallida');
  assert.deepEqual(await contar(),antes,'El comando debe revertir vacunas, dosis y auditorías de la carga fallida');
 } finally {
  auditoria.create=crearAuditoria;
  originales.forEach((v,i)=>Object.assign(catalogo[i],v));
  await db.rollback();db.release();
 }
}

test('catálogo rechaza un nombre IPV y código bOPV que fusionarían formulaciones',()=>falloAislado(async db=>{
 await db.query('INSERT INTO vacunas(nombre,nombre_corto) VALUES (?,?)',[catalogo[6].nombre,catalogo[7].codigo]);
},/misma vacuna/));

test('catálogo no publica un seguimiento cuyo antecedente está inactivo',()=>falloAislado(async db=>{
 const [v]=await db.query('INSERT INTO vacunas(nombre,nombre_corto) VALUES (?,?)',[catalogo[6].nombre,catalogo[6].codigo]);
 await db.query("INSERT INTO dosis(vacuna_id,numero_dosis,nombre_dosis,edad_recomendada_dias,estado) VALUES (?,1,'Preexistente',60,'inactivo')",[v.insertId]);
},/antecedente activo/));

test('fallo de auditoría en carga antipolio revierte también sus referencias',()=>falloAislado(async(db,auditoria)=>{
 const crear=auditoria.create;let registros=0;
 auditoria.create=async(...args)=>{registros++;if(registros===15)throw new Error('Auditoría interrumpida');return crear(...args);};
},/Auditoría interrumpida/));
