const { pool } = require('../config/db');

async function columnaExiste(tabla,columna){
 const [[r]]=await pool.query(`SELECT COUNT(*) total FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?`,[tabla,columna]);
 return Boolean(r.total);
}
async function indiceExiste(tabla,indice){
 const [[r]]=await pool.query(`SELECT COUNT(*) total FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name=? AND index_name=?`,[tabla,indice]);
 return Boolean(r.total);
}
(async()=>{try{
 if(!await columnaExiste('alertas','tipo_alerta'))await pool.query("ALTER TABLE alertas ADD COLUMN tipo_alerta ENUM('calendario','recomendacion_refuerzo','recomendacion_campana') NOT NULL DEFAULT 'calendario' AFTER estado_dosis");
 if(await indiceExiste('historial_vacunacion','uq_historial_paciente_dosis'))await pool.query('ALTER TABLE historial_vacunacion DROP INDEX uq_historial_paciente_dosis');
 if(!await indiceExiste('historial_vacunacion','idx_historial_paciente_dosis'))await pool.query('CREATE INDEX idx_historial_paciente_dosis ON historial_vacunacion(paciente_id,dosis_id)');
 console.log('Motor adulto: alertas tipificadas y refuerzos recurrentes disponibles.');
}finally{await pool.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
