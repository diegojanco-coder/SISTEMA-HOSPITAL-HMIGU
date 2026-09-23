const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { pool } = require('../src/config/db');
const service = require('../src/services/historial.service');
const model = require('../src/models/historial.model');
const audit = require('../src/models/auditoria.model');
const alerts = require('../src/services/alerta.service');
const { registrarCita } = require('../src/services/cita.service');
const { evaluarEsquema } = require('../src/services/motorVacunacion.service');
const { generarReporte } = require('../src/services/reporte.service');
const connect = pool.getConnection.bind(pool), query = pool.query.bind(pool);
after(() => pool.end());

async function isolated(run) {
 const c = await connect(), crearAudit = audit.create, generarAlertas = alerts.generarAlertasPaciente;
 try {
  await c.beginTransaction();
  const tag = randomBytes(5).toString('hex');
  const [[user]] = await c.query("SELECT id FROM usuarios WHERE estado='activo' LIMIT 1");
  const [p] = await c.query("INSERT INTO pacientes(codigo_paciente,nombres,apellidos,fecha_nacimiento,sexo) VALUES (?,'Ensayo','Antecedente','1990-01-01','F')", ['TEST-' + tag]);
  const [v] = await c.query('INSERT INTO vacunas(nombre,nombre_corto) VALUES (?,?)', ['Ensayo externo ' + tag, tag]);
  const reglas = [], dosis = [];
  for(let i=1;i<=2;i++){
   const regla={tipo:'regular',minMeses:216,maxMesesExclusivo:null,habilitada:true,fuente:'https://example.invalid/ensayo',programacion:i===1?{base:'contacto'}:{base:'dosis_previa',dosisId:dosis[0],valor:2,unidad:'meses'}};
   const [d]=await c.query('INSERT INTO dosis(vacuna_id,numero_dosis,nombre_dosis,edad_recomendada_dias,regla_calendario) VALUES (?,?,?,0,?)',[v.insertId,i,'Ensayo '+i,JSON.stringify(regla)]);
   dosis.push(d.insertId);reglas.push(regla);
  }
  const [lot]=await c.query('INSERT INTO lotes_vacuna(vacuna_id,numero_lote,fecha_vencimiento,cantidad_disponible) VALUES (?,?,CURDATE()+INTERVAL 1 YEAR,5)',[v.insertId,tag]);
  pool.query=c.query.bind(c);
  pool.getConnection=async()=>({query:c.query.bind(c),beginTransaction:()=>c.query('SAVEPOINT antecedente'),commit:async()=>{},rollback:()=>c.query('ROLLBACK TO SAVEPOINT antecedente'),release:()=>{}});
  alerts.generarAlertasPaciente=async()=>{};
  const data={pacienteId:p.insertId,dosisId:dosis[0],fechaAplicacion:'2025-01-31',establecimiento:'Centro de salud de origen',documentoReferencia:'Carnet de vacunación, página 2'};
  const actor={usuarioId:user.id};
  const visita=fecha=>({pacienteId:p.insertId,usuarioId:user.id,dosisAplicadas:[{dosisId:dosis[1],loteVacunaId:lot.insertId,fechaAplicacion:fecha}]});
  await run({c,data,actor,dosis,lote:lot.insertId,visita});
 } finally {
  pool.query=query;pool.getConnection=connect;audit.create=crearAudit;alerts.generarAlertasPaciente=generarAlertas;
  await c.rollback();c.release();
 }
}
async function stock(c,id){const [[r]]=await c.query('SELECT cantidad_disponible n FROM lotes_vacuna WHERE id=?',[id]);return r.n;}

test('antecedente conserva procedencia y auditoría sin cita ni consumo; habilita seguimiento y no cuenta como producción hospitalaria',()=>isolated(async({c,data,actor,dosis,lote,visita})=>{
 const r=await service.registrarAntecedente(data,actor);
 assert.equal(r.origen,'externo');assert.equal(r.cita_id,null);assert.equal(r.lote_vacuna_id,null);assert.equal(r.documento_referencia,data.documentoReferencia);
 assert.equal(await stock(c,lote),5);
 const [[citas]]=await c.query('SELECT COUNT(*) n FROM citas WHERE paciente_id=?',[data.pacienteId]);assert.equal(citas.n,0);
 const [[auditada]]=await c.query("SELECT COUNT(*) n FROM auditoria WHERE entidad='historial_vacunacion' AND entidad_id=? AND usuario_id=?",[r.id,actor.usuarioId]);assert.equal(auditada.n,1);
 const hist=await model.findByPacienteId(data.pacienteId);assert.equal(hist.length,1);assert.equal(hist[0].aplicado_por,null);assert.ok(hist[0].registrado_por);
 const [[paciente]]=await c.query('SELECT * FROM pacientes WHERE id=?',[data.pacienteId]);
 const [catalogo]=await c.query('SELECT * FROM dosis WHERE id IN (?,?)',dosis);
 const esq=evaluarEsquema(paciente,catalogo,hist,new Date('2025-02-01T12:00:00'));
 assert.equal(esq.detalle.find(d=>d.dosisId===dosis[0]).estado,'aplicada');assert.equal(esq.detalle.find(d=>d.dosisId===dosis[1]).fechaRecomendada,'2025-03-31');
 const reporte=await generarReporte('vacunas-aplicadas',{desde:'2025-01-31',hasta:'2025-01-31'});
 assert.equal(reporte.filas.some(f=>f.codigo_paciente===paciente.codigo_paciente),false);
 await assert.rejects(registrarCita(visita('2025-03-30')),/intervalo/);
 await registrarCita(visita('2025-03-31'));assert.equal(await stock(c,lote),4);
}));

