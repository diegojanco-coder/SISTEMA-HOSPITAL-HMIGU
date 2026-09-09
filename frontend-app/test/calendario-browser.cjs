const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const os=require('node:os'),path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}});page.setDefaultTimeout(15000);const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('hmgu_token','test');localStorage.setItem('hmgu_usuario',JSON.stringify({id:1,nombre:'Administrador Prueba',rol:'administrador'}));});
 const vacuna={id:1,nombre:'Vacuna de prueba',nombre_corto:'TEST',dosis:[{id:1,vacuna_id:1,numero_dosis:1,nombre_dosis:'Primera',edad_recomendada_dias:0,tolerancia_dias:30,intervalo_minimo_dias:0}]};
 await page.route('**/api/v1/**',async route=>{const url=new URL(route.request().url());let data=[];
 if(route.request().method()==='PUT'){
  const p=route.request().postDataJSON();requests.push(p);
  if(requests.length===1)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({success:false,message:'La regla fue modificada. Recargue antes de guardar.'})});
  vacuna.dosis[0].regla_calendario={...p.regla,version:1};data=vacuna.dosis[0];
 }else if(url.pathname.endsWith('/vacunas'))data=[vacuna];
 else if(url.pathname.endsWith('/pacientes'))data={rows:[],total:0};
 else if(url.pathname.includes('/reportes/'))data={filas:[]};
 else if(url.pathname.endsWith('/correos/resumen'))data={habilitado:false,configurado:false,estados:[]};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});});
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:5173/');await page.getByRole('button',{name:'Configuración',exact:true}).click();
 await page.getByLabel('Dosis a configurar').selectOption('1');await page.getByLabel('Tipo',{exact:true}).selectOption('campana');
 await page.getByLabel('Fuente oficial').fill('https://example.invalid/norma');await page.getByLabel('Inicio',{exact:true}).fill('2026-01-01');await page.getByLabel('Fin (incluido)').fill('2026-12-31');await page.getByLabel('Territorio',{exact:true}).selectOption('Cochabamba');
 await page.getByLabel('Programar desde').selectOption('contacto');await page.getByLabel(/Habilitar esta regla/).check();
 await page.getByRole('button',{name:'Guardar regla',exact:true}).click();await page.getByRole('alert').getByText(/fue modificada/).waitFor();
 assert.equal(await page.getByLabel('Territorio',{exact:true}).inputValue(),'Cochabamba');await page.getByRole('button',{name:'Guardar regla',exact:true}).click();await page.getByRole('status').getByText(/guardada y auditada/).waitFor();
 assert.equal(requests.length,2);assert.equal(requests[1].regla.programacion.base,'contacto');assert.equal(requests[1].regla.territorio,'Cochabamba');
 await page.getByLabel('Dosis a configurar').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(os.tmpdir(),'calendario-admin.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.waitForFunction(()=>document.querySelector('aside').getBoundingClientRect().right<=1);await page.screenshot({path:path.join(os.tmpdir(),'calendario-admin-movil.png'),fullPage:true,animations:'disabled'});
 assert.deepEqual(errors,[]);console.log('OK calendario: edición, conflicto conservando datos, campaña, contacto y vista móvil');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
