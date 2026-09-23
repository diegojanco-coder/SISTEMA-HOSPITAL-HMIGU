const path=require('node:path');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const root=path.resolve(__dirname,'..'), frontend=path.join(root,'frontend-app');
const vite=path.join(frontend,'node_modules/vite/bin/vite.js');
if(!fs.existsSync(vite)){console.error('Faltan dependencias de la interfaz. Ejecute npm install desde frontend-app.');process.exit(1);}
const r=spawnSync(process.execPath,[vite,'build','--configLoader','runner'],{cwd:frontend,env:{...process.env,VITE_API_URL:'/api/v1'},stdio:'inherit',windowsHide:true});
if(r.error){console.error('No se pudo ejecutar la compilación.');process.exit(1);}
if(r.status!==0)process.exit(r.status||1);
console.log('Interfaz preparada para el mismo servidor de la API. Ejecute npm start desde la carpeta principal.');