test('impide duplicar antecedente como registro externo o aplicación local',()=>isolated(async({data,actor,lote})=>{
 await service.registrarAntecedente(data,actor);
 await assert.rejects(service.registrarAntecedente(data,actor),e=>e.status===409);
 await assert.rejects(registrarCita({pacienteId:data.pacienteId,usuarioId:actor.usuarioId,dosisAplicadas:[{dosisId:data.dosisId,loteVacunaId:lote,fechaAplicacion:data.fechaAplicacion}]}),e=>e.status===409);
}));

test('rechaza fecha imposible, futura, anterior al nacimiento y documentos ausentes sin escribir',()=>isolated(async({c,data,actor})=>{
 for(const cambio of [{fechaAplicacion:'2025-02-30'},{fechaAplicacion:'2099-01-01'},{fechaAplicacion:'1989-12-31'},{documentoReferencia:''},{documentoReferencia:' '.repeat(4)},{establecimiento:''},{observaciones:'x'.repeat(256)}])await assert.rejects(service.registrarAntecedente({...data,...cambio},actor),e=>e.status===422);
 const [[r]]=await c.query('SELECT COUNT(*) n FROM historial_vacunacion WHERE paciente_id=?',[data.pacienteId]);assert.equal(r.n,0);
}));

test('fallo de auditoría revierte el antecedente; fallo posterior de alertas conserva el guardado con advertencia',()=>isolated(async({c,data,actor,lote})=>{
 const original=audit.create;
 audit.create=async()=>{throw new Error('Fallo auditado de ensayo');};
 await assert.rejects(service.registrarAntecedente(data,actor),/Fallo auditado/);
 const [[r]]=await c.query('SELECT COUNT(*) n FROM historial_vacunacion WHERE paciente_id=?',[data.pacienteId]);assert.equal(r.n,0);
 audit.create=original;alerts.generarAlertasPaciente=async()=>{throw new Error('Ensayo');};
 const guardada=await service.registrarAntecedente(data,actor);assert.equal(guardada.advertencias.length,1);assert.equal(await stock(c,lote),5);
}));

test('inserción o corrección externa no puede invalidar una dosis posterior existente',()=>isolated(async({c,data,actor,dosis,lote})=>{
 const [cita]=await c.query('INSERT INTO citas(paciente_id,usuario_id) VALUES (?,?)',[data.pacienteId,actor.usuarioId]);
 await c.query("INSERT INTO historial_vacunacion(paciente_id,dosis_id,usuario_id,cita_id,lote_vacuna_id,fecha_aplicacion) VALUES (?,?,?,?,?,'2025-03-31')",[data.pacienteId,dosis[1],actor.usuarioId,cita.insertId,lote]);
 await assert.rejects(service.registrarAntecedente({...data,fechaAplicacion:'2025-02-01'},actor),/intervalo/);
 const r=await service.registrarAntecedente(data,actor);
 await assert.rejects(service.editarRegistro(r.id,{...data,fechaAplicacion:'2025-02-01'},actor),/intervalo/);
 await service.editarRegistro(r.id,{...data,documentoReferencia:'Carnet corregido, página 3'},actor);
 const final=await model.findById(r.id);assert.equal(final.origen,'externo');assert.equal(final.documento_referencia,'Carnet corregido, página 3');assert.equal(final.fecha_aplicacion,'2025-01-31');assert.equal(final.lote_vacuna_id,null);assert.equal(await stock(c,lote),5);
}));

test('restricción SQL impide antecedentes sin documento y documento externo en una aplicación local',()=>isolated(async({c,data,actor})=>{
 for(const [origen,documento] of [['externo',null],['externo','   '],['local','Documento externo']]){
  await assert.rejects(c.query('INSERT INTO historial_vacunacion(paciente_id,dosis_id,usuario_id,fecha_aplicacion,origen,documento_referencia) VALUES (?,?,?,?,?,?)',[data.pacienteId,data.dosisId,actor.usuarioId,data.fechaAplicacion,origen,documento]),e=>e.code==='ER_CHECK_CONSTRAINT_VIOLATED');
 }
}));
