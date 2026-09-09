const {test}=require('node:test');const assert=require('node:assert/strict');const mysql=require('mysql2/promise');const {randomBytes}=require('node:crypto');const {spawnSync}=require('node:child_process');const path=require('node:path');const {db}=require('../src/config/env');
test('instalación nueva y actualización repetible en base temporal aislada',async()=>{
 const nombre='hmgu_test_install_'+randomBytes(6).toString('hex');assert.match(nombre,/^hmgu_test_install_[a-f0-9]{12}$/);
 const c=await mysql.createConnection({...db,database:undefined});let creada=false;
 try{
 const [[existe]]=await c.query('SELECT COUNT(*) n FROM information_schema.schemata WHERE schema_name=?',[nombre]);assert.equal(existe.n,0);
 const cwd=path.resolve(__dirname,'..');
 function run(script,args=[]){return spawnSync(process.execPath,[script,...args],{cwd,env:{...process.env,DB_NAME:nombre},encoding:'utf8',windowsHide:true,timeout:30000});}
 creada=true;const init=run('src/database/runMigrations.js',['--seed']);assert.equal(init.status,0,init.stderr);
 const [[u]]=await c.query(`SELECT COUNT(*) n FROM ${nombre}.usuarios`);assert.equal(u.n,2);
 for(let i=0;i<2;i++){const r=run('src/database/upgrade.js');assert.equal(r.status,0,r.stderr);}
 const [[dose]]=await c.query(`SELECT d.edad_recomendada_valor edad FROM ${nombre}.dosis d JOIN ${nombre}.vacunas v ON v.id=d.vacuna_id WHERE v.nombre_corto='SRP' AND d.numero_dosis=2`);assert.equal(dose.edad,18);
 const refused=run('src/database/runMigrations.js',['--seed']);assert.notEqual(refused.status,0);assert.match(refused.stderr,/ya existe/);
 }finally{if(creada)await c.query(`DROP DATABASE IF EXISTS ${nombre}`);await c.end();}
});
