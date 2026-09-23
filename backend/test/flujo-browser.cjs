// Flujo real: Edge -> React/Vite -> API Express -> MySQL temporal. Sin interceptar respuestas.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { randomBytes } = require('node:crypto');
const { fork, spawnSync } = require('node:child_process');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { db } = require('../src/config/env');
const backend = path.resolve(__dirname, '..');
const frontend = path.resolve(backend, '../frontend-app');
const database = 'hmgu_e2e_' + randomBytes(8).toString('hex');
const password = 'Ensayo123!';
let connection, created = false, api, web, browser, page, temporary, evidence, phase = 'preparación';
const passed = [], failures = [];
const quote = mysql.escapeId;
const date = new Date();
const today = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const civil = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const birth = civil(new Date(date.getFullYear()-2,date.getMonth(),date.getDate()));
const expires = civil(new Date(date.getFullYear()+1,date.getMonth(),date.getDate()));
function ok(text) { passed.push(text); console.log('OK:', text); }
function field(scope, label) { return scope.locator('label').filter({ hasText: new RegExp('^'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$') }).locator('..').locator('input, select, textarea').first(); }
async function response(action, suffix, method = 'POST') {
  const pending = page.waitForResponse(r => new URL(r.url()).pathname.endsWith(suffix) && r.request().method() === method);
  await action(); const r = await pending; const data = await r.json();
  assert.ok(r.ok(), `${phase}: HTTP ${r.status()} ${data.message || ''}`);
  return data.data;
}
async function navigate(name) { await page.getByRole('button', { name, exact: true }).click(); }
async function login(user, loginPassword = password) {
  await page.goto(web.url);
  await page.getByPlaceholder('usuario', { exact: true }).fill(user);
  await page.locator('input[type=password]').fill(loginPassword);
  await response(() => page.getByRole('button', { name: 'Ingresar al Sistema' }).click(), '/auth/login');
  await page.getByRole('button', { name: 'Pacientes', exact: true }).waitFor();
}
async function createPatient(name, dob, mode) {
  await navigate('Pacientes');
  await page.getByRole('button', { name: 'Nuevo Paciente', exact: true }).click();
  const form = page.getByRole('dialog');
  await form.getByRole('button',{name:mode==='menor'?/^Menor o recién nacido/:/^Adulto/}).click();
  await form.getByLabel('Nombres *',{exact:true}).fill(name);
  await form.getByLabel('Apellidos *',{exact:true}).fill('Ensayo');
  await form.getByLabel('Fecha de nacimiento *',{exact:true}).fill(dob);
  await form.getByLabel('Departamento de residencia').selectOption('Cochabamba');
  if(mode==='dependiente')await form.getByLabel('Requiere tutor o responsable (adulto dependiente)').check();
  assert.equal(await form.getByLabel('Correo electrónico del paciente *',{exact:true}).count(),0);
  await form.getByRole('button',{name:'Continuar',exact:true}).click();
  if (mode === 'menor') {
    assert.equal(await form.getByLabel('Correo electrónico del paciente *',{exact:true}).count(),0);
    await form.getByRole('button',{name:'Continuar',exact:true}).click();
    await form.getByText('Selecciona un tutor o registra uno nuevo.',{exact:true}).waitFor();
    await form.getByRole('button',{name:'Registrar tutor nuevo',exact:true}).click();
    for(const [label,value] of [['Nombres del tutor *','Rosa'],['Apellidos del tutor *','Ensayo'],['CI del tutor (opcional)','9876543'],['Teléfono o referencia del tutor *','70000001'],['Correo electrónico del tutor *','tutor@example.invalid']])await form.getByLabel(label,{exact:true}).fill(value);
  } else if (mode === 'dependiente') {
    await form.getByLabel('Buscar tutor por nombre o CI').fill('Rosa Ensayo');
    await form.getByRole('button',{name:/^Rosa Ensayo/}).click();
  } else {
    await form.getByLabel('Teléfono o referencia del paciente *',{exact:true}).fill('70000002');
    await form.getByLabel('Correo electrónico del paciente *',{exact:true}).fill('adulto@example.invalid');
  }
  await form.getByRole('button',{name:'Continuar',exact:true}).click();
  await form.getByLabel('Confirmé los datos del paciente y el contacto para sus recordatorios.').check();
  const patient=await response(()=>form.getByRole('button',{name:'Guardar paciente',exact:true}).click(),'/pacientes');
  assert.equal(patient.contacto_principal.origen,mode==='independiente'?'paciente':'tutor');
  if(mode==='menor'){assert.equal(patient.email,null);assert.equal(patient.telefono_contacto,null);await screenshot('registro-menor-guardado');}
  await form.getByRole('button',{name:'Cerrar',exact:true}).click();
  return patient;
}
async function profile(name) {
  await navigate('Pacientes');
  await page.getByPlaceholder('Buscar por nombre, CI o código...').fill(name);
  const row = page.getByRole('row').filter({ hasText: `${name} Ensayo` });
  await row.getByRole('button', { name: 'Ver', exact: true }).click();
  await page.getByRole('button',{name:'Registrar Vacuna',exact:true}).waitFor();
}
async function screenshot(name) { await page.screenshot({path:path.join(evidence,name+'.png'),fullPage:true,animations:'disabled'}); }

(async () => {
  try {
    assert.match(database, /^hmgu_e2e_[a-f0-9]{16}$/); assert.notEqual(database, db.database);
    temporary = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'hmgu-e2e-')));
    evidence = await fs.mkdtemp(path.join(os.tmpdir(), 'hmgu-e2e-evidencia-'));
    connection = await mysql.createConnection({host:db.host,port:db.port,user:db.user,password:db.password,multipleStatements:true,dateStrings:true});
    await fs.writeFile(path.join(temporary,'recurso.json'),JSON.stringify({database}));
    await connection.query(`CREATE DATABASE ${quote(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`); created=true;
    await connection.query(`USE ${quote(database)}`);
    let schema = await fs.readFile(path.join(backend,'src/database/schema.sql'),'utf8');
    schema = schema.replace(/^DROP DATABASE IF EXISTS vacunacion_hmgu;\r?$/m,'').replace(/^CREATE DATABASE vacunacion_hmgu[\s\S]*?;/m,'').replace(/^USE vacunacion_hmgu;\r?$/m,'');
    assert.ok(!/\b(?:DROP|CREATE)\s+DATABASE\b|^\s*USE\s+/im.test(schema));
    await connection.query(schema);
    const env={...process.env,DB_NAME:database,NODE_ENV:'test',SMTP_ENABLED:'false',BACKUP_DIR:path.join(temporary,'backups')};
    const upgrade=spawnSync(process.execPath,['src/database/upgrade.js'],{cwd:backend,env,encoding:'utf8',windowsHide:true,timeout:60000});
    assert.equal(upgrade.status,0,'No se pudo actualizar la base ficticia');
    await connection.query('INSERT INTO usuarios (nombre_completo,email,username,password_hash,rol) VALUES (?,?,?,?,?)',['Administración Ensayo','admin@example.invalid','admin',await bcrypt.hash(password,10),'administrador']);
    const build=spawnSync(process.execPath,[path.join(frontend,'node_modules/vite/bin/vite.js'),'build','--configLoader','runner','--outDir',path.join(temporary,'dist')],{cwd:frontend,env:{...process.env,VITE_API_URL:'/api/v1'},encoding:'utf8',windowsHide:true,timeout:90000,maxBuffer:2*1024*1024});
    assert.equal(build.status,0,`No se pudo compilar la interfaz de prueba: ${(build.stderr||'').slice(-1500)}`);
    api = fork(path.join(__dirname,'helpers/browser-api.cjs'),[],{cwd:backend,env:{...env,SERVE_FRONTEND:'true',FRONTEND_DIST:path.join(temporary,'dist'),FRONTEND_URL:'http://127.0.0.1'},windowsHide:true,stdio:['ignore','ignore','pipe','ipc']});
    let apiLog='';api.stderr.on('data',chunk=>{apiLog=(apiLog+chunk.toString()).slice(-1600);});
    const address=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('API de prueba no inició: '+apiLog)),60000);api.once('message',m=>{clearTimeout(timer);resolve(m);});api.once('exit',()=>{clearTimeout(timer);reject(new Error('API de prueba terminó: '+apiLog));});});
    const apiUrl=`http://127.0.0.1:${address.port}/api/v1`;
    web={url:`http://127.0.0.1:${address.port}`};
    assert.equal((await fetch(web.url+'/api/v1/ready')).status,200);
    browser=await chromium.launch({channel:process.env.TEST_BROWSER||'msedge',headless:true});
    page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
    page.setDefaultTimeout(20000);
    page.on('pageerror',e=>failures.push(e.message));
    page.on('dialog',dialog=>dialog.accept());
    let documentRequests=0;page.on('request',request=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())documentRequests++;});
    phase='inicio de sesión';
    await page.goto(web.url);
    await page.getByPlaceholder('usuario',{exact:true}).fill('admin');
    await page.locator('input[type=password]').fill('Incorrecta123!');
    const wrong=page.waitForResponse(r=>r.url().endsWith('/auth/login'));await page.getByRole('button',{name:'Ingresar al Sistema'}).click();assert.equal((await wrong).status(),401);
    await page.getByText('Credenciales inválidas',{exact:true}).first().waitFor();
    await page.locator('input[type=password]').fill(password);
    await response(()=>page.getByRole('button',{name:'Ingresar al Sistema'}).click(),'/auth/login');
    await navigate('Configuración');
    assert.equal(documentRequests,1);
    ok('login rechaza clave incorrecta y permite entrar sin recargar');
    phase='usuario de enfermería';
    await page.getByRole('button',{name:'Nuevo Usuario',exact:true}).click();
    let form=page.locator('form');
    for(const [label,value] of [['Nombre completo *','Enfermería Ensayo'],['Email *','enfermeria@example.invalid'],['Usuario *','enfermeria'],['Contraseña temporal *',password]]) await field(form,label).fill(value);
    const nurseAccount=await response(()=>form.getByRole('button',{name:'Guardar',exact:true}).click(),'/usuarios');
    ok('creación de usuario de enfermería');
    phase='catálogo, reglas y lotes';
    const configured=[];
    for(const [index,name] of [[1,'Vacuna Ensayo Alfa'],[2,'Vacuna Ensayo Beta']]) {
      await page.getByRole('button',{name:'Agregar Vacuna',exact:true}).click();form=page.locator('form');
      await field(form,'Nombre *').fill(name);await field(form,'Nombre corto *').fill('E2E'+index);
      const vaccine=await response(()=>form.getByRole('button',{name:'Guardar',exact:true}).click(),'/vacunas');
      await page.locator('p').filter({hasText:new RegExp('^'+name+'$')}).locator('..').locator('..').locator('..').getByRole('button',{name:'+ Dosis',exact:true}).click();
      form=page.locator('form');await field(form,'Nombre de la dosis').fill('Única');
      const dose=await response(()=>form.getByRole('button',{name:'Guardar',exact:true}).click(),`/vacunas/${vaccine.id}/dosis`);
      await page.getByLabel('Dosis a configurar').selectOption(String(dose.id));
      await page.getByLabel('Fuente oficial').fill('https://example.invalid/regla-ficticia');
      await page.getByLabel('Edad máxima, sin incluir (meses)').fill('60');
      if(index===1){
        await page.getByLabel('Diferenciar edades por sexo registrado').check();
        await page.getByLabel('Edad máxima femenino, sin incluir (meses)',{exact:true}).fill('60');
        await page.getByLabel('Edad máxima masculino, sin incluir (meses)',{exact:true}).fill('36');
      }
      await page.getByLabel('Habilitar esta regla para programación y alertas conforme a la fuente indicada.').check();
      await response(()=>page.getByRole('button',{name:'Guardar regla',exact:true}).click(),`/vacunas/dosis/${dose.id}/calendario`,'PUT');
      await page.getByLabel('Vacuna del lote',{exact:true}).selectOption(String(vaccine.id));
      await page.getByLabel('Número de lote').fill('ENSAYO'+index);await page.getByLabel('Vencimiento del lote').fill(expires);await page.getByLabel('Unidades recibidas').fill('5');
      const lot=await response(()=>page.getByRole('button',{name:'Registrar lote',exact:true}).click(),'/lotes');
      configured.push({vaccine,dose,lot});
    }
    ok('dos vacunas con reglas ficticias y lotes ingresados desde la pantalla');
    await page.close();page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});page.setDefaultTimeout(20000);page.on('pageerror',e=>failures.push(e.message));
    // Cada página usa un contexto nuevo y vuelve a iniciar sesión por la interfaz.
    await login('enfermeria');
    assert.equal(await page.getByRole('button',{name:'Configuración',exact:true}).count(),0);
    assert.equal(await page.getByRole('button',{name:'Reportes',exact:true}).count(),0);
    const nurseDenied=await page.evaluate(async url=>{const token=localStorage.getItem('hmgu_token');const r=await fetch(url+'/usuarios',{headers:{Authorization:'Bearer '+token}});return r.status;},apiUrl);assert.equal(nurseDenied,403);
    ok('enfermería no ve administración y la API rechaza su acceso');
    phase='pacientes y tutores';
    const minor=await createPatient('Lucia',birth,'menor');
    await createPatient('Pedro','1990-01-01','dependiente');
    await createPatient('Ana','1995-01-01','independiente');
    const [[counts]]=await connection.query('SELECT (SELECT COUNT(*) FROM pacientes) pacientes,(SELECT COUNT(*) FROM tutores) tutores,(SELECT COUNT(*) FROM paciente_tutor WHERE estado=\'activo\') vinculos');
    assert.deepEqual({...counts},{pacientes:3,tutores:1,vinculos:2});
    ok('menor con tutor, adulto dependiente con tutor existente y adulto independiente');
    phase='módulos Tutores y Vacunación';
    await navigate('Tutores');
    await page.getByPlaceholder('Buscar por nombre o CI...').fill('9876543');
    const tutorRow=page.getByRole('row').filter({hasText:'Rosa Ensayo'});
    await tutorRow.waitFor();assert.equal(await tutorRow.getByRole('button',{name:'Desactivar',exact:true}).count(),0);
    await navigate('Vacunación');
    for(const name of ['Vacuna Ensayo Alfa · Única','Vacuna Ensayo Beta · Única'])await page.getByRole('heading',{name,exact:true}).waitFor();
    assert.equal(await page.getByRole('link',{name:'Consultar fuente'}).count(),2);
    await page.getByText('Femenino: desde 0 meses hasta antes de 60 meses',{exact:true}).waitFor();
    await page.getByText('Masculino: desde 0 meses hasta antes de 36 meses',{exact:true}).waitFor();
    ok('tutor localizable por CI y reglas visibles en el módulo Vacunación');
    await profile('Pedro');await page.getByText(/El esquema requiere revisión antes de confirmar/).waitFor();
    assert.equal(await page.getByText('El paciente está al día con su esquema de vacunación.',{exact:true}).count(),0);
    await screenshot('adulto-revision');
    await page.reload();await page.getByRole('button',{name:'Pacientes',exact:true}).waitFor();
    const [[pendingBefore]]=await connection.query("SELECT COUNT(*) n FROM alertas WHERE paciente_id=? AND estado_semaforo IN ('rojo','amarillo')",[minor.id]);assert.equal(pendingBefore.n,2);
    phase='registro de vacunación';await profile('Lucia');
    await page.getByRole('button',{name:'Registrar Vacuna',exact:true}).click();const dialog=page.getByRole('dialog');
    for(const {dose,lot} of configured){await dialog.getByLabel('Dosis',{exact:true}).selectOption(String(dose.id));await dialog.getByLabel('Lote',{exact:true}).selectOption(String(lot.id));await dialog.getByRole('button',{name:'Añadir dosis a la visita'}).click();}
    await dialog.getByRole('button',{name:'Revisar visita'}).click();await screenshot('visita-confirmacion');
    await response(()=>dialog.getByRole('button',{name:'Confirmar 2 dosis'}).click(),'/citas');await dialog.waitFor({state:'hidden'});
    await page.getByText('Lote: ENSAYO1',{exact:false}).waitFor();await page.getByText('Lote: ENSAYO2',{exact:false}).waitFor();
    const [stock]=await connection.query('SELECT cantidad_disponible n FROM lotes_vacuna ORDER BY id');assert.deepEqual(stock.map(r=>r.n),[4,4]);
    const [history]=await connection.query('SELECT id,cita_id FROM historial_vacunacion WHERE paciente_id=? ORDER BY id',[minor.id]);assert.equal(history.length,2);assert.ok(history[0].cita_id);assert.equal(history[0].cita_id,history[1].cita_id);
    const [[visits]]=await connection.query('SELECT COUNT(*) n FROM citas WHERE paciente_id=?',[minor.id]);assert.equal(visits.n,1);
    const extraPermissions=await page.evaluate(async ({url,id,today})=>{const headers={Authorization:'Bearer '+localStorage.getItem('hmgu_token'),'Content-Type':'application/json'};return Promise.all([fetch(url+'/historial/'+id,{method:'PUT',headers,body:JSON.stringify({fechaAplicacion:today,establecimiento:'Ensayo',observaciones:'No permitido'})}).then(r=>r.status),fetch(url+'/reportes/pacientes-registrados',{headers}).then(r=>r.status)]);},{url:apiUrl,id:history[0].id,today});assert.deepEqual(extraPermissions,[403,403]);
    ok('visita de dos dosis guardada y stock descontado exactamente una vez');
    await screenshot('historial-ficha');
    await page.reload();await page.getByRole('button',{name:'Historial',exact:true}).waitFor();await navigate('Historial');
    await page.getByRole('button').filter({hasText:'Lucia Ensayo'}).click();await page.getByRole('heading',{name:'Historial de vacunación',exact:true,level:5}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Corregir registro',exact:true}).count(),0);
    await page.close();page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});page.setDefaultTimeout(20000);page.on('pageerror',e=>failures.push(e.message));
    await login('admin');
    phase='protección del único tutor';await navigate('Tutores');
    const protectedTutor=page.getByRole('row').filter({hasText:'Rosa Ensayo'});
    page.once('dialog',dialog=>dialog.accept());
    const refuse=page.waitForResponse(r=>/\/tutores\/\d+$/.test(new URL(r.url()).pathname)&&r.request().method()==='DELETE');
    await protectedTutor.getByRole('button',{name:'Desactivar',exact:true}).click();assert.equal((await refuse).status(),409);
    await page.getByRole('alert').filter({hasText:'No se puede retirar al único tutor activo'}).waitFor();
    const [[activeTutor]]=await connection.query("SELECT estado FROM tutores WHERE carnet_identidad='9876543'");assert.equal(activeTutor.estado,'activo');
    ok('la interfaz impide desactivar al único responsable de menores y dependientes');
    await navigate('Historial');await page.getByRole('button').filter({hasText:'Lucia Ensayo'}).click();
    phase='corrección auditada';await page.getByRole('button',{name:'Corregir registro',exact:true}).first().click();
    await page.getByLabel('Observaciones',{exact:true}).fill('Corrección de prueba desde navegador');
    const correction=page.waitForResponse(r=>/\/historial\/\d+$/.test(new URL(r.url()).pathname)&&r.request().method()==='PUT');await page.getByRole('button',{name:'Guardar corrección',exact:true}).click();const correctionResponse=await correction;assert.equal(correctionResponse.status(),200);const corrected=(await correctionResponse.json()).data;
    await page.getByText('Corrección de prueba desde navegador',{exact:true}).waitFor();
    const [afterStock]=await connection.query('SELECT cantidad_disponible n FROM lotes_vacuna ORDER BY id');assert.deepEqual(afterStock.map(r=>r.n),[4,4]);
    const [[recorded]]=await connection.query("SELECT a.datos_previos,a.datos_nuevos,u.username FROM auditoria a JOIN usuarios u ON u.id=a.usuario_id WHERE a.entidad='historial_vacunacion' AND a.accion='EDITAR' AND a.entidad_id=? ORDER BY a.id DESC LIMIT 1",[corrected.id]);assert.equal(recorded.username,'admin');assert.equal(recorded.datos_nuevos.observaciones,'Corrección de prueba desde navegador');assert.notEqual(recorded.datos_previos.observaciones,recorded.datos_nuevos.observaciones);
    ok('corrección administrativa visible, auditada y sin segundo descuento');
    phase='carnet y reportes';await navigate('Carnet Digital');await page.getByRole('button').filter({hasText:'Lucia Ensayo'}).click();
    const carnet=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith(`/pacientes/${minor.id}/carnet`));await page.getByRole('button',{name:'Descargar Carnet en PDF'}).click();const carnetResponse=await carnet;assert.equal(carnetResponse.status(),200);assert.equal((await carnetResponse.body()).subarray(0,4).toString(),'%PDF');
    await navigate('Reportes');
    const reports=['pacientes-registrados','vacunas-aplicadas','vacunas-pendientes','cobertura-vacunacion','pacientes-por-edad','vacunas-por-fecha'];
    for(const type of reports){
      await field(page,'Tipo de reporte').selectOption(type);
      if(type==='vacunas-aplicadas'){await field(page,'Desde').fill(today);await field(page,'Hasta').fill(today);}
      if(type==='pacientes-por-edad'){await field(page,'Edad mínima').fill('0');await field(page,'Edad máxima').fill('100');}
      if(type==='vacunas-por-fecha')await field(page,'Fecha').fill(today);
      const report=await response(()=>page.getByRole('button',{name:'Ver Reporte',exact:true}).click(),'/reportes/'+type,'GET');
      const expected={'pacientes-registrados':3,'vacunas-aplicadas':2,'vacunas-pendientes':0,'cobertura-vacunacion':2,'pacientes-por-edad':3,'vacunas-por-fecha':2};assert.equal(report.filas.length,expected[type]);
      if(type==='pacientes-registrados'){assert.deepEqual(report.filas.map(row=>row.nombres).sort(),['Ana','Lucia','Pedro']);await page.getByRole('cell',{name:'Lucia',exact:true}).waitFor();}
      if(type==='cobertura-vacunacion')for(const row of report.filas){assert.equal(row.aplicadas,1);assert.equal(row.esperadas,1);assert.equal(row.cobertura,'100.0%');}
    }
    for(const [format,magic] of [['PDF','%PDF'],['Excel','PK']]){const pending=page.waitForEvent('download');await page.getByRole('button',{name:format,exact:true}).click();const download=await pending;const data=await fs.readFile(await download.path());assert.equal(data.subarray(0,magic.length).toString(),magic);}
    ok('carnet PDF, seis consultas de reportes y archivos PDF/Excel reales');
    phase='alertas y auditoría';await navigate('Alertas');await response(()=>page.getByRole('button',{name:'Recalcular Alertas'}).click(),'/alertas/recalcular');
    await page.getByText(/Envío desactivado o cuenta remitente pendiente/).waitFor();
    const [[pendingAfter]]=await connection.query("SELECT COUNT(*) n FROM alertas WHERE paciente_id=? AND estado_semaforo IN ('rojo','amarillo')",[minor.id]);assert.equal(pendingAfter.n,0);
    const [[emails]]=await connection.query("SELECT COUNT(*) n FROM notificaciones_email WHERE estado='enviado'");assert.equal(emails.n,0);
    await navigate('Configuración');await page.getByRole('button',{name:'Ver Logs del Sistema'}).click();await page.getByRole('heading',{name:'Bitácora de Auditoría'}).waitFor();
    const [[audit]]=await connection.query("SELECT COUNT(*) n FROM auditoria WHERE entidad='historial_vacunacion'");assert.ok(audit.n>0);
    await screenshot('auditoria');ok('alertas recalculadas, correo desactivado y auditoría consultable');
    await page.reload();await page.getByRole('button',{name:'Pacientes',exact:true}).waitFor();await profile('Lucia');
    await page.getByRole('button',{name:'Activar tema oscuro'}).click();await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>document.querySelector('aside').getBoundingClientRect().right<=1);
    await screenshot('movil-oscuro');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
    await page.setViewportSize({width:1440,height:1000});
    await page.getByRole('button',{name:'Cerrar',exact:true}).click();
    phase='cambio de contraseña';
    await navigate('Configuración');
    const nurseRow=page.locator('p').filter({hasText:/^Enfermería Ensayo$/}).locator('..').locator('..').locator('..');
    await nurseRow.getByRole('button',{name:'Cambiar contraseña',exact:true}).click();
    const passwordDialog=page.getByRole('dialog',{name:'Cambiar contraseña',exact:true});
    const nuevaPassword='NuevaEnsayo456!';
    await passwordDialog.getByLabel('Nueva contraseña',{exact:true}).fill(nuevaPassword);
    await passwordDialog.getByLabel('Confirmar nueva contraseña',{exact:true}).fill(nuevaPassword);
    await response(()=>passwordDialog.getByRole('button',{name:'Guardar contraseña',exact:true}).click(),`/usuarios/${nurseAccount.id}/password`,'PATCH');
    assert.equal((await page.request.post(apiUrl+'/auth/login',{data:{login:'enfermeria',password}})).status(),401);
    assert.equal((await page.request.post(apiUrl+'/auth/login',{data:{login:'enfermeria',password:nuevaPassword}})).status(),200);
    const [[passwordAudit]]=await connection.query("SELECT datos_nuevos FROM auditoria WHERE entidad='usuarios' AND entidad_id=? AND accion='EDITAR' ORDER BY id DESC LIMIT 1",[nurseAccount.id]);
    const auditData=typeof passwordAudit.datos_nuevos==='string'?JSON.parse(passwordAudit.datos_nuevos):passwordAudit.datos_nuevos;
    assert.deepEqual(auditData,{passwordActualizado:true});
    ok('cambio de contraseña desde pantalla, nueva clave válida y auditoría sin secretos');
    phase='seguimiento entre vacunas';
    await page.locator('p').filter({hasText:/^Vacuna Ensayo Beta$/}).locator('..').locator('..').locator('..').getByRole('button',{name:'+ Dosis',exact:true}).click();
    form=page.locator('form');await field(form,'Nombre de la dosis').fill('Seguimiento');
    const seguimiento=await response(()=>form.getByRole('button',{name:'Guardar',exact:true}).click(),`/vacunas/${configured[1].vaccine.id}/dosis`);
    await page.getByLabel('Dosis a configurar').selectOption(String(seguimiento.id));
    await page.getByLabel('Fuente oficial').fill('https://example.invalid/seguimiento-ficticio');
    await page.getByLabel('Edad máxima, sin incluir (meses)').fill('60');
    await page.getByLabel('Programar desde').selectOption('dosis_previa');
    await page.getByLabel('Seleccionar dosis anterior de otra vacuna',{exact:true}).check();
    const referencia=page.locator('label').filter({hasText:/^Dosis anterior/}).locator('select');
    await referencia.selectOption(String(configured[0].dose.id));
    await page.getByLabel('Intervalo',{exact:true}).fill('2');
    await page.getByLabel('Unidad del intervalo').selectOption('meses');
    await page.getByLabel(/Habilitar esta regla/).check();
    const guardada=await response(()=>page.getByRole('button',{name:'Guardar regla',exact:true}).click(),`/vacunas/dosis/${seguimiento.id}/calendario`,'PUT');
    assert.deepEqual(guardada.regla_calendario.programacion,{base:'dosis_previa',dosisId:configured[0].dose.id,valor:2,unidad:'meses',permitirOtraVacuna:true});
    await page.reload();await navigate('Configuración');
    await page.getByLabel('Dosis a configurar').selectOption(String(seguimiento.id));
    assert.equal(await page.getByLabel('Seleccionar dosis anterior de otra vacuna',{exact:true}).isChecked(),true);
    assert.equal(await referencia.inputValue(),String(configured[0].dose.id));
    await navigate('Vacunación');
    await page.getByText('Intervalo programado: 2 meses después de Vacuna Ensayo Alfa · Única',{exact:true}).waitFor();
    const intento=await page.evaluate(async({url,pacienteId,dosisId,loteVacunaId,fecha})=>{
      const r=await fetch(url+'/citas',{method:'POST',headers:{Authorization:'Bearer '+localStorage.getItem('hmgu_token'),'Content-Type':'application/json'},body:JSON.stringify({pacienteId,dosisAplicadas:[{dosisId,loteVacunaId,fechaAplicacion:fecha}]})});
      return {status:r.status,body:await r.json()};
    },{url:apiUrl,pacienteId:minor.id,dosisId:seguimiento.id,loteVacunaId:configured[1].lot.id,fecha:today});
    assert.equal(intento.status,422);assert.match(intento.body.message,/intervalo/);
    const [[sinAdelanto]]=await connection.query('SELECT COUNT(*) n FROM historial_vacunacion WHERE dosis_id=?',[seguimiento.id]);assert.equal(sinAdelanto.n,0);
    const [stockFinal]=await connection.query('SELECT cantidad_disponible n FROM lotes_vacuna ORDER BY id');assert.deepEqual(stockFinal.map(r=>r.n),[4,4]);
    await screenshot('seguimiento-entre-vacunas');
    ok('referencia entre vacunas guardada desde pantalla, conservada tras recarga y aplicación anticipada rechazada sin descontar stock');
    phase='antecedentes externos documentados';
    await navigate('Configuración');await page.getByRole('button',{name:'Agregar Vacuna',exact:true}).click();
    form=page.locator('form');await field(form,'Nombre *').fill('Vacuna Ensayo Origen');await field(form,'Nombre corto *').fill('E2EEXT');
    const origen=await response(()=>form.getByRole('button',{name:'Guardar',exact:true}).click(),'/vacunas');
    const dosisExternas=[];
    for(let numero=1;numero<=2;numero++){
      await page.locator('p').filter({hasText:/^Vacuna Ensayo Origen$/}).locator('..').locator('..').locator('..').getByRole('button',{name:'+ Dosis',exact:true}).click();
      form=page.locator('form');await field(form,'Nombre de la dosis').fill('Documento '+numero);
      const d=await response(()=>form.getByRole('button',{name:'Guardar',exact:true}).click(),`/vacunas/${origen.id}/dosis`);dosisExternas.push(d);
      await page.getByLabel('Dosis a configurar').selectOption(String(d.id));await page.getByLabel('Fuente oficial').fill('https://example.invalid/antecedente-ficticio');
      await page.getByLabel('Edad máxima, sin incluir (meses)').fill('60');await page.getByLabel('Programar desde').selectOption('contacto');
      await page.getByLabel(/Habilitar esta regla/).check();
      await response(()=>page.getByRole('button',{name:'Guardar regla',exact:true}).click(),`/vacunas/dosis/${d.id}/calendario`,'PUT');
    }
    await page.close();page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});page.setDefaultTimeout(20000);page.on('pageerror',e=>failures.push(e.message));
    await login('enfermeria',nuevaPassword);await navigate('Historial');await page.getByRole('button').filter({hasText:'Lucia Ensayo'}).click();
    await page.getByRole('button',{name:'Registrar antecedente externo',exact:true}).click();
    const externoDialog=page.getByRole('dialog',{name:'Registrar antecedente externo',exact:true});
    await externoDialog.getByLabel(/^Vacuna y dosis/).selectOption(String(dosisExternas[0].id));
    await externoDialog.getByLabel('Fecha de aplicación',{exact:true}).fill(today);await externoDialog.getByLabel('Establecimiento',{exact:true}).fill('Centro externo de ensayo');
    await externoDialog.getByLabel(/^Documento de referencia/).fill('Carnet de ensayo, folio 8');
    const externo=await response(()=>externoDialog.getByRole('button',{name:'Guardar antecedente',exact:true}).click(),'/historial/antecedentes');
    await page.getByText('Documento de referencia: Carnet de ensayo, folio 8',{exact:true}).waitFor();
    assert.equal(externo.origen,'externo');assert.equal(externo.cita_id,null);assert.equal(externo.lote_vacuna_id,null);
    // Dos solicitudes reales concurrentes deben producir una sola identidad clínica.
    const repetidas=await page.evaluate(async({url,data})=>{
      const headers={Authorization:'Bearer '+localStorage.getItem('hmgu_token'),'Content-Type':'application/json'};
      return Promise.all([1,2].map(()=>fetch(url+'/historial/antecedentes',{method:'POST',headers,body:JSON.stringify(data)}).then(r=>r.status)));
    },{url:apiUrl,data:{pacienteId:minor.id,dosisId:dosisExternas[1].id,fechaAplicacion:today,establecimiento:'Centro externo de ensayo',documentoReferencia:'Carnet de ensayo, folio 9'}});
    assert.deepEqual(repetidas.sort(),[201,409]);
    const [[cantidadExternos]]=await connection.query("SELECT COUNT(*) n FROM historial_vacunacion WHERE paciente_id=? AND origen='externo'",[minor.id]);assert.equal(cantidadExternos.n,2);
    const [sinDescuento]=await connection.query('SELECT cantidad_disponible n FROM lotes_vacuna ORDER BY id');assert.deepEqual(sinDescuento.map(r=>r.n),[4,4]);
    const [[sinVisita]]=await connection.query('SELECT COUNT(*) n FROM citas WHERE paciente_id=?',[minor.id]);assert.equal(sinVisita.n,1);
    await page.close();page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});page.setDefaultTimeout(20000);page.on('pageerror',e=>failures.push(e.message));
    await login('admin');await navigate('Historial');await page.getByRole('button').filter({hasText:'Lucia Ensayo'}).click();
    const registroExterno=page.locator('div').filter({has:page.getByText('Vacuna Ensayo Origen - Documento 1',{exact:true})}).filter({has:page.getByRole('button',{name:'Corregir registro',exact:true})}).last();
    await registroExterno.getByRole('button',{name:'Corregir registro',exact:true}).click();
    const corregir=page.getByRole('dialog');await corregir.getByLabel('Documento de referencia',{exact:true}).fill('Carnet cotejado, folio 8');
    await response(()=>corregir.getByRole('button',{name:'Guardar corrección',exact:true}).click(),'/historial/'+externo.id,'PUT');
    await page.getByText('Documento de referencia: Carnet cotejado, folio 8',{exact:true}).waitFor();
    const [[bitacoraExterna]]=await connection.query("SELECT COUNT(*) n FROM auditoria WHERE entidad='historial_vacunacion' AND entidad_id=?",[externo.id]);assert.equal(bitacoraExterna.n,2);
    const produccion=await page.evaluate(async({url,today})=>{const r=await fetch(url+'/reportes/vacunas-aplicadas?desde='+today+'&hasta='+today,{headers:{Authorization:'Bearer '+localStorage.getItem('hmgu_token')}});return r.json();},{url:apiUrl,today});assert.equal(produccion.data.filas.length,2);
    await screenshot('antecedentes-externos');
    const carnetExterno=await page.evaluate(async({url,id})=>{const r=await fetch(url+'/pacientes/'+id+'/carnet',{headers:{Authorization:'Bearer '+localStorage.getItem('hmgu_token')}});return {status:r.status,tipo:r.headers.get('content-type'),bytes:(await r.arrayBuffer()).byteLength};},{url:apiUrl,id:minor.id});
    assert.equal(carnetExterno.status,200);assert.match(carnetExterno.tipo,/pdf/);assert.ok(carnetExterno.bytes>1000);
    ok('antecedentes externos desde pantalla, duplicación concurrente rechazada, corrección auditada, carnet y producción hospitalaria sin alterar stock');
    phase='prerregistro y confirmación de identidad';
    await require('./helpers/registro-browser.cjs')({page,navigate,response,screenshot,connection,today});
    ok('prerregistro móvil, correo completado, recién nacido provisional, duplicado 409 recuperable y accesos a ficha y vacunación');
    assert.deepEqual(failures,[]);
    ok('pantalla móvil oscura y ausencia de errores JavaScript');

  } catch(error) {
    if(page&&evidence){await screenshot('fallo').catch(()=>{});await fs.writeFile(path.join(evidence,'fallo.txt'),`Etapa: ${phase}\n${error.stack}\nErrores: ${failures.join('\n')}`).catch(()=>{});}
    console.error('FALLO E2E:',phase,error.message);console.error('EVIDENCIA:',evidence);process.exitCode=1;
  } finally {
    const cleanupErrors=[];
    async function cleanup(name,action){try{await action();}catch{cleanupErrors.push(name);}}
    await cleanup('navegador',async()=>{if(browser)await browser.close();});
    await cleanup('API',async()=>{
      if(!api||api.exitCode!==null||api.signalCode!==null)return;
      await new Promise((resolve,reject)=>{
        const killTimer=setTimeout(()=>api.kill(),5000);
        const endTimer=setTimeout(()=>reject(new Error('API no terminó')),10000);
        api.once('exit',()=>{clearTimeout(killTimer);clearTimeout(endTimer);resolve();});
        if(api.connected)api.send('close',error=>{if(error)api.kill();});else api.kill();
      });
    });
    await cleanup('base temporal',async()=>{
      if(!connection||!created)return;
      if(api&&api.exitCode===null&&api.signalCode===null)throw new Error('API aún activa');
      await connection.query(`DROP DATABASE ${quote(database)}`);created=false;
      const [[remaining]]=await connection.query('SELECT COUNT(*) n FROM information_schema.schemata WHERE SCHEMA_NAME=?',[database]);assert.equal(remaining.n,0);
    });
    await cleanup('conexión MySQL',async()=>{if(connection)await connection.end();});
    await cleanup('archivos temporales',async()=>{
      if(!temporary||created)return;
      const target=await fs.realpath(temporary),root=await fs.realpath(os.tmpdir());
      assert.equal(target,temporary);assert.equal(path.dirname(target),root);assert.match(path.basename(target),/^hmgu-e2e-[A-Za-z0-9]+$/);
      const marker=JSON.parse(await fs.readFile(path.join(target,'recurso.json'),'utf8'));assert.equal(marker.database,database);
      await fs.rm(target,{recursive:true,force:true});
    });
    if(cleanupErrors.length){console.error('Limpieza pendiente:',cleanupErrors.join(', '));process.exitCode=1;}
    if(evidence){await fs.writeFile(path.join(evidence,'resultado.json'),JSON.stringify({fecha:new Date().toISOString(),pasos:passed,resultado:process.exitCode?'fallido':'aprobado',baseTemporalEliminada:!created,limpiezaPendiente:cleanupErrors},null,2));console.log('EVIDENCIA:',evidence);}
    if(!created&&!cleanupErrors.length)console.log('Base de prueba, servidores y archivos temporales eliminados; evidencias conservadas.');
  }
})().catch(error=>{console.error('No se completó la limpieza E2E:',error.code||error.message);process.exitCode=1;});
