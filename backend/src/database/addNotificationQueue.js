const fs=require('node:fs');
const path=require('node:path');
const {pool}=require('../config/db');
(async()=>{
 try {
  const sql=fs.readFileSync(path.join(__dirname,'notificationQueue.sql'),'utf8');
  for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await pool.query(statement);
  console.log('Cola de correos e intentos disponibles. No se enviaron correos.');
 }finally{await pool.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
