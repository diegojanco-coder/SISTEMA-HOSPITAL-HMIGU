const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../src/config/db');
const service = require('../src/services/paciente.service');
const { body } = require('express-validator');
const validar = require('../src/middlewares/validate.middleware');
const { calcularEdadExacta } = require('../src/utils/edad.util');
const original = pool.getConnection.bind(pool);
const base = { nombres:'Prueba', apellidos:'Temporal', fechaNacimiento:'1990-01-01', sexo:'F', telefonoContacto:'70000000', email:'paciente@example.invalid' };
const tutor = { nombres:'Tutor',apellidos:'Temporal',carnetIdentidad:'TEST-'+require('node:crypto').randomBytes(6).toString('hex'),parentesco:'otro',telefono:'70000000',email:'prueba@example.invalid' };
async function isolated(run) {
 const conn = await original();
 await conn.beginTransaction();
 let committed = false;
 pool.getConnection = async () => ({
   beginTransaction:async()=>{}, query:conn.query.bind(conn),
   commit:async()=>{committed=true;}, rollback:()=>conn.rollback(),release:()=>{}
 });
 try { await run(conn,()=>committed); }
 finally { await conn.rollback(); pool.getConnection=original; conn.release(); }
}
after(()=>pool.end());
test('adulto independiente puede registrarse sin tutor',()=>isolated(async(conn,committed)=>{
 const p=await service.crear(base);
 assert.equal(p.es_dependiente,0); assert.equal(committed(),true);
 const [links]=await conn.query('SELECT * FROM paciente_tutor WHERE paciente_id=?',[p.id]); assert.equal(links.length,0);
}));
test('menor sin tutor se rechaza',()=>isolated(async()=>{
 await assert.rejects(service.crear({...base,fechaNacimiento:'2020-01-01'}),/debe estar vinculado/);
}));
test('adulto dependiente sin tutor se rechaza',()=>isolated(async()=>{
 await assert.rejects(service.crear({...base,esDependiente:true}),/debe estar vinculado/);
}));
test('menor y tutor se guardan juntos y se puede editar conservando el vínculo',()=>isolated(async(conn)=>{
 const p=await service.crear({...base,fechaNacimiento:'2020-01-01',tutor});
 const [links]=await conn.query('SELECT * FROM paciente_tutor WHERE paciente_id=?',[p.id]); assert.equal(links.length,1);
 // Retain the same transaction for the second service call in this test.
 pool.getConnection=async()=>({beginTransaction:async()=>{},query:conn.query.bind(conn),commit:async()=>{},rollback:()=>conn.rollback(),release:()=>{}});
 const edited=await service.actualizar(p.id,{...base,fechaNacimiento:'2020-01-01',esDependiente:true});
 assert.equal(edited.es_dependiente,1);
}));
test('tutor inexistente se rechaza',()=>isolated(async()=>{
 await assert.rejects(service.crear({...base,tutorId:4294967295}),/Tutor no encontrado/);
}));
test('un fallo del paciente revierte también el tutor nuevo',()=>isolated(async(conn)=>{
 const [[before]]=await conn.query('SELECT COUNT(*) n FROM tutores');
 await assert.rejects(service.crear({...base,creadoPor:4294967295,tutor}));
 const [[after]]=await conn.query('SELECT COUNT(*) n FROM tutores'); assert.equal(after.n,before.n);
}));
test('fecha imposible se rechaza',()=>isolated(async()=>{
 await assert.rejects(service.crear({...base,fechaNacimiento:'2025-02-30'}));
}));
test('validación devuelve 422 sin exponer los valores introducidos',async()=>{
 const req={body:{email:'dato-invalido'}};
 await body('email').isEmail().withMessage('Correo inválido').run(req);
 let status,result;
 validar(req,{status(s){status=s;return this;},json(v){result=v;}},()=>assert.fail('No debe continuar'));
 assert.equal(status,422); assert.equal(result.errors[0].campo,'email'); assert.equal(JSON.stringify(result).includes('dato-invalido'),false);
});
test('mayoría de edad cambia el día del cumpleaños local',()=>{
 assert.equal(calcularEdadExacta('2008-09-07',new Date(2026,8,6,12)).anios,17);
 assert.equal(calcularEdadExacta('2008-09-07',new Date(2026,8,7,12)).anios,18);
});

test('adulto dependiente admite tutor existente sin duplicarlo',()=>isolated(async(conn)=>{
 const [result]=await conn.query('INSERT INTO tutores (nombres,apellidos,carnet_identidad,parentesco,telefono,email) VALUES (?,?,?,?,?,?)',[tutor.nombres,tutor.apellidos,tutor.carnetIdentidad,tutor.parentesco,tutor.telefono,tutor.email]);
 pool.getConnection=async()=>({beginTransaction:async()=>{},query:conn.query.bind(conn),commit:async()=>{},rollback:()=>conn.rollback(),release:()=>{}});
 const p=await service.crear({...base,esDependiente:true,tutorId:result.insertId});
 assert.equal(p.es_dependiente,1);
 const [links]=await conn.query('SELECT * FROM paciente_tutor WHERE paciente_id=?',[p.id]);
 assert.equal(links[0].tutor_id,result.insertId);
}));
