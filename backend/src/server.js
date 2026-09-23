const app = require('./app');
const { port, host, serveFrontend } = require('./config/env');
const { testConnection, pool } = require('./config/db');
const { iniciarJobs } = require('./jobs');

let server, jobs=[], closing=false;
async function detener(){
 if(closing)return;closing=true;
 for(const job of jobs)job.stop();
 const timeout=setTimeout(()=>process.exit(1),15000);timeout.unref();
 try{
  if(server)await new Promise(resolve=>{server.close(resolve);server.closeIdleConnections?.();});
  await pool.end();clearTimeout(timeout);
 }catch{process.exitCode=1;}
}
async function iniciar() {
 try {
  await testConnection();
  server=await new Promise((resolve,reject)=>{
   const listener=app.listen(port,host,()=>resolve(listener));listener.once('error',reject);
  });
  jobs=iniciarJobs();
  const url=`http://${host==='127.0.0.1'?'localhost':host}:${port}`;
  console.log('Sistema de Vacunación - Hospital Materno Germán Urquidi');
  console.log(serveFrontend?`Abra el sistema en ${url}`:`API escuchando en ${url}/api/v1`);
 }catch(error){
  console.error(error.code==='EADDRINUSE'?'El puerto ya está ocupado. Detenga la otra instancia del sistema antes de iniciar.':'[FATAL] No se pudo iniciar el servidor: '+(error.code||error.message));
  process.exitCode=1;await detener();
 }
}
process.once('SIGINT',detener);process.once('SIGTERM',detener);
iniciar();
