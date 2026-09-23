const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const express=require('express');
const {montarFrontend}=require('../src/middlewares/frontend.middleware');
test('servidor integrado entrega interfaz y preserva errores API y archivos privados',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'hmgu-static-test-'));
 let server;
 try{
  await fs.mkdir(path.join(directory,'assets'));
  await fs.writeFile(path.join(directory,'index.html'),'<!doctype html><title>Interfaz ficticia</title>');
  await fs.writeFile(path.join(directory,'assets','app-test.js'),'export const prueba=true;');
  await fs.writeFile(path.join(directory,'.env'),'SECRETO_FICTICIO');
  const app=express();
  app.get('/api/v1/health',(_req,res)=>res.json({success:true}));
  montarFrontend(app,directory);
  app.use((_req,res)=>res.status(404).json({success:false}));
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+server.address().port;
  for(const route of ['/','/pacientes/12']){
   const response=await fetch(base+route,{headers:{Accept:'text/html'}});
   assert.equal(response.status,200);assert.match(await response.text(),/Interfaz ficticia/);
   assert.equal(response.headers.get('cache-control'),'no-store');
  }
  const asset=await fetch(base+'/assets/app-test.js');assert.equal(asset.status,200);assert.match(asset.headers.get('cache-control'),/immutable/);
  const health=await fetch(base+'/api/v1/health');assert.equal((await health.json()).success,true);
  for(const route of ['/api/v1/no-existe','/.env','/assets/no-existe.js','/api']){
   const response=await fetch(base+route,{headers:{Accept:'text/html'}});
   assert.equal(response.status,404,route);assert.equal((await response.json()).success,false);
  }
  assert.equal((await fetch(base+'/pacientes',{headers:{Accept:'application/json'}})).status,404);
 }finally{
  if(server)await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
  const target=await fs.realpath(directory),parent=await fs.realpath(os.tmpdir());
  assert.equal(path.dirname(target),parent);assert.match(path.basename(target),/^hmgu-static-test-/);
  await fs.rm(target,{recursive:true});
 }
});
