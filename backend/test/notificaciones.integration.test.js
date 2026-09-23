const {test,after}=require('node:test');const assert=require('node:assert/strict');const {randomBytes}=require('node:crypto');
const {pool}=require('../src/config/db');const {smtp}=require('../src/config/env');
const service=require('../src/services/notificacion.service');const correo=require('../src/services/correo.service');
const query=pool.query.bind(pool),getConnection=pool.getConnection.bind(pool),send=correo.enviar,configured=correo.configurado,enabled=smtp.enabled;
after(()=>pool.end());
async function isolated(run){
 const c=await getConnection();
 try{
  await c.beginTransaction();const tag=randomBytes(6).toString('hex');
  const [p]=await c.query("INSERT INTO pacientes(codigo_paciente,nombres,apellidos,fecha_nacimiento,sexo,email) VALUES (?,'Prueba','Temporal','2000-01-01','F','test@example.invalid')",['MAIL-'+tag]);
  const [v]=await c.query('INSERT INTO vacunas(nombre,nombre_corto) VALUES (?,?)',['MAIL-'+tag,tag]);
  const [d]=await c.query("INSERT INTO dosis(vacuna_id,numero_dosis,nombre_dosis,edad_recomendada_dias) VALUES (?,1,'Prueba',0)",[v.insertId]);
  await c.query('UPDATE dosis SET regla_calendario=? WHERE id=?',[JSON.stringify({tipo:'regular',minMeses:0,fuente:'fixture'}),d.insertId]);
  await c.query("INSERT INTO alertas(paciente_id,dosis_id,estado_semaforo,fecha_limite,mensaje) VALUES (?,?,'amarillo','2026-09-01','Mensaje de prueba')",[p.insertId,d.insertId]);
  const data={pacienteId:p.insertId,dosisId:d.insertId,destinatario:'test@example.invalid',paciente:'Prueba Temporal',mensaje:'Mensaje de prueba',estado:'pendiente',fechaLimite:'2026-09-01'};
  let enviados=0;smtp.enabled=true;correo.configurado=()=>true;correo.enviar=async()=>{enviados++;};
  pool.query=c.query.bind(c);
  pool.getConnection=async()=>({query:(sql,args=[])=>{
   if(sql.startsWith('SELECT * FROM notificaciones_email WHERE')){sql=sql.replace(' ORDER BY id',' AND paciente_id=? ORDER BY id');args=[...args,p.insertId];}
   if(sql.startsWith("UPDATE notificaciones_email SET estado='pendiente' WHERE estado='enviando'")){sql+=' AND paciente_id=?';args=[...args,p.insertId];}
   return c.query(sql,args);
  },beginTransaction:()=>c.query('SAVEPOINT resultado_envio'),commit:async()=>{},rollback:()=>c.query('ROLLBACK TO SAVEPOINT resultado_envio'),release:()=>{}});
  await run(c,data,()=>enviados);
 }finally{pool.query=query;pool.getConnection=getConnection;correo.enviar=send;correo.configurado=configured;smtp.enabled=enabled;await c.rollback();c.release();}
}
test('cola deduplica la misma alerta para el mismo destinatario',()=>isolated(async(c,data)=>{
 await service.enviarAlertaVacuna(data);await service.enviarAlertaVacuna(data);
 const [[r]]=await c.query('SELECT COUNT(*) n FROM notificaciones_email WHERE paciente_id=?',[data.pacienteId]);assert.equal(r.n,1);
}));
test('envío desactivado no consume pendientes',()=>isolated(async(c,data,enviados)=>{
 await service.enviarAlertaVacuna(data);smtp.enabled=false;assert.equal((await service.procesarPendientes()).deshabilitado,true);assert.equal(enviados(),0);
}));
test('fallo conserva el correo y el reintento registra ambos resultados',()=>isolated(async(c,data)=>{
 await service.enviarAlertaVacuna(data);correo.enviar=async()=>{throw Object.assign(new Error('No debe guardarse este texto'),{code:'ETIMEDOUT'});};
 await service.procesarPendientes();
 const [[first]]=await c.query('SELECT * FROM notificaciones_email WHERE paciente_id=?',[data.pacienteId]);assert.equal(first.estado,'error');assert.equal(first.intentos,1);assert.equal(first.ultimo_error,'ETIMEDOUT');
 await c.query('UPDATE notificaciones_email SET proximo_intento=NOW() WHERE id=?',[first.id]);correo.enviar=async()=>{};await service.procesarPendientes();
 const [[last]]=await c.query('SELECT estado,intentos FROM notificaciones_email WHERE id=?',[first.id]);assert.equal(last.estado,'enviado');assert.equal(last.intentos,2);
 const [attempts]=await c.query('SELECT resultado FROM notificacion_intentos WHERE notificacion_id=? ORDER BY id',[first.id]);assert.deepEqual(attempts.map(a=>a.resultado),['error','enviado']);
}));
test('una alerta desactualizada se cancela sin enviar',()=>isolated(async(c,data,enviados)=>{
 await service.enviarAlertaVacuna(data);await c.query("UPDATE alertas SET mensaje='Otro estado' WHERE paciente_id=?",[data.pacienteId]);await service.procesarPendientes();
 const [[r]]=await c.query('SELECT estado FROM notificaciones_email WHERE paciente_id=?',[data.pacienteId]);assert.equal(r.estado,'cancelado');assert.equal(enviados(),0);
}));
test('sin destinatario se registra para seguimiento',()=>isolated(async(c,data,enviados)=>{
 await service.enviarAlertaVacuna({...data,destinatario:''});await service.procesarPendientes();
 const [[r]]=await c.query('SELECT estado FROM notificaciones_email WHERE paciente_id=?',[data.pacienteId]);assert.equal(r.estado,'sin_destinatario');assert.equal(enviados(),0);
}));

