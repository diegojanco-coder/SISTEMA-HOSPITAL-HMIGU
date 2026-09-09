process.env.NODE_ENV='test';
const {test,after}=require('node:test');const assert=require('node:assert/strict');const {randomBytes}=require('node:crypto');
const {pool}=require('../src/config/db');const {hashPassword}=require('../src/utils/password.util');const app=require('../src/app');
const getConnection=pool.getConnection.bind(pool),query=pool.query.bind(pool);after(()=>pool.end());
test('flujo HTTP: login, permisos, paciente, catálogo, regla, lote, aplicación, historial y exportaciones',async()=>{
 const c=await getConnection();let server;
 try{
 await c.beginTransaction();const tag=randomBytes(5).toString('hex');const password='Prueba123!';const hash=await hashPassword(password);
 for(const rol of ['administrador','enfermero'])await c.query('INSERT INTO usuarios(nombre_completo,email,username,password_hash,rol) VALUES (?,?,?,?,?)',['Prueba',`${rol}${tag}@example.invalid`,rol+tag,hash,rol]);
 pool.query=c.query.bind(c);pool.getConnection=async()=>({query:c.query.bind(c),beginTransaction:()=>c.query('SAVEPOINT http_op'),commit:async()=>{},rollback:()=>c.query('ROLLBACK TO SAVEPOINT http_op'),release:()=>{}});
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api/v1`;
 async function req(path,token,method='GET',body){return fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});}
 async function json(path,token,method='GET',body,status=200){const r=await req(path,token,method,body);const j=await r.json();assert.equal(r.status,status,`${method} ${path}: ${j.message}`);return j.data;}
 assert.equal((await req('/pacientes')).status,401);
 const a=await json('/auth/login',null,'POST',{login:'administrador'+tag,password});const n=await json('/auth/login',null,'POST',{login:'enfermero'+tag,password});const admin=a.token,nurse=n.token;
 await json('/auth/me',nurse);assert.equal((await req('/usuarios',nurse)).status,403);assert.equal((await req('/vacunas/dosis/1/calendario',nurse,'PUT',{})).status,403);
 // Regression: ordinary passwords containing digits must be accepted.
 const u=await json('/usuarios',admin,'POST',{nombreCompleto:'Usuario Temporal',email:`nuevo${tag}@example.invalid`,username:'nuevo'+tag,password,rol:'enfermero'},201);assert.ok(u.id);
 const p=await json('/pacientes',nurse,'POST',{nombres:'Persona',apellidos:'Temporal',fechaNacimiento:'1990-01-01',sexo:'F',departamento:'Cochabamba'},201);
 assert.equal((await json('/pacientes/'+p.id,nurse)).departamento,'Cochabamba');
 const v=await json('/vacunas',admin,'POST',{nombre:'Prueba '+tag,nombreCorto:tag},201);
 const d=await json(`/vacunas/${v.id}/dosis`,admin,'POST',{numeroDosis:1,nombreDosis:'Al contacto',edadRecomendadaDias:0,toleranciaDias:30},201);
 await json(`/vacunas/dosis/${d.id}/calendario`,admin,'PUT',{version:0,edadValor:0,edadUnidad:'dias',toleranciaDias:30,regla:{tipo:'regular',minMeses:216,fuente:'https://example.invalid/norma',habilitada:true,programacion:{base:'contacto'}}});
 const esquema=await json(`/pacientes/${p.id}/esquema`,nurse);assert.equal(esquema.detalle.find(x=>x.dosisId===d.id).registrable,true);
 const {fechaCivil,isoCivil}=require('../src/utils/calendario.util');const hoy=isoCivil(fechaCivil(new Date()));
 const l=await json('/lotes',admin,'POST',{vacunaId:v.id,numeroLote:'TEST'+tag,fechaVencimiento:hoy,cantidadDisponible:2},201);
 await json('/citas',nurse,'POST',{pacienteId:p.id,dosisAplicadas:[{dosisId:d.id,loteVacunaId:l.id,fechaAplicacion:hoy}]},201);
 const h=await json('/historial/paciente/'+p.id,nurse);assert.equal(h.length,1);
 await json('/historial/'+h[0].id,admin,'PUT',{fechaAplicacion:hoy,establecimiento:'Hospital',observaciones:'Corrección verificada'});
 const [[stock]]=await c.query('SELECT cantidad_disponible FROM lotes_vacuna WHERE id=?',[l.id]);assert.equal(stock.cantidad_disponible,1);
 for(const tipo of ['pacientes-registrados','vacunas-aplicadas','vacunas-pendientes','cobertura-vacunacion','pacientes-por-edad','vacunas-por-fecha'])await json(`/reportes/${tipo}?desde=${hoy}&hasta=${hoy}&fecha=${hoy}`,admin);
 for(const [url,magic] of [[`/pacientes/${p.id}/carnet`,'%PDF'],['/reportes/pacientes-registrados?formato=pdf','%PDF'],['/reportes/pacientes-registrados?formato=excel','PK']]){const r=await req(url,admin);assert.equal(r.status,200);assert.equal(Buffer.from(await r.arrayBuffer()).subarray(0,magic.length).toString(),magic);}
 for(const url of ['/alertas','/alertas/resumen','/alertas/correos/resumen','/auditoria','/backup'])await json(url,admin);
 await c.query("UPDATE usuarios SET estado='inactivo' WHERE id=?",[n.usuario.id]);assert.equal((await req('/pacientes',nurse)).status,401);
 }finally{
 if(server)await new Promise(r=>server.close(r));pool.query=query;pool.getConnection=getConnection;await c.rollback();c.release();
 }
});
