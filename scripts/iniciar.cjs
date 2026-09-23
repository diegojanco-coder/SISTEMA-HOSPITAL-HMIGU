const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),backend=path.join(root,'backend');
const index=path.join(root,'frontend-app/dist/index.html');
if(!fs.existsSync(index)){console.error('Primero ejecute npm run build desde la carpeta principal.');process.exit(1);}
if(!fs.existsSync(path.join(backend,'node_modules/express'))){console.error('Faltan dependencias de la API. Ejecute npm install desde backend.');process.exit(1);}
// Un único proceso; no cambia .env, no activa SMTP ni ejecuta migraciones.
process.env.NODE_ENV=process.env.NODE_ENV||'production';
process.env.SERVE_FRONTEND='true';
process.chdir(backend);
require(path.join(backend,'src/server.js'));
