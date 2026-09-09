const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errores=[];page.on('pageerror',e=>errores.push(e.message));let intentos=0,guardado=false;
 await page.addInitScript(()=>{localStorage.setItem('hmgu_token','test');localStorage.setItem('hmgu_usuario',JSON.stringify({id:1,nombre:'Prueba',rol:'administrador'}));});
 await page.route('**/api/v1/**',async route=>{const url=new URL(route.request().url());let data=[];
 if(url.pathname.endsWith('/lotes')&&route.request().method()==='POST'){
  intentos++;if(intentos===1)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({success:false,message:'Ya existe un registro con esos datos'})});
  const p=route.request().postDataJSON();assert.equal(p.cantidadDisponible,25);assert.equal(p.vacunaId,1);guardado=true;data={id:9};
 }else if(url.pathname.endsWith('/vacunas'))data=[{id:1,nombre:'Vacuna de prueba',nombre_corto:'TEST',estado:'activo',dosis:[]}];
 else if(url.pathname.includes('/lotes/vacuna/'))data=guardado?[{id:9,numero_lote:'LOTEPRUEBA',cantidad_disponible:25,fecha_vencimiento:'2099-01-01'}]:[];
 else if(url.pathname.endsWith('/pacientes'))data={rows:[],total:0};else if(url.pathname.includes('/reportes/'))data={filas:[]};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});});
 await page.goto('http://127.0.0.1:5173/');await page.getByRole('button',{name:'Configuración',exact:true}).click();
 await page.getByLabel('Vacuna del lote',{exact:true}).selectOption('1');await page.getByLabel('Número de lote').fill('LOTEPRUEBA');await page.getByLabel('Vencimiento del lote').fill('2099-01-01');await page.getByLabel('Unidades recibidas').fill('25');
 await page.getByRole('button',{name:'Registrar lote',exact:true}).click();await page.getByRole('alert').getByText(/Ya existe/).waitFor();assert.equal(await page.getByLabel('Número de lote').inputValue(),'LOTEPRUEBA');
 await page.getByRole('button',{name:'Registrar lote',exact:true}).click();await page.getByRole('status').getByText(/Lote registrado/).waitFor();await page.getByText(/Lote LOTEPRUEBA · 25 unidades/).waitFor();assert.equal(intentos,2);assert.deepEqual(errores,[]);console.log('OK lotes: rechazo conservando datos, registro y stock actualizado');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
