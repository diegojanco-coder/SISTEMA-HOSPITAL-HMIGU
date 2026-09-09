const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {pool}=require('../src/config/db');
const tutorService=require('../src/services/tutor.service');
const historialService=require('../src/services/historial.service');
const alertaService=require('../src/services/alerta.service');
const getConnection=pool.getConnection.bind(pool);
const alerts=alertaService.generarAlertasPaciente;
after(()=>pool.end());
async function isolated(run){
 const c=await getConnection();
 try{
  await c.beginTransaction();
  const tag=randomBytes(6).toString('hex');
  const [p]=await c.query("INSERT INTO pacientes(codigo_paciente,nombres,apellidos,fecha_nacimiento,sexo) VALUES (?,'Prueba','Temporal','2020-01-01','F')",['TEST-'+tag]);
  const ids=[];
  for(let i=0;i<2;i++){
   const [t]=await c.query("INSERT INTO tutores(nombres,apellidos,carnet_identidad,parentesco,telefono,email) VALUES ('Tutor','Temporal',?,'otro','70000000','test@example.invalid')",['TEST-'+tag+i]);ids.push(t.insertId);
  }
  await c.query('INSERT INTO paciente_tutor(paciente_id,tutor_id,es_principal) VALUES (?,?,1)',[p.insertId,ids[0]]);
  pool.getConnection=async()=>({query:c.query.bind(c),beginTransaction:()=>c.query('SAVEPOINT operacion'),commit:async()=>{},rollback:()=>c.query('ROLLBACK TO SAVEPOINT operacion'),release:()=>{}});
  alertaService.generarAlertasPaciente=async()=>{};
  await run(c,p.insertId,ids);
 }finally{pool.getConnection=getConnection;alertaService.generarAlertasPaciente=alerts;await c.rollback();c.release();}
}
test('no desactiva al único tutor de un menor',()=>isolated(async(c,p,[t])=>{
 await assert.rejects(tutorService.desactivar(t),/único tutor activo/);
 const [[row]]=await c.query('SELECT estado FROM tutores WHERE id=?',[t]);assert.equal(row.estado,'activo');
}));
test('no desvincula al único tutor de un adulto dependiente',()=>isolated(async(c,p,[t])=>{
 await c.query("UPDATE pacientes SET fecha_nacimiento='1990-01-01',es_dependiente=1 WHERE id=?",[p]);
 await assert.rejects(tutorService.desvincularPaciente(t,p),/único tutor activo/);
}));
test('un tutor alternativo inactivo no permite retirar al responsable',()=>isolated(async(c,p,[t,otro])=>{
 await c.query('INSERT INTO paciente_tutor(paciente_id,tutor_id) VALUES (?,?)',[p,otro]);
 await c.query("UPDATE tutores SET estado='inactivo' WHERE id=?",[otro]);
 await assert.rejects(tutorService.desactivar(t),/único tutor activo/);
}));
test('desvinculación conserva la relación y reasigna principal',()=>isolated(async(c,p,[t,otro])=>{
 await tutorService.vincularPaciente(otro,p,false);
 await tutorService.desvincularPaciente(t,p);
 const [rows]=await c.query('SELECT tutor_id,estado,es_principal FROM paciente_tutor WHERE paciente_id=?',[p]);
 assert.equal(rows.find(r=>r.tutor_id===t).estado,'inactivo');assert.equal(rows.find(r=>r.tutor_id===otro).es_principal,1);
}));
test('adulto independiente admite retirar el último vínculo',()=>isolated(async(c,p,[t])=>{
 await c.query("UPDATE pacientes SET fecha_nacimiento='1990-01-01' WHERE id=?",[p]);
 await tutorService.desvincularPaciente(t,p);
 const [[row]]=await c.query('SELECT estado FROM paciente_tutor WHERE paciente_id=? AND tutor_id=?',[p,t]);assert.equal(row.estado,'inactivo');
}));
test('tutor inactivo no se vincula',()=>isolated(async(c,p,[t,otro])=>{
 await c.query("UPDATE tutores SET estado='inactivo' WHERE id=?",[otro]);
 await assert.rejects(tutorService.vincularPaciente(otro,p,true),/inactivo/);
}));
test('reactiva un vínculo sin duplicarlo y mantiene un solo principal',()=>isolated(async(c,p,[t,otro])=>{
 await tutorService.vincularPaciente(otro,p,true);await tutorService.desvincularPaciente(t,p);await tutorService.vincularPaciente(t,p,true);
 const [rows]=await c.query('SELECT estado,es_principal FROM paciente_tutor WHERE paciente_id=?',[p]);assert.equal(rows.length,2);assert.equal(rows.filter(r=>r.es_principal===1).length,1);assert.ok(rows.every(r=>r.estado==='activo'));
}));
test('crear tutor con paciente inexistente revierte el tutor',()=>isolated(async(c)=>{
 const [[before]]=await c.query('SELECT COUNT(*) n FROM tutores');
 await assert.rejects(tutorService.crear({nombres:'Tutor',apellidos:'Prueba',carnetIdentidad:'TEST-'+randomBytes(6).toString('hex'),parentesco:'otro',telefono:'70000000',email:'test@example.invalid',pacienteId:4294967295}),/Paciente no encontrado/);
 const [[after]]=await c.query('SELECT COUNT(*) n FROM tutores');assert.equal(after.n,before.n);
}));
async function historialFixture(c,p){
 await c.query("UPDATE pacientes SET fecha_nacimiento='2000-01-01' WHERE id=?",[p]);
 const tag=randomBytes(6).toString('hex');
 const [[user]]=await c.query("SELECT id FROM usuarios WHERE estado='activo' LIMIT 1");
 const [v]=await c.query('INSERT INTO vacunas(nombre,nombre_corto) VALUES (?,?)',['TEST-'+tag,tag]);
 const [d]=await c.query("INSERT INTO dosis(vacuna_id,numero_dosis,nombre_dosis,edad_recomendada_dias) VALUES (?,1,'Prueba',0)",[v.insertId]);
 const [l]=await c.query("INSERT INTO lotes_vacuna(vacuna_id,numero_lote,fecha_vencimiento,cantidad_disponible) VALUES (?,?,'2025-12-31',3)",[v.insertId,tag]);
 const [visit]=await c.query('INSERT INTO citas(paciente_id,usuario_id) VALUES (?,?)',[p,user.id]);
 const [h]=await c.query("INSERT INTO historial_vacunacion(paciente_id,dosis_id,usuario_id,cita_id,lote_vacuna_id,fecha_aplicacion) VALUES (?,?,?,?,?,'2025-01-01')",[p,d.insertId,user.id,visit.insertId,l.insertId]);
 return {id:h.insertId,lote:l.insertId,user:user.id,vacuna:v.insertId,visita:visit.insertId};
}
test('historial rechaza fecha futura, imposible o anterior al nacimiento',()=>isolated(async(c,p)=>{
 const h=await historialFixture(c,p);
 for(const fecha of ['2099-01-01','2025-02-30','1999-01-01'])await assert.rejects(historialService.editarRegistro(h.id,{fechaAplicacion:fecha},{usuarioId:h.user}));
}));
test('historial rechaza aplicación posterior al vencimiento del lote',()=>isolated(async(c,p)=>{
 const h=await historialFixture(c,p);await assert.rejects(historialService.editarRegistro(h.id,{fechaAplicacion:'2026-01-01'},{usuarioId:h.user}),/vencimiento/);
}));
test('corregir historial conserva el stock y audita valores anteriores y nuevos',()=>isolated(async(c,p)=>{
 const h=await historialFixture(c,p);await historialService.editarRegistro(h.id,{fechaAplicacion:'2025-02-01',observaciones:'Corrección de prueba'},{usuarioId:h.user});
 const [[stock]]=await c.query('SELECT cantidad_disponible FROM lotes_vacuna WHERE id=?',[h.lote]);assert.equal(stock.cantidad_disponible,3);
 const [[audit]]=await c.query("SELECT JSON_UNQUOTE(JSON_EXTRACT(datos_previos,'$.fecha_aplicacion')) anterior, JSON_UNQUOTE(JSON_EXTRACT(datos_nuevos,'$.fecha_aplicacion')) nueva FROM auditoria WHERE entidad='historial_vacunacion' AND entidad_id=? ORDER BY id DESC LIMIT 1",[h.id]);assert.equal(audit.anterior,'2025-01-01');assert.equal(audit.nueva,'2025-02-01');
}));
test('si falla la auditoría no queda guardada la corrección',()=>isolated(async(c,p)=>{
 const h=await historialFixture(c,p);await assert.rejects(historialService.editarRegistro(h.id,{fechaAplicacion:'2025-02-01'},{usuarioId:4294967295}));
 const [[row]]=await c.query('SELECT fecha_aplicacion FROM historial_vacunacion WHERE id=?',[h.id]);assert.equal(row.fecha_aplicacion,'2025-01-01');
}));
test('fallo posterior de alertas devuelve corrección guardada con advertencia',()=>isolated(async(c,p)=>{
 const h=await historialFixture(c,p);alertaService.generarAlertasPaciente=async()=>{throw new Error('Simulado');};
 const result=await historialService.editarRegistro(h.id,{fechaAplicacion:'2025-02-01'},{usuarioId:h.user});assert.equal(result.fecha_aplicacion,'2025-02-01');assert.equal(result.advertencias.length,1);
}));
