const {test,after}=require('node:test'),assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto'),bcrypt=require('bcryptjs');
const {pool}=require('../src/config/db'),service=require('../src/services/usuario.service'),audit=require('../src/models/auditoria.model');
const connect=pool.getConnection.bind(pool);after(()=>pool.end());
async function isolated(run){
 const c=await connect(),original=audit.create;
 try{
  await c.beginTransaction();const tag=randomBytes(5).toString('hex'),hash=await bcrypt.hash('Anterior123!',4);
  const [u]=await c.query("INSERT INTO usuarios(nombre_completo,email,username,password_hash,rol) VALUES ('Ensayo',?,?,?,'administrador')",[tag+'@example.invalid',tag,hash]);
  pool.getConnection=async()=>({query:c.query.bind(c),beginTransaction:()=>c.query('SAVEPOINT password_test'),commit:async()=>{},rollback:()=>c.query('ROLLBACK TO SAVEPOINT password_test'),release:()=>{}});
  await run(c,u.insertId,hash);
 }finally{audit.create=original;pool.getConnection=connect;await c.rollback();c.release();}
}
test('contraseña se actualiza con auditoría sin guardar clave ni hash en bitácora',()=>isolated(async(c,id,anterior)=>{
 await service.cambiarPassword(id,'Actualizada456!',{usuarioId:id});
 const [[u]]=await c.query('SELECT password_hash FROM usuarios WHERE id=?',[id]);
 assert.notEqual(u.password_hash,anterior);assert.equal(await bcrypt.compare('Actualizada456!',u.password_hash),true);
 const [[a]]=await c.query("SELECT datos_nuevos FROM auditoria WHERE entidad='usuarios' AND entidad_id=?",[id]);
 assert.deepEqual(typeof a.datos_nuevos==='string'?JSON.parse(a.datos_nuevos):a.datos_nuevos,{passwordActualizado:true});
}));
test('fallo de auditoría conserva la contraseña anterior y usuario ausente devuelve404',()=>isolated(async(c,id,anterior)=>{
 audit.create=async()=>{throw new Error('fallo de auditoría');};
 await assert.rejects(service.cambiarPassword(id,'Actualizada456!',{usuarioId:id}),/auditoría/);
 const [[u]]=await c.query('SELECT password_hash FROM usuarios WHERE id=?',[id]);assert.equal(u.password_hash,anterior);
 await assert.rejects(service.cambiarPassword(2147483647,'Actualizada456!'),e=>e.status===404);
}));
