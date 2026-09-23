const {test,after}=require('node:test'),assert=require('node:assert/strict');
const cron=require('node-cron'),config=require('../src/config/env');
const {iniciarJobs}=require('../src/jobs');
const {pool}=require('../src/config/db');after(()=>pool.end());
test('cron inválido no deja trabajos iniciados y error parcial detiene los anteriores',()=>{
 const original=cron.schedule,backupCron=config.backup.cron;let iniciados=0,detenidos=0;
 try{
  cron.schedule=()=>{iniciados++;return {stop(){detenidos++;}};};
  config.backup.cron='no es cron';assert.throws(iniciarJobs,/cron inválida/);assert.equal(iniciados,0);
  config.backup.cron=backupCron;
  cron.schedule=()=>{iniciados++;if(iniciados===2)throw new Error('Fallo al programar');return {stop(){detenidos++;}};};
  assert.throws(iniciarJobs,/Fallo al programar/);assert.equal(detenidos,1);
 }finally{cron.schedule=original;config.backup.cron=backupCron;}
});
test('los tres trabajos reciben la zona horaria configurada y pueden detenerse',()=>{
 const original=cron.schedule;const zonas=[];let detenidos=0;
 try{
  cron.schedule=(_expresion,_callback,options)=>{zonas.push(options.timezone);return {stop(){detenidos++;}};};
  const jobs=iniciarJobs();assert.deepEqual(zonas,[config.timezone,config.timezone,config.timezone]);
  jobs.forEach(job=>job.stop());assert.equal(detenidos,3);
 }finally{cron.schedule=original;}
});
