const {test,after}=require('node:test');const assert=require('node:assert/strict');const {randomBytes}=require('node:crypto');const {pool}=require('../src/config/db');const {cargar,catalogo}=require('../src/database/loadVerifiedCatalog');after(()=>pool.end());
test('catálogo base crea diez dosis, es repetible y conserva ajustes existentes',async()=>{
 const db=await pool.getConnection();const originales=catalogo.map(v=>({...v}));
 try{await db.beginTransaction();const tag=randomBytes(4).toString('hex');catalogo.forEach((v,i)=>{v.nombre='Prueba catalogo '+tag+i;v.codigo='T'+tag+i;});
 assert.deepEqual(await cargar(db),{vacunas:3,dosis:10});
 const [[d]]=await db.query('SELECT d.id FROM dosis d JOIN vacunas v ON v.id=d.vacuna_id WHERE v.nombre_corto=? ORDER BY d.id LIMIT 1',[catalogo[0].codigo]);
 await db.query('UPDATE dosis SET tolerancia_dias=17 WHERE id=?',[d.id]);
 assert.deepEqual(await cargar(db),{vacunas:0,dosis:0});const [[actual]]=await db.query('SELECT tolerancia_dias FROM dosis WHERE id=?',[d.id]);assert.equal(actual.tolerancia_dias,17);
 }finally{originales.forEach((v,i)=>Object.assign(catalogo[i],v));await db.rollback();db.release();}
});
