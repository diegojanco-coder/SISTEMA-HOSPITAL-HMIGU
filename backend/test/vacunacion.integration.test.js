const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {pool}=require('../src/config/db');
const alerts=require('../src/services/alerta.service');
const {registrarCita}=require('../src/services/cita.service');
const getConnection=pool.getConnection.bind(pool);
const originalAlerts=alerts.generarAlertasPaciente;
after(()=>pool.end());
async function isolated(run){
 const c=await getConnection();
 try{
  await c.beginTransaction();
  const tag=randomUUID().slice(0,8);
  const [[user]]=await c.query("SELECT id FROM usuarios WHERE estado='activo' LIMIT 1");
  assert.ok(user,'Se necesita un usuario activo para la prueba');
  const [p]=await c.query("INSERT INTO pacientes(codigo_paciente,nombres,apellidos,fecha_nacimiento,sexo) VALUES (?,'Prueba','Temporal','1990-01-01','F')",['TEST-'+tag]);
  const [v]=await c.query("INSERT INTO vacunas(nombre,nombre_corto) VALUES (?,?)",['Prueba '+tag,tag]);
  const dosis=[];
  for(let n=1;n<=2;n++){
   const [d]=await c.query("INSERT INTO dosis(vacuna_id,numero_dosis,nombre_dosis,edad_recomendada_dias) VALUES (?,?,?,0)",[v.insertId,n,'Prueba '+n]);dosis.push(d.insertId);
  }
  const [lot]=await c.query("INSERT INTO lotes_vacuna(vacuna_id,numero_lote,fecha_vencimiento,cantidad_disponible) VALUES (?,?,CURDATE(),2)",[v.insertId,tag]);
  const state={commits:0,rollbacks:0,released:false};
  pool.getConnection=async()=>({query:c.query.bind(c),beginTransaction:()=>c.query('SAVEPOINT aplicacion'),commit:async()=>{state.commits++;},rollback:async()=>{state.rollbacks++;await c.query('ROLLBACK TO SAVEPOINT aplicacion');},release:()=>{state.released=true;}});
  alerts.generarAlertasPaciente=async()=>{};
  const data={pacienteId:p.insertId,usuarioId:user.id,dosisAplicadas:dosis.map(dosisId=>({dosisId,loteVacunaId:lot.insertId}))};
  await run(c,data,lot.insertId,state);
 }finally{pool.getConnection=getConnection;alerts.generarAlertasPaciente=originalAlerts;await c.rollback();c.release();}
}
test('visita con dos dosis descuenta dos unidades; vencimiento de hoy es válido',()=>isolated(async(c,data,lote,state)=>{
 const result=await registrarCita(data);assert.equal(result.dosisAplicadas.length,2);assert.equal(state.commits,1);
 const [[row]]=await c.query('SELECT cantidad_disponible FROM lotes_vacuna WHERE id=?',[lote]);assert.equal(row.cantidad_disponible,0);
}));
test('falta de stock en la segunda dosis revierte visita, historial y primer descuento',()=>isolated(async(c,data,lote,state)=>{
 await c.query('UPDATE lotes_vacuna SET cantidad_disponible=1 WHERE id=?',[lote]);
 await assert.rejects(registrarCita(data),/sin stock/);
 const [[stock]]=await c.query('SELECT cantidad_disponible FROM lotes_vacuna WHERE id=?',[lote]);assert.equal(stock.cantidad_disponible,1);
 const [[hist]]=await c.query('SELECT COUNT(*) n FROM historial_vacunacion WHERE paciente_id=?',[data.pacienteId]);assert.equal(hist.n,0);
 const [[visits]]=await c.query('SELECT COUNT(*) n FROM citas WHERE paciente_id=?',[data.pacienteId]);assert.equal(visits.n,0);assert.equal(state.commits,0);
}));
test('dosis repetida dentro de la misma visita revierte todo',()=>isolated(async(c,data,lote)=>{
 data.dosisAplicadas[1]=data.dosisAplicadas[0];await assert.rejects(registrarCita(data),/previamente/);
 const [[stock]]=await c.query('SELECT cantidad_disponible FROM lotes_vacuna WHERE id=?',[lote]);assert.equal(stock.cantidad_disponible,2);
}));
test('lote vencido ayer se rechaza',()=>isolated(async(c,data,lote)=>{
 await c.query('UPDATE lotes_vacuna SET fecha_vencimiento=CURDATE()-INTERVAL 1 DAY WHERE id=?',[lote]);await assert.rejects(registrarCita(data),/vencido/);
}));
test('fecha futura o con formato parcial se rechaza antes de guardar',()=>isolated(async(c,data)=>{
 data.dosisAplicadas[0].fechaAplicacion='2099-01-01';await assert.rejects(registrarCita(data),/futura/);
 data.dosisAplicadas[0].fechaAplicacion='2026-01-01basura';await assert.rejects(registrarCita(data),/no es válida/);
}));
test('fallo de alertas después del guardado devuelve éxito con advertencia y no revierte',()=>isolated(async(c,data,lote,state)=>{
 alerts.generarAlertasPaciente=async()=>{assert.equal(state.released,true);throw new Error('Fallo simulado');};
 const result=await registrarCita(data);assert.equal(result.advertencias.length,1);assert.equal(state.commits,1);assert.equal(state.rollbacks,0);
 const [[hist]]=await c.query('SELECT COUNT(*) n FROM historial_vacunacion WHERE paciente_id=?',[data.pacienteId]);assert.equal(hist.n,2);
}));
test('visita futura no se agenda mediante el registro de aplicaciones',()=>isolated(async(c,data)=>{
 await assert.rejects(registrarCita({...data,fechaHora:'2099-01-01T10:00:00'}),/futura/);
}));
test('fecha anterior al nacimiento no crea visita ni consume stock',()=>isolated(async(c,data,lote)=>{
 data.dosisAplicadas[0].fechaAplicacion='1989-12-31';await assert.rejects(registrarCita(data),/nacimiento/);
 const [[s]]=await c.query('SELECT cantidad_disponible FROM lotes_vacuna WHERE id=?',[lote]);assert.equal(s.cantidad_disponible,2);
}));
test('seguimiento respeta el mes exacto entre aplicaciones y revierte si no se cumple',()=>isolated(async(c,data,lote)=>{
 const [a,b]=data.dosisAplicadas;
 await c.query('UPDATE dosis SET regla_calendario=? WHERE id=?',[JSON.stringify({tipo:'regular',minMeses:216,fuente:'fixture',programacion:{base:'dosis_previa',dosisId:a.dosisId,valor:1,unidad:'meses'}}),b.dosisId]);
 a.fechaAplicacion='2026-01-31';b.fechaAplicacion='2026-02-27';await assert.rejects(registrarCita(data),/intervalo/);
 const [[s]]=await c.query('SELECT cantidad_disponible FROM lotes_vacuna WHERE id=?',[lote]);assert.equal(s.cantidad_disponible,2);
 b.fechaAplicacion='2026-02-28';assert.equal((await registrarCita(data)).dosisAplicadas.length,2);
}));
test('campaña no admite aplicaciones fuera del territorio confirmado',()=>isolated(async(c,data)=>{
 await c.query("UPDATE pacientes SET departamento='La Paz' WHERE id=?",[data.pacienteId]);
 await c.query('UPDATE dosis SET regla_calendario=? WHERE id=?',[JSON.stringify({tipo:'campana',minMeses:216,inicio:'2026-01-01',fin:'2026-12-31',territorio:'Cochabamba',fuente:'fixture',programacion:{base:'contacto'}}),data.dosisAplicadas[0].dosisId]);
 data.dosisAplicadas[0].fechaAplicacion='2026-02-01';await assert.rejects(registrarCita(data),/alcance/);
}));
test('intervalo mínimo exige antecedente registrado',()=>isolated(async(c,data)=>{
 await c.query('UPDATE dosis SET intervalo_minimo_dias=30 WHERE id=?',[data.dosisAplicadas[1].dosisId]);
 data.dosisAplicadas=[data.dosisAplicadas[1]];await assert.rejects(registrarCita(data),/dosis anterior/);
}));
