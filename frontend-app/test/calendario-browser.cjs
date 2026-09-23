const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const os=require('node:os'),path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}});page.setDefaultTimeout(15000);const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('hmgu_token','test');localStorage.setItem('hmgu_usuario',JSON.stringify({id:1,nombre:'Administrador Prueba',rol:'administrador'}));});
 const vacuna={id:1,nombre:'Vacuna de prueba',nombre_corto:'TEST',dosis:[{id:1,vacuna_id:1,numero_dosis:1,nombre_dosis:'Primera',edad_recomendada_dias:0,tolerancia_dias:30,intervalo_minimo_dias:0}]};
 vacuna.dosis.push({...vacuna.dosis[0],id:3,numero_dosis:3,nombre_dosis:'Tercera'});
 const otraVacuna={id:2,nombre:'Vacuna de referencia',nombre_corto:'REF',dosis:[
  {...vacuna.dosis[0],id:2,vacuna_id:2,numero_dosis:2,nombre_dosis:'Primera de referencia'},
  {...vacuna.dosis[0],id:4,vacuna_id:2,numero_dosis:4,nombre_dosis:'Segunda de referencia'},
  {...vacuna.dosis[0],id:5,vacuna_id:2,numero_dosis:5,nombre_dosis:'Tercera de referencia'}
 ]};
 await page.route('**/api/v1/**',async route=>{const url=new URL(route.request().url());let data=[];
 if(route.request().method()==='PUT'){
  const p=route.request().postDataJSON();requests.push(p);
  if(requests.length===1||requests.length===3)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({success:false,message:'La regla fue modificada. Recargue antes de guardar.'})});
  vacuna.dosis[0].regla_calendario={...p.regla,version:(vacuna.dosis[0].regla_calendario?.version??0)+1};data=vacuna.dosis[0];
 }else if(url.pathname.endsWith('/vacunas'))data=[vacuna,otraVacuna];
 else if(url.pathname.endsWith('/pacientes'))data={rows:[],total:0};
 else if(url.pathname.includes('/reportes/'))data={filas:[]};
 else if(url.pathname.endsWith('/correos/resumen'))data={habilitado:false,configurado:false,estados:[]};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});});
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:5173/');await page.getByRole('button',{name:'Configuración',exact:true}).click();
 // La numeración puede estar repartida entre formulaciones: no usar cantidad + 1.
 for(const [indice,numeroEsperado] of [[0,'4'],[1,'6']]){
  await page.getByRole('button',{name:'+ Dosis',exact:true}).nth(indice).click();
  const numero=page.locator('label').filter({hasText:'N° de dosis'}).locator('..').locator('input');
  assert.equal(await numero.inputValue(),numeroEsperado,'La siguiente dosis usa el máximo existente aunque haya números omitidos');
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
 }
 await page.getByLabel('Dosis a configurar').selectOption('1');await page.getByLabel('Tipo',{exact:true}).selectOption('campana');
 await page.getByLabel('Fuente oficial').fill('https://example.invalid/norma');await page.getByLabel('Inicio',{exact:true}).fill('2026-01-01');await page.getByLabel('Fin (incluido)').fill('2026-12-31');await page.getByLabel('Territorio',{exact:true}).selectOption('Cochabamba');
 await page.getByLabel('Programar desde').selectOption('contacto');await page.getByLabel(/Habilitar esta regla/).check();
 await page.getByLabel('Diferenciar edades por sexo registrado').check();
 await page.getByLabel('Edad mínima femenino (meses)',{exact:true}).fill('120');
 await page.getByLabel('Edad máxima femenino, sin incluir (meses)',{exact:true}).fill('180');
 await page.getByLabel('Edad mínima masculino (meses)',{exact:true}).fill('120');
 await page.getByLabel('Edad máxima masculino, sin incluir (meses)',{exact:true}).fill('132');
 await page.getByLabel('Incluir femenino',{exact:true}).uncheck();await page.getByLabel('Incluir masculino',{exact:true}).uncheck();
 assert.equal(await page.getByRole('button',{name:'Guardar regla',exact:true}).isDisabled(),true);
 await page.getByLabel('Incluir femenino',{exact:true}).check();await page.getByLabel('Incluir masculino',{exact:true}).check();
 assert.equal(await page.getByLabel('Edad máxima masculino, sin incluir (meses)',{exact:true}).inputValue(),'132');
 await page.getByLabel('Edad mínima femenino (meses)',{exact:true}).fill('120');await page.getByLabel('Edad máxima femenino, sin incluir (meses)',{exact:true}).fill('180');
 await page.getByLabel('Edad mínima masculino (meses)',{exact:true}).fill('120');await page.getByLabel('Edad máxima masculino, sin incluir (meses)',{exact:true}).fill('132');
 await page.getByRole('button',{name:'Guardar regla',exact:true}).click();await page.getByRole('alert').getByText(/fue modificada/).waitFor();
 assert.equal(await page.getByLabel('Territorio',{exact:true}).inputValue(),'Cochabamba');await page.getByRole('button',{name:'Guardar regla',exact:true}).click();await page.getByRole('status').getByText(/guardada y auditada/).waitFor();
 assert.equal(await page.getByLabel('Edad máxima masculino, sin incluir (meses)',{exact:true}).inputValue(),'132');
 assert.deepEqual(requests[1].regla.edadesPorSexo,{F:{minMeses:120,maxMesesExclusivo:180},M:{minMeses:120,maxMesesExclusivo:132}});
 assert.equal(requests.length,2);assert.equal(requests[1].regla.programacion.base,'contacto');assert.equal(requests[1].regla.territorio,'Cochabamba');
 await page.getByLabel('Programar desde').selectOption('dosis_previa');
 const permitirOtra=page.getByLabel('Seleccionar dosis anterior de otra vacuna',{exact:true});
 const anterior=page.getByLabel(/^Dosis anterior/);
 assert.equal(await permitirOtra.isChecked(),false);
 assert.deepEqual(await anterior.locator('option').evaluateAll(options=>options.map(o=>o.value)),['','3']);
 assert.equal(await anterior.locator('option[value="3"]').textContent(),'Vacuna de prueba · Tercera');
 await anterior.selectOption('3');
 await permitirOtra.check();
 assert.equal(await anterior.inputValue(),'','Ampliar la lista borra la selección anterior');
 assert.deepEqual(await anterior.locator('option').evaluateAll(options=>options.map(o=>o.value).sort()),['','2','3','4','5']);
 assert.equal(await anterior.locator('option[value="1"]').count(),0,'La dosis editada nunca puede ser su propia referencia');
 assert.equal(await anterior.locator('option[value="2"]').textContent(),'Vacuna de referencia · Primera de referencia');
 await anterior.selectOption('2');
 await permitirOtra.uncheck();
 assert.equal(await anterior.inputValue(),'','Restringir la lista borra la referencia de otra vacuna');
 assert.equal(await anterior.locator('option[value="2"]').count(),0);
 await anterior.selectOption('3');
 await permitirOtra.check();
 assert.equal(await anterior.inputValue(),'');
 await anterior.selectOption('2');
 await page.getByLabel('Intervalo',{exact:true}).fill('2');
 await page.getByLabel(/^Unidad del intervalo/).selectOption('meses');
 await page.getByRole('button',{name:'Guardar regla',exact:true}).click();
 await page.getByRole('alert').getByText(/fue modificada/).waitFor();
 assert.equal(await permitirOtra.isChecked(),true);
 assert.equal(await anterior.inputValue(),'2');
 assert.equal(await page.getByLabel('Intervalo',{exact:true}).inputValue(),'2');
 assert.deepEqual(requests[2].regla.programacion,{base:'dosis_previa',permitirOtraVacuna:true,dosisId:2,valor:2,unidad:'meses'});
 assert.equal(requests[2].version,1);
 await page.getByRole('button',{name:'Guardar regla',exact:true}).click();
 await page.getByRole('status').getByText(/guardada y auditada/).waitFor();
 assert.equal(requests.length,4);
 assert.deepEqual(requests[3].regla.programacion,requests[2].regla.programacion);
 await page.reload();
 await page.getByRole('button',{name:'Configuración',exact:true}).click();
 await page.getByLabel('Dosis a configurar').selectOption('1');
 assert.equal(await permitirOtra.isChecked(),true,'La regla guardada conserva la autorización después de recargar');
 assert.equal(await anterior.inputValue(),'2');
 assert.equal(await page.getByLabel('Intervalo',{exact:true}).inputValue(),'2');
 assert.equal(await page.getByLabel(/^Unidad del intervalo/).inputValue(),'meses');
 await page.getByLabel('Dosis a configurar').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(os.tmpdir(),'calendario-admin.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.waitForFunction(()=>document.querySelector('aside').getBoundingClientRect().right<=1);await page.screenshot({path:path.join(os.tmpdir(),'calendario-admin-movil.png'),fullPage:true,animations:'disabled'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
 await page.setViewportSize({width:1440,height:1050});
 await page.getByRole('button',{name:'Vacunación',exact:true}).click();
 await page.getByText('Femenino: desde 120 meses hasta antes de 180 meses',{exact:true}).waitFor();
 await page.getByText('Masculino: desde 120 meses hasta antes de 132 meses',{exact:true}).waitFor();
 await page.getByText('Intervalo programado: 2 meses después de Vacuna de referencia · Primera de referencia',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('OK calendario: campaña, contacto, referencia entre vacunas, conflicto, recarga, numeración discontinua y vista móvil');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
