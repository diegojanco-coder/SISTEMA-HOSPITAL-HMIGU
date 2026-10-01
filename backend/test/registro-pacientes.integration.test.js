process.env.NODE_ENV = 'test';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomInt } = require('node:crypto');
const { pool } = require('../src/config/db');
const service = require('../src/services/paciente.service');
const tutorService = require('../src/services/tutor.service');
const alertaService = require('../src/services/alerta.service');
const { hashPassword } = require('../src/utils/password.util');
const app = require('../src/app');
const { isoCivil,fechaCivil } = require('../src/utils/calendario.util');

const originalConnection = pool.getConnection.bind(pool);
const originalQuery = pool.query.bind(pool);
const originalAlertas = alertaService.generarAlertasPaciente;
const adulto = {
  nombres: 'Persona', apellidos: 'Temporal', fechaNacimiento: '1990-01-01',
  sexo: 'F', telefonoContacto: '70000000', email: 'persona@example.invalid',
};
const menor = { nombres: 'Menor', apellidos: 'Temporal', fechaNacimiento: '2020-01-01', sexo: 'F' };
const tutor = () => ({
  nombres: 'Tutor', apellidos: 'Temporal', parentesco: 'otro',
  telefono: '70000001', email: 'tutor@example.invalid',
});
function estado(error, status = 422) { return error.status === status; }
after(() => pool.end());

async function isolated(run) {
  const conn = await originalConnection();
  try {
    await conn.beginTransaction();
    pool.query = conn.query.bind(conn);
    pool.getConnection = async () => ({
      query: conn.query.bind(conn),
      beginTransaction: () => conn.query('SAVEPOINT registro_operacion'),
      commit: async () => {},
      rollback: () => conn.query('ROLLBACK TO SAVEPOINT registro_operacion'),
      release: () => {},
    });
    alertaService.generarAlertasPaciente = async () => {};
    await run(conn);
  } finally {
    pool.query = originalQuery;
    pool.getConnection = originalConnection;
    alertaService.generarAlertasPaciente = originalAlertas;
    await conn.rollback();
    conn.release();
  }
}
async function tutorPrincipal(conn, pacienteId) {
  const [[row]] = await conn.query(
    "SELECT t.*,pt.es_principal FROM tutores t JOIN paciente_tutor pt ON pt.tutor_id=t.id WHERE pt.paciente_id=? AND pt.es_principal=1 AND pt.estado='activo'",
    [pacienteId],
  );
  return row;
}

test('menor registra tutor sin documento, descarta contactos propios y devuelve el destinatario', () => isolated(async conn => {
  const p = await service.crear({
    ...menor, tipoPaciente: 'menor', email: 'menor@example.invalid', telefonoContacto: '70000009',
    tutor: tutor(),
  });
  assert.equal(p.email, null);
  assert.equal(p.telefono_contacto, null);
  assert.equal(p.contacto_alertas, 'tutor');
  assert.equal(Boolean(p.registro_pendiente), false);
  const t = await tutorPrincipal(conn, p.id);
  assert.equal(t.carnet_identidad, null);
  assert.equal(p.contacto_principal.origen, 'tutor');
  assert.equal(p.contacto_principal.email, t.email);
  assert.equal(p.contacto_principal.telefono, t.telefono);
  const ficha = await service.obtener(p.id);
  assert.deepEqual(ficha.contacto_principal, p.contacto_principal);
}));

test('dos hermanos reutilizan un tutor sin duplicarlo ni rechazar contactos compartidos', () => isolated(async conn => {
  const [[before]] = await conn.query('SELECT COUNT(*) total FROM tutores');
  const primero = await service.crear({ ...menor, tutor: tutor() });
  const t = await tutorPrincipal(conn, primero.id);
  const segundo = await service.crear({ ...menor, nombres: 'Hermano', tutorId: t.id });
  const [[after]] = await conn.query('SELECT COUNT(*) total FROM tutores');
  const [links] = await conn.query('SELECT paciente_id FROM paciente_tutor WHERE tutor_id=?', [t.id]);
  assert.equal(after.total, before.total + 1);
  assert.equal(links.length, 2);
  assert.notEqual(primero.codigo_paciente, segundo.codigo_paciente);
  assert.equal(segundo.contacto_principal.email, primero.contacto_principal.email);
}));

test('los contactos compartidos no identifican duplicados de pacientes adultos', () => isolated(async () => {
  const primero = await service.crear(adulto);
  const segundo = await service.crear({ ...adulto, nombres: 'Otra persona' });
  assert.notEqual(primero.id, segundo.id);
  assert.equal(primero.email, segundo.email);
  assert.equal(primero.telefono_contacto, segundo.telefono_contacto);
}));

