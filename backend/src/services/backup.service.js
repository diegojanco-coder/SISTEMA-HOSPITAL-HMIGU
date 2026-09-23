const path=require('node:path');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const {pipeline}=require('node:stream/promises');
const {db,backup}=require('../config/env');
async function runBackup({database=db.database,dir=backup.dir}={}){
 if(!/^[A-Za-z0-9_]+$/.test(database))throw new Error('Nombre de base inválido para respaldo.');
 await fs.promises.mkdir(dir,{recursive:true});
 const nombre=`backup_${database}_${new Date().toISOString().replace(/[:.]/g,'-')}.sql`;
 const destino=path.join(dir,nombre), temporal=destino+'.partial';
 const args=[`--host=${db.host}`,`--port=${db.port}`,`--user=${db.user}`,'--routines','--events','--single-transaction','--no-tablespaces','--set-gtid-purged=OFF',database];
 const child=spawn(backup.mysqldumpPath,args,{windowsHide:true,env:{...process.env,MYSQL_PWD:db.password}});
 child.stderr.resume();
 const completion=new Promise((resolve,reject)=>{child.once('error',()=>reject(new Error('No se pudo ejecutar mysqldump. Revise MYSQLDUMP_PATH.')));child.once('close',code=>code===0?resolve():reject(new Error(`Falló el respaldo (código ${code}). Revise permisos y conexión MySQL.`)));});
 const output=pipeline(child.stdout,fs.createWriteStream(temporal,{flags:'wx'}));
 const results=await Promise.allSettled([completion,output]);
 const failed=results.find(r=>r.status==='rejected');
 if(failed){await fs.promises.unlink(temporal).catch(()=>{});throw failed.reason;}
 await fs.promises.rename(temporal,destino);
 return {archivo:nombre,ruta:destino,fecha:new Date().toISOString()};
}
function listarBackups(){
 if(!fs.existsSync(backup.dir))return [];
 return fs.readdirSync(backup.dir).filter(f=>f.endsWith('.sql')).map(f=>{const s=fs.statSync(path.join(backup.dir,f));return {archivo:f,tamanioBytes:s.size,fecha:s.mtime};}).sort((a,b)=>b.fecha-a.fecha);
}
module.exports={runBackup,listarBackups};
