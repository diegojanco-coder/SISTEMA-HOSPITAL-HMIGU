const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const rol of ['administrador','enfermero']){
   const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   let fecha='2025-01-01',correcciones=0;
   const paciente={id:9001,nombres:'Paciente',apellidos:'Prueba',codigo_paciente:'TEST',fecha_nacimiento:'2000-01-01',sexo:'F'};
   await page.addInitScript(rol=>{localStorage.setItem('hmgu_token','test');localStorage.setItem('hmgu_usuario',JSON.stringify({id:1,nombre:'Prueba',rol}));},rol);
   await page.route('**/api/v1/**',async route=>{
    const path=new URL(route.request().url()).pathname;let data=[];
    if(route.request().method()==='DELETE') return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({success:false,message:'No se puede retirar al único tutor activo. Vincule primero otro responsable.'})});
    if(route.request().method()==='PUT'){
     const input=route.request().postDataJSON();correcciones++;
     if(correcciones===1)return route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({success:false,message:'La aplicación no puede ser posterior al vencimiento del lote'})});
     fecha=input.fechaAplicacion;data={id:99,fecha_aplicacion:fecha};
    }else if(path.endsWith('/tutores'))data={rows:[{id:99,nombres:'Tutor',apellidos:'Prueba',parentesco:'otro',carnet_identidad:'12345678',telefono:'70000000'}],total:1};
    else if(path.endsWith('/pacientes'))data={rows:[paciente],total:1};
    else if(path.includes('/historial/'))data=[{id:99,vacuna_nombre:'Vacuna de prueba',nombre_dosis:'Primera',fecha_aplicacion:fecha,lote:'TEST',establecimiento:'Hospital',observaciones:''}];
    else if(path.endsWith('/esquema'))data={detalle:[],resumen:{aplicadas:1,proximas:0,pendientes:0,atrasadas:0},estadoGeneral:'verde'};
    else if(path.includes('/reportes/'))data={filas:[]};
    else if(path.endsWith('/correos/resumen'))data={habilitado:false,configurado:false,estados:[{estado:'pendiente',total:2}]};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
   });
   await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
   await page.getByRole('button',{name:'Historial',exact:true}).click();
   await page.getByRole('button',{name:/Paciente Prueba/}).click();
   await page.getByText('Vacuna de prueba - Primera',{exact:true}).waitFor();
   if(rol==='administrador'){
    await page.getByRole('button',{name:'Corregir registro'}).click();const dialog=page.getByRole('dialog');
    await dialog.getByLabel('Fecha de aplicación').fill('2025-02-01');await dialog.getByRole('button',{name:'Guardar corrección'}).click();
    await dialog.getByRole('alert').getByText(/vencimiento del lote/).waitFor();
    await dialog.getByLabel('Fecha de aplicación').fill('2025-01-02');await dialog.getByRole('button',{name:'Guardar corrección'}).click();
    await dialog.waitFor({state:'hidden'});await page.getByText('2025-01-02',{exact:true}).waitFor();assert.equal(correcciones,2);
    await page.getByRole('button',{name:'Alertas',exact:true}).click();
    await page.getByText(/Envío desactivado o cuenta remitente/).waitFor();await page.getByText('Pendientes: 2',{exact:true}).waitFor();
   }else{assert.equal(await page.getByRole('button',{name:'Corregir registro'}).count(),0);assert.equal(correcciones,0);}
   await page.getByRole('button',{name:'Tutores',exact:true}).click();await page.getByText('Tutor Prueba',{exact:true}).waitFor();
   if(rol==='administrador'){page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Desactivar',exact:true}).click();await page.getByRole('alert').getByText(/único tutor activo/).waitFor();}
   else assert.equal(await page.getByRole('button',{name:'Desactivar',exact:true}).count(),0);
   assert.deepEqual(errors,[]);console.log('PASS historial y permisos:',rol);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