test('cambiar contacto o responsable marca el prerregistro y completarlo exige revisar al paciente',()=>isolated(async conn=>{
 const p=await service.crear({...menor,tutor:tutor()});
 const primero=await tutorPrincipal(conn,p.id);
 await tutorService.actualizar(primero.id,{...tutor(),email:'',guardarPrerregistro:true});
 assert.equal((await service.obtener(p.id)).registro_pendiente,1);
 await tutorService.actualizar(primero.id,tutor());
 assert.equal((await service.obtener(p.id)).registro_pendiente,1);
 await service.actualizar(p.id,{...menor,guardarPrerregistro:false});
 assert.equal((await service.obtener(p.id)).registro_pendiente,0);
 const [otro]=await conn.query("INSERT INTO tutores(nombres,apellidos,parentesco,telefono,email) VALUES ('Otro','Temporal','otro','70000001',NULL)");
 await tutorService.vincularPaciente(otro.insertId,p.id,true);
 assert.equal((await service.obtener(p.id)).registro_pendiente,1);
 assert.equal((await service.obtener(p.id)).contacto_principal.email,null);
}));

test('adulto dependiente elige al responsable y puede cambiar a contacto propio', () => isolated(async conn => {
  const p = await service.crear({
    ...adulto, telefonoContacto: '', email: '', esDependiente: true,
    contactoAlertas: 'tutor', tutor: tutor(),
  });
  assert.equal(p.contacto_alertas, 'tutor');
  assert.equal(p.contacto_principal.email, 'tutor@example.invalid');
  const actualizado = await service.actualizar(p.id, {
    ...adulto, esDependiente: true, contactoAlertas: 'paciente',
  });
  assert.equal(actualizado.contacto_principal.origen, 'paciente');
  assert.equal(actualizado.contacto_principal.email, adulto.email);
  assert.ok(await tutorPrincipal(conn, p.id));
}));

test('adulto dependiente con contacto propio también exige un teléfono del tutor',()=>isolated(async conn=>{
 const [t]=await conn.query("INSERT INTO tutores(nombres,apellidos,parentesco,telefono,email) VALUES ('Tutor','Incompleto','otro','','tutor@example.invalid')");
 await assert.rejects(service.crear({...adulto,esDependiente:true,contactoAlertas:'paciente',tutorId:t.insertId}),estado);
}));

test('seleccionar otro tutor al editar lo convierte en principal sin perder los vínculos', () => isolated(async conn => {
  const p = await service.crear({ ...menor, tutor: tutor() });
  const anterior = await tutorPrincipal(conn, p.id);
  const actualizado = await service.actualizar(p.id, {
    ...menor, tutor: { ...tutor(), nombres: 'Nuevo tutor', email: 'nuevo@example.invalid' },
  });
  const nuevo = await tutorPrincipal(conn, p.id);
  assert.notEqual(nuevo.id, anterior.id);
  const [links] = await conn.query("SELECT es_principal FROM paciente_tutor WHERE paciente_id=? AND estado='activo'", [p.id]);
  assert.equal(links.length, 2);
  assert.equal(links.filter(x => x.es_principal === 1).length, 1);
  assert.equal(actualizado.contacto_principal.email, nuevo.email);
  const restaurado = await service.actualizar(p.id, { ...menor, tutorId: anterior.id });
  assert.equal(restaurado.contacto_principal.email, anterior.email);
  const [[cantidad]] = await conn.query('SELECT COUNT(*) total FROM paciente_tutor WHERE paciente_id=?', [p.id]);
  assert.equal(cantidad.total, 2);
}));

test('prerregistro sin correo es explícito, mantiene teléfono y se puede completar después', () => isolated(async () => {
  await assert.rejects(service.crear({ ...adulto, email: '' }), estado);
  const p = await service.crear({ ...adulto, email: '', guardarPrerregistro: true });
  assert.equal(Boolean(p.registro_pendiente), true);
  assert.equal(p.contacto_principal.email, null);
  assert.equal(p.contacto_principal.telefono, adulto.telefonoContacto);
  const completo = await service.actualizar(p.id, { ...adulto, guardarPrerregistro: false });
  assert.equal(Boolean(completo.registro_pendiente), false);
  assert.equal(completo.contacto_principal.email, adulto.email);
}));

test('prerregistro de menor admite tutor sin correo pero no sin teléfono', () => isolated(async conn => {
  await assert.rejects(service.crear({ ...menor, tutor: { ...tutor(), email: '' } }), estado);
  const p = await service.crear({
    ...menor, guardarPrerregistro: true, tutor: { ...tutor(), email: '' },
  });
  assert.equal(Boolean(p.registro_pendiente), true);
  assert.equal((await tutorPrincipal(conn, p.id)).email, null);
  for (const telefono of ['', '12345', '50000000']) {
    await assert.rejects(service.crear({
      ...menor, guardarPrerregistro: true, tutor: { ...tutor(), email: '', telefono },
    }), estado);
  }
}));

