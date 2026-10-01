const {test}=require('node:test');const assert=require('node:assert/strict');const mysql=require('mysql2/promise');const {randomBytes}=require('node:crypto');const {spawnSync}=require('node:child_process');const path=require('node:path');const {db}=require('../src/config/env');
test('instalación nueva y actualización repetible en base temporal aislada',async()=>{
 const nombre='hmgu_test_install_'+randomBytes(6).toString('hex');assert.match(nombre,/^hmgu_test_install_[a-f0-9]{12}$/);
 const c=await mysql.createConnection({...db,database:undefined});let creada=false;
 try{
 const [[motor]]=await c.query('SELECT VERSION() version');
 const [[existe]]=await c.query('SELECT COUNT(*) n FROM information_schema.schemata WHERE schema_name=?',[nombre]);assert.equal(existe.n,0);
 const cwd=path.resolve(__dirname,'..');
 function run(script,args=[]){return spawnSync(process.execPath,[script,...args],{cwd,env:{...process.env,DB_NAME:nombre},encoding:'utf8',windowsHide:true,timeout:30000});}
 creada=true;const init=run('src/database/runMigrations.js',['--seed']);assert.equal(init.status,0,init.stderr);
 const [[u]]=await c.query(`SELECT COUNT(*) n FROM ${nombre}.usuarios`);assert.equal(u.n,2);
 await c.query(`ALTER TABLE ${nombre}.pacientes DROP COLUMN identidad_provisional,DROP COLUMN registro_pendiente,DROP COLUMN contacto_alertas`);
 await c.query(`ALTER TABLE ${nombre}.tutores MODIFY carnet_identidad VARCHAR(20) NOT NULL,MODIFY email VARCHAR(150) NOT NULL`);
 // Simula una instalación anterior con una aplicación real antes de actualizar.
 const eliminarCheck=/MariaDB/i.test(motor.version)?'DROP CONSTRAINT ck_historial_documento':'DROP CHECK ck_historial_documento';
 await c.query(`ALTER TABLE ${nombre}.historial_vacunacion ${eliminarCheck}, DROP COLUMN origen, DROP COLUMN documento_referencia, MODIFY cita_id INT UNSIGNED NOT NULL, MODIFY lote_vacuna_id INT UNSIGNED NOT NULL`);
 const [[paciente]]=await c.query(`SELECT id FROM ${nombre}.pacientes LIMIT 1`);
 const [[usuario]]=await c.query(`SELECT id FROM ${nombre}.usuarios LIMIT 1`);
 const [[dosis]]=await c.query(`SELECT id,vacuna_id FROM ${nombre}.dosis LIMIT 1`);
 const [lote]=await c.query(`INSERT INTO ${nombre}.lotes_vacuna(vacuna_id,numero_lote,fecha_vencimiento,cantidad_disponible) VALUES (?,'MIGRACION','2027-12-31',7)`,[dosis.vacuna_id]);
 const [cita]=await c.query(`INSERT INTO ${nombre}.citas(paciente_id,usuario_id) VALUES (?,?)`,[paciente.id,usuario.id]);
 const [historial]=await c.query(`INSERT INTO ${nombre}.historial_vacunacion(paciente_id,dosis_id,usuario_id,cita_id,lote_vacuna_id,fecha_aplicacion) VALUES (?,?,?,?,?,'2025-01-01')`,[paciente.id,dosis.id,usuario.id,cita.insertId,lote.insertId]);
 for(let i=0;i<2;i++){const r=run('src/database/upgrade.js');assert.equal(r.status,0,r.stderr);}
 const [pacienteCampos]=await c.query(`SHOW COLUMNS FROM ${nombre}.pacientes`);
 for(const campo of ['identidad_provisional','registro_pendiente','contacto_alertas'])assert.ok(pacienteCampos.some(x=>x.Field===campo));
 const [tutorCampos]=await c.query(`SHOW COLUMNS FROM ${nombre}.tutores`);
 for(const campo of ['carnet_identidad','email'])assert.equal(tutorCampos.find(x=>x.Field===campo).Null,'YES');
 const [[registro]]=await c.query(`SELECT identidad_provisional,contacto_alertas,fecha_nacimiento FROM ${nombre}.pacientes WHERE id=?`,[paciente.id]);
 assert.equal(registro.identidad_provisional,0);
 await c.query(`UPDATE ${nombre}.pacientes SET registro_pendiente=1 WHERE id=?`,[paciente.id]);
 const repetida=run('src/database/addPatientRegistration.js');assert.equal(repetida.status,0,repetida.stderr);
 const [[pendiente]]=await c.query(`SELECT registro_pendiente FROM ${nombre}.pacientes WHERE id=?`,[paciente.id]);assert.equal(pendiente.registro_pendiente,1);
 const [[conservado]]=await c.query(`SELECT origen,documento_referencia,cita_id,lote_vacuna_id,fecha_aplicacion FROM ${nombre}.historial_vacunacion WHERE id=?`,[historial.insertId]);
 assert.equal(conservado.origen,'local');assert.equal(conservado.documento_referencia,null);assert.equal(conservado.cita_id,cita.insertId);assert.equal(conservado.lote_vacuna_id,lote.insertId);
 const [[stock]]=await c.query(`SELECT cantidad_disponible n FROM ${nombre}.lotes_vacuna WHERE id=?`,[lote.insertId]);assert.equal(stock.n,7);
 const [campos]=await c.query(`SHOW COLUMNS FROM ${nombre}.historial_vacunacion`);
 assert.equal(campos.find(x=>x.Field==='cita_id').Null,'YES');assert.equal(campos.find(x=>x.Field==='lote_vacuna_id').Null,'YES');
 await assert.rejects(c.query(`UPDATE ${nombre}.historial_vacunacion SET origen='externo',documento_referencia=NULL WHERE id=?`,[historial.insertId]),e=>e.code==='ER_CHECK_CONSTRAINT_VIOLATED'||e.code==='ER_CONSTRAINT_FAILED'||/CONSTRAINT.*ck_historial_documento/i.test(e.message));
 const [[dose]]=await c.query(`SELECT d.edad_recomendada_valor edad FROM ${nombre}.dosis d JOIN ${nombre}.vacunas v ON v.id=d.vacuna_id WHERE v.nombre_corto='SRP' AND d.numero_dosis=2`);assert.equal(dose.edad,18);
 const refused=run('src/database/runMigrations.js',['--seed']);assert.notEqual(refused.status,0);assert.match(refused.stderr,/ya existe/);
 }finally{if(creada)await c.query(`DROP DATABASE IF EXISTS ${nombre}`);await c.end();}
});
