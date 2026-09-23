const express=require('express');
const path=require('node:path');
const fs=require('node:fs');
function montarFrontend(app,directory){
 const dir=path.resolve(directory),index=path.join(dir,'index.html');
 if(!fs.existsSync(index))throw new Error('Falta la interfaz compilada. Ejecute npm run build desde la carpeta principal.');
 const servir=express.static(dir,{dotfiles:'ignore',index:false,redirect:false,setHeaders(response,file){
  response.setHeader('Cache-Control',file.endsWith('.html')?'no-store':file.includes(path.sep+'assets'+path.sep)?'public, max-age=31536000, immutable':'no-cache');
 }});
 app.use((req,res,next)=>{
  if(/^\/api(?:\/|$)/i.test(req.path))return next();
  return servir(req,res,next);
 });
 app.get('*',(req,res,next)=>{
  if(/^\/api(?:\/|$)/i.test(req.path) || path.extname(req.path) || req.path.split('/').some(s=>s.startsWith('.')) || !req.accepts('html'))return next();
  res.setHeader('Cache-Control','no-store');res.sendFile(index);
 });
}
module.exports={montarFrontend};
