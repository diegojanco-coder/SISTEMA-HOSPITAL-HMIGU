const {spawnSync}=require('node:child_process');const path=require('node:path');const fs=require('node:fs');
const root=path.resolve(__dirname,'..');
const backend=path.join(root,'backend'),frontend=path.join(root,'frontend-app');
const tests=fs.readdirSync(path.join(backend,'test')).filter(f=>f.endsWith('.test.js')).map(f=>'test/'+f);
for(const [cwd,args] of [[backend,['--test','--test-concurrency=1',...tests]],[frontend,['--experimental-strip-types','--test','test/visita.test.ts','test/visita-render.test.mjs','test/edad-paciente.test.ts']]]){
 const r=spawnSync(process.execPath,args,{cwd,stdio:'inherit',windowsHide:true});if(r.error||r.status!==0)process.exit(r.status||1);
}
