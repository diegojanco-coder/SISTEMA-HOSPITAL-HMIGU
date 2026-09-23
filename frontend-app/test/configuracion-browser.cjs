const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));let dosisIntentos=0,passwordIntentos=0;
  const vacuna={id:1,nombre:'Vacuna de prueba',nombre_corto:'TEST',estado:'activo',dosis:[{id:1,vacuna_id:1,numero_dosis:1,nombre_dosis:'Primera',edad_recomendada_dias:0,tolerancia_dias:30,intervalo_minimo_dias:0}]};
  await page.addInitScript(()=>{localStorage.setItem('hmgu_token','test');localStorage.setItem('hmgu_usuario',JSON.stringify({id:7,nombre:'Prueba',rol:'administrador'}));});
  await page.route('**/api/v1/**',async route=>{
   const req=route.request(),url=new URL(req.url());let data=[];
   const respond=(status,message,data)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status<400,message,data})});
   if(req.method()==='PATCH'){
    passwordIntentos++;assert.equal(url.pathname,'/api/v1/usuarios/7/password');
    assert.deepEqual(Object.keys(req.postDataJSON()),['password']);
    return respond(passwordIntentos===1?503:200,passwordIntentos===1?'Intente nuevamente.':'Actualizada',null);
   }
   if(req.method()==='POST'&&url.pathname.endsWith('/vacunas/1/dosis')){
    dosisIntentos++;if(dosisIntentos===1)return respond(409,'Ya existe una dosis con ese número.',null);
    const p=req.postDataJSON();vacuna.dosis.push({id:2,vacuna_id:1,numero_dosis:p.numeroDosis,nombre_dosis:p.nombreDosis,edad_recomendada_dias:0,tolerancia_dias:30});return respond(201,'Creada',vacuna.dosis[1]);
   }
   if(url.pathname.endsWith('/usuarios'))data=[{id:7,nombre_completo:'Prueba',username:'prueba',email:'prueba@example.invalid',rol:'administrador',estado:'activo'}];
   else if(url.pathname.endsWith('/vacunas'))data=[vacuna];
   else if(url.pathname.endsWith('/pacientes'))data={rows:[],total:0};
   else if(url.pathname.includes('/reportes/'))data={filas:[]};
   else if(url.pathname.endsWith('/correos/resumen'))data={habilitado:false,estados:[]};
   return respond(200,'OK',data);
  });
  await page.goto(process.env.TEST_URL||'http://localhost:4000/');
  await page.getByRole('button',{name:'Configuración',exact:true}).click();
  await page.getByRole('button',{name:'+ Dosis',exact:true}).click();
  const form=page.locator('form');const field=t=>form.locator('label').filter({hasText:t}).locator('..').locator('input');
  await field('Nombre de la dosis').fill('Segunda');
  await form.getByRole('button',{name:'Guardar',exact:true}).click();await form.getByRole('alert').waitFor();
  assert.equal(await field('Nombre de la dosis').inputValue(),'Segunda');
  await form.getByRole('button',{name:'Guardar',exact:true}).click();await page.getByText('2 dosis configuradas',{exact:true}).waitFor();
  assert.equal(dosisIntentos,2);
  await page.getByRole('button',{name:'Cambiar contraseña',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Cambiar contraseña',exact:true});
  const nueva=dialog.getByLabel('Nueva contraseña',{exact:true}),confirma=dialog.getByLabel('Confirmar nueva contraseña',{exact:true}),save=dialog.getByRole('button',{name:'Guardar contraseña',exact:true});
  await nueva.fill('abcdefgh');await confirma.fill('abcdefgh');await save.click();await dialog.getByRole('alert').getByText(/mayúscula/).waitFor();assert.equal(passwordIntentos,0);
  await nueva.fill('Temporal123!');await confirma.fill('Diferente123!');await save.click();await dialog.getByRole('alert').getByText(/no coinciden/).waitFor();assert.equal(passwordIntentos,0);
  await confirma.fill('Temporal123!');await save.click();await dialog.getByRole('alert').getByText(/nuevamente/).waitFor();assert.ok(await nueva.inputValue()==='Temporal123!');
  await save.click();await dialog.waitFor({state:'hidden'});await page.getByRole('status').getByText('Contraseña actualizada correctamente.',{exact:true}).waitFor();assert.equal(passwordIntentos,2);
  await page.getByRole('button',{name:'Cambiar contraseña',exact:true}).click();assert.equal(await nueva.inputValue(),'');
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.classList.add('dark'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
  assert.deepEqual(errors,[]);console.log('OK configuración: error de dosis, validación, reintento y cambio de contraseña, móvil.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