test('prerregistro y nombre provisional cancelan correos pendientes sin enviarlos',async()=>{
 for(const campo of ['registro_pendiente','identidad_provisional'])await isolated(async(c,data,enviados)=>{
  await service.enviarAlertaVacuna(data);
  await c.query('UPDATE pacientes SET '+campo+'=1 WHERE id=?',[data.pacienteId]);
  await service.procesarPendientes();assert.equal(enviados(),0);
  const [[r]]=await c.query('SELECT estado FROM notificaciones_email WHERE paciente_id=?',[data.pacienteId]);assert.equal(r.estado,'cancelado');
 });
});

test('solo envía al tutor principal elegido, nunca a otros tutores ni al correo antiguo del menor',()=>isolated(async(c,data,enviados)=>{
 await c.query("UPDATE pacientes SET fecha_nacimiento='2020-01-01',contacto_alertas='tutor' WHERE id=?",[data.pacienteId]);
 for(const [email,principal] of [['principal@example.invalid',1],['otro@example.invalid',0]]){
  const [t]=await c.query("INSERT INTO tutores(nombres,apellidos,parentesco,telefono,email) VALUES ('Tutor','Ensayo','otro','70000000',?)",[email]);
  await c.query('INSERT INTO paciente_tutor(paciente_id,tutor_id,es_principal) VALUES (?,?,?)',[data.pacienteId,t.insertId,principal]);
  await service.enviarAlertaVacuna({...data,destinatario:email});
 }
 await service.enviarAlertaVacuna(data);await service.procesarPendientes();assert.equal(enviados(),1);
 const [rows]=await c.query('SELECT destinatario,estado FROM notificaciones_email WHERE paciente_id=?',[data.pacienteId]);
 for(const row of rows)assert.equal(row.estado,row.destinatario==='principal@example.invalid'?'enviado':'cancelado');
}));
test('se detiene después de cinco intentos',()=>isolated(async(c,data,enviados)=>{
 await service.enviarAlertaVacuna(data);await c.query("UPDATE notificaciones_email SET intentos=5,estado='error' WHERE paciente_id=?",[data.pacienteId]);await service.procesarPendientes();assert.equal(enviados(),0);
}));
test('HTML escapa nombres y mensajes; admite dominios de cualquier región',()=>{
 const result=correo.contenido({paciente_nombre:'<script>Prueba</script>',mensaje:'A & B'});assert.ok(!result.html.includes('<script>'));assert.ok(result.html.includes('&amp;'));
 assert.equal(service.correoValido('persona@ejemplo.bo'),true);assert.equal(service.correoValido('persona@example.com'),true);assert.equal(service.correoValido('uno@example.com,dos@example.com'),false);
});

test('campaña vencida cancela correo aunque persista la alerta',()=>isolated(async(c,data,enviados)=>{
 await service.enviarAlertaVacuna(data);
 await c.query('UPDATE dosis SET regla_calendario=? WHERE id=?',[JSON.stringify({tipo:'campana',minMeses:0,territorio:'Bolivia',inicio:'2000-01-01',fin:'2000-02-01',fuente:'fixture'}),data.dosisId]);
 await service.procesarPendientes();
 const [[r]]=await c.query('SELECT estado FROM notificaciones_email WHERE paciente_id=?',[data.pacienteId]);assert.equal(r.estado,'cancelado');assert.equal(enviados(),0);
}));
test('seguimiento sin antecedente cancela correo aunque exista una alerta',()=>isolated(async(c,data,enviados)=>{
 await service.enviarAlertaVacuna(data);
 await c.query('UPDATE dosis SET regla_calendario=? WHERE id=?',[JSON.stringify({tipo:'regular',minMeses:0,fuente:'fixture',programacion:{base:'dosis_previa',dosisId:data.dosisId+100000,valor:1,unidad:'meses'}}),data.dosisId]);
 await service.procesarPendientes();
 const [[r]]=await c.query('SELECT estado FROM notificaciones_email WHERE paciente_id=?',[data.pacienteId]);assert.equal(r.estado,'cancelado');assert.equal(enviados(),0);
}));

test('notificación conserva sexo al comprobar vigencia y cancela grupos excluidos',async()=>{
 for(const sexo of ['F','M'])await isolated(async(c,data,enviados)=>{
  await c.query('UPDATE pacientes SET sexo=? WHERE id=?',[sexo,data.pacienteId]);
  await c.query('UPDATE dosis SET regla_calendario=?,tolerancia_dias=30 WHERE id=?',[JSON.stringify({tipo:'regular',minMeses:0,maxMesesExclusivo:1800,fuente:'fixture',edadesPorSexo:{F:{minMeses:0,maxMesesExclusivo:1800}},programacion:{base:'nacimiento'}}),data.dosisId]);
  await c.query("UPDATE alertas SET fecha_limite='2000-01-31' WHERE paciente_id=?",[data.pacienteId]);
  await service.enviarAlertaVacuna({...data,fechaLimite:'2000-01-31'});await service.procesarPendientes();
  const [[r]]=await c.query('SELECT estado FROM notificaciones_email WHERE paciente_id=?',[data.pacienteId]);
  assert.equal(r.estado,sexo==='F'?'enviado':'cancelado');assert.equal(enviados(),sexo==='F'?1:0);
 });
});
