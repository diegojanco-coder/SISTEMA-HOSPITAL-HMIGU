const {pool}=require('../config/db');
async function main(){try{
 const [r]=await pool.query("SHOW COLUMNS FROM pacientes LIKE 'departamento'");
 if(!r.length)await pool.query('ALTER TABLE pacientes ADD COLUMN departamento VARCHAR(30) NULL');
 for(const t of ['pacientes','tutores'])await pool.query(`ALTER TABLE ${t} MODIFY nombres VARCHAR(100) NOT NULL, MODIFY apellidos VARCHAR(100) NOT NULL, MODIFY email VARCHAR(120) NULL`);
 console.log('Departamento y límites de pacientes/tutores actualizados sin borrar datos.');
}finally{await pool.end();}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