test('identidad provisional genera identificación visible y conserva el código al completar', () => isolated(async () => {
  const p = await service.crear({
    tipoPaciente: 'menor', nombres: '', apellidos: '', fechaNacimiento: isoCivil(fechaCivil(new Date())),
    sexo: 'F', identidadProvisional: true, guardarPrerregistro: true, tutor: tutor(),
  });
  assert.equal(p.nombres, 'Recién nacido');
  assert.ok(p.apellidos);
  assert.equal(Boolean(p.identidad_provisional), true);
  assert.equal(Boolean(p.registro_pendiente), true);
  assert.ok(p.codigo_paciente);
  const completo = await service.actualizar(p.id, {
    nombres: 'Nombre definitivo', apellidos: 'Apellido confirmado',
    fechaNacimiento: p.fecha_nacimiento, sexo: 'F',
    identidadProvisional: false, guardarPrerregistro: false,
  });
  assert.equal(Boolean(completo.identidad_provisional), false);
  assert.equal(Boolean(completo.registro_pendiente), false);
  assert.equal(completo.codigo_paciente, p.codigo_paciente);
  assert.equal(completo.id, p.id);
}));

test('edad y opción deben coincidir y adulto no admite identidad provisional', () => isolated(async () => {
  await assert.rejects(service.crear({ ...adulto, tipoPaciente: 'menor' }), estado);
  await assert.rejects(service.crear({ ...menor, tipoPaciente: 'adulto', tutor: tutor() }), estado);
  await assert.rejects(service.crear({ ...adulto, identidadProvisional: true, guardarPrerregistro: true }), estado);
}));

test('no permite omitir teléfono ni usar correo inválido incluso en prerregistro', () => isolated(async () => {
  for (const telefonoContacto of ['', '12345', '50000000']) {
    await assert.rejects(service.crear({ ...adulto, telefonoContacto, guardarPrerregistro: true }), estado);
  }
  await assert.rejects(service.crear({ ...adulto, email: 'correo-invalido', guardarPrerregistro: true }), estado);
}));

test('un fallo de inserción del paciente revierte también al tutor recién creado', () => isolated(async conn => {
  const [[antes]] = await conn.query('SELECT COUNT(*) total FROM tutores');
  await assert.rejects(service.crear({ ...menor, tutor: tutor(), creadoPor: 4294967295 }));
  const [[despues]] = await conn.query('SELECT COUNT(*) total FROM tutores');
  assert.equal(despues.total, antes.total);
}));

test('HTTP valida las nuevas opciones y devuelve 409 para CI duplicado sin duplicar tutores', () => isolated(async conn => {
  let server;
  const tag = randomBytes(5).toString('hex');
  const password = 'EnsayoRegistro123!';
  const hash = await hashPassword(password);
  await conn.query(
    "INSERT INTO usuarios(nombre_completo,email,username,password_hash,rol) VALUES (?,?,?,?,'enfermero')",
    ['Ensayo registro', 'registro' + tag + '@example.invalid', 'registro' + tag, hash],
  );
  try {
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const url = 'http://127.0.0.1:' + server.address().port + '/api/v1';
    const login = await fetch(url + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'registro' + tag, password }),
    });
    assert.equal(login.status, 200);
    await login.json();
    const cookie = login.headers.get('set-cookie').split(';')[0];
    async function post(body, expected) {
      const response = await fetch(url + '/pacientes', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      assert.equal(response.status, expected, JSON.stringify(json));
      return json.data;
    }
    for (const body of [
      { ...adulto, tipoPaciente: 'invalido' },
      { ...adulto, tipoPaciente: 'menor' },
      { ...adulto, identidadProvisional: 'true' },
      { ...adulto, guardarPrerregistro: 'true' },
      { ...adulto, contactoAlertas: 'otro' },
      { ...adulto, telefonoContacto: '' },
      { ...adulto, email: '' },
    ]) await post(body, 422);
    const provisional = await post({
      fechaNacimiento: isoCivil(fechaCivil(new Date())), sexo: 'F',
      tipoPaciente: 'menor', identidadProvisional: true, guardarPrerregistro: true,
      tutor: { ...tutor(), email: '' },
    }, 201);
    assert.equal(Boolean(provisional.registro_pendiente), true);
    assert.equal(provisional.contacto_principal.origen, 'tutor');
    let ci;
    do {
      ci = String(randomInt(10000000, 99999999));
    } while ((await conn.query('SELECT id FROM pacientes WHERE carnet_identidad=?', [ci]))[0].length);
    const p = await post({ ...adulto, carnetIdentidad: ci }, 201);
    assert.equal(p.contacto_principal.origen, 'paciente');
    const [[antes]] = await conn.query('SELECT COUNT(*) total FROM tutores');
    await post({ ...menor, carnetIdentidad: ci, tutor: tutor() }, 409);
    const [[despues]] = await conn.query('SELECT COUNT(*) total FROM tutores');
    assert.equal(despues.total, antes.total);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
  }
}));
