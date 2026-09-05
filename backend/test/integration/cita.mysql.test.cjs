const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { load } = require('../helpers/load.cjs');

// Only run against the disposable CI database. Never initialize a normal database.
if (process.env.NODE_ENV !== 'test' || process.env.DB_NAME !== 'vacunacion_hmgu_test') {
  throw new Error('Integration tests require NODE_ENV=test and DB_NAME=vacunacion_hmgu_test');
}
const { pool } = require('../../src/config/db');
const { generarToken } = require('../../src/utils/jwt.util');
let server, url, alertFailure;
const service = load('services/cita.service.js', {
  './alerta.service': { async generarAlertasPaciente() { if (alertFailure) throw new Error('simulated alert failure'); } },
});
const controller = load('controllers/cita.controller.js', { '../services/cita.service': service });
const route = load('routes/cita.routes.js', {
  '../controllers/cita.controller': controller,
  '../middlewares/audit.middleware': () => (req, res, next) => next(),
});
const token = generarToken({ id: 1, rol: 'administrador', nombre_completo: 'Test' });
function payload(patient = 1, doses = [1]) {
  return { pacienteId: patient, dosisAplicadas: doses.map(dosisId => ({ dosisId, loteVacunaId: 1, fechaAplicacion: '2026-01-01' })) };
}
async function post(body, bearer = token) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}) }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
async function counts() {
  const [[r]] = await pool.query('SELECT (SELECT COUNT(*) FROM citas) citas, (SELECT COUNT(*) FROM historial_vacunacion) aplicaciones, (SELECT cantidad_disponible FROM lotes_vacuna WHERE id=1) stock');
  return r;
}
before(async () => {
  // Use the real table definitions, excluding database creation/deletion directives.
  const schema = fs.readFileSync(path.join(__dirname, '../../src/database/schema.sql'), 'utf8');
  const tables = schema.slice(schema.indexOf('SET NAMES utf8mb4;'));
  assert.ok(tables.startsWith('SET NAMES'));
  for (const statement of tables.replace(/^\s*--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean)) await pool.query(statement);
  const app = express();
  app.use(express.json());
  app.use('/citas', route);
  app.use(require('../../src/middlewares/error.middleware').errorMiddleware);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  url = 'http://127.0.0.1:' + server.address().port + '/citas';
});
beforeEach(async () => {
  alertFailure = false;
  for (const table of ['historial_vacunacion', 'citas', 'lotes_vacuna', 'dosis', 'vacunas', 'pacientes', 'usuarios']) await pool.query('DELETE FROM ' + table);
  await pool.query("INSERT INTO usuarios (id,nombre_completo,email,username,password_hash,rol) VALUES (1,'Test','test@example.invalid','test','unused','administrador')");
  await pool.query("INSERT INTO pacientes (id,codigo_paciente,nombres,apellidos,fecha_nacimiento,sexo) VALUES (1,'TEST1','Uno','Prueba','2000-01-01','F'),(2,'TEST2','Dos','Prueba','2000-01-01','M')");
  await pool.query("INSERT INTO vacunas (id,nombre,nombre_corto) VALUES (1,'Vacuna Test','TEST')");
  await pool.query("INSERT INTO dosis (id,vacuna_id,numero_dosis,nombre_dosis,edad_recomendada_dias) VALUES (1,1,1,'Primera',0),(2,1,2,'Segunda',30)");
  await pool.query("INSERT INTO lotes_vacuna (id,vacuna_id,numero_lote,fecha_vencimiento,cantidad_disponible) VALUES (1,1,'TEST',DATE_ADD(CURDATE(), INTERVAL 1 YEAR),1)");
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await pool.end();
});
test('HTTP 201 retains committed data and warns when alerts fail', async () => {
  alertFailure = true;
  const r = await post(payload());
  assert.equal(r.status, 201);
  assert.equal(r.body.success, true);
  assert.equal(r.body.data.advertencias[0].codigo, 'ALERTAS_NO_ACTUALIZADAS');
  assert.deepEqual(await counts(), { citas: 1, aplicaciones: 1, stock: 0 });
});
test('HTTP rejects unauthenticated, forbidden and invalid requests without writes', async () => {
  assert.equal((await post(payload(), null)).status, 401);
  assert.equal((await post(payload(), 'invalid')).status, 401);
  const nurse = generarToken({ id: 1, rol: 'enfermero' });
  assert.equal((await post(payload(), nurse)).status, 403);
  assert.equal((await post({ pacienteId: 1, dosisAplicadas: [] })).status, 422);
  assert.deepEqual(await counts(), { citas: 0, aplicaciones: 0, stock: 1 });
});
test('real MySQL rolls back the first dose when stock runs out on the second', async () => {
  assert.equal((await post(payload(1, [1, 2]))).status, 409);
  assert.deepEqual(await counts(), { citas: 0, aplicaciones: 0, stock: 1 });
});
test('concurrent patients cannot consume the same final unit of stock', async () => {
  const results = await Promise.all([post(payload(1)), post(payload(2))]);
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  assert.deepEqual(await counts(), { citas: 1, aplicaciones: 1, stock: 0 });
});
test('concurrent duplicate doses are registered only once', async () => {
  await pool.query('UPDATE lotes_vacuna SET cantidad_disponible=2 WHERE id=1');
  const results = await Promise.all([post(payload()), post(payload())]);
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  assert.deepEqual(await counts(), { citas: 1, aplicaciones: 1, stock: 1 });
});
