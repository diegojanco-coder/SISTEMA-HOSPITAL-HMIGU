const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const mysql = require('mysql2/promise');
const { db } = require('../src/config/env');
const { runBackup } = require('../src/services/backup.service');
const { verifyBackup, inspectSchema } = require('../src/services/backupVerification.service');

let c, directory, source, created = false, file, schema, initialTemporary;
async function temporaryObjects() {
  const [databases] = await c.query("SELECT SCHEMA_NAME n FROM information_schema.schemata WHERE SCHEMA_NAME REGEXP '^hmguverify[0-9a-f]{24}$' ORDER BY SCHEMA_NAME");
  const [users] = await c.query("SELECT User n, Host h FROM mysql.user WHERE User REGEXP '^hmguverify[0-9a-f]{16}$' ORDER BY User, Host");
  return { databases, users };
}
async function assertUntouched() {
  assert.deepEqual(await temporaryObjects(), initialTemporary);
  const [[row]] = await c.query(`SELECT texto, valor, fecha FROM ${mysql.escapeId(source)}.padres WHERE id=1`);
  assert.equal(row.texto, "Texto ficticio: niño, ñ y 'comillas' 🏥");
  assert.deepEqual(row.valor, { prueba: true, dosis: 2 });
  assert.equal(row.fecha, '2024-02-29');
  const [[count]] = await c.query(`SELECT COUNT(*) total FROM ${mysql.escapeId(source)}.hijos`);
  assert.equal(count.total, 2);
  const [history] = await c.query(`SELECT origen, cita_id, lote_vacuna_id, documento_referencia, establecimiento FROM ${mysql.escapeId(source)}.historial_vacunacion ORDER BY id`);
  assert.deepEqual(history.map(row => ({ ...row })), [
    { origen: 'local', cita_id: 1, lote_vacuna_id: 1, documento_referencia: null, establecimiento: 'Hospital ficticio' },
    { origen: 'externo', cita_id: null, lote_vacuna_id: null, documento_referencia: 'Carnet ficticio 001', establecimiento: 'Centro ficticio' }
  ]);
}
before(async () => {
  c = await mysql.createConnection({ host: db.host, port: db.port, user: db.user, password: db.password, dateStrings: true });
  initialTemporary = await temporaryObjects();
  source = 'hmguverifyfixture' + randomBytes(8).toString('hex');
  assert.match(source, /^hmguverifyfixture[a-f0-9]{16}$/);
  assert.notEqual(source, db.database);
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'hmgu-backup-test-'));
  await c.query(`CREATE DATABASE ${mysql.escapeId(source)} CHARACTER SET utf8mb4`);
  created = true;
  await c.query(`CREATE TABLE ${mysql.escapeId(source)}.padres (id INT PRIMARY KEY, texto VARCHAR(150) UNIQUE, valor JSON, fecha DATE) ENGINE=InnoDB`);
  await c.query(`CREATE TABLE ${mysql.escapeId(source)}.hijos (id INT PRIMARY KEY, padre INT NULL, CONSTRAINT fk_padre FOREIGN KEY (padre) REFERENCES ${mysql.escapeId(source)}.padres(id)) ENGINE=InnoDB`);
  await c.query(`INSERT INTO ${mysql.escapeId(source)}.padres VALUES (1,?,?,?)`, ["Texto ficticio: niño, ñ y 'comillas' 🏥", JSON.stringify({ prueba: true, dosis: 2 }), '2024-02-29']);
  await c.query(`INSERT INTO ${mysql.escapeId(source)}.hijos VALUES (1,1),(2,NULL)`);
  await c.query(`CREATE TABLE ${mysql.escapeId(source)}.historial_vacunacion (
    id INT PRIMARY KEY, origen ENUM('local','externo') NOT NULL DEFAULT 'local',
    documento_referencia VARCHAR(200) NULL, cita_id INT NULL, lote_vacuna_id INT NULL, establecimiento VARCHAR(150) NOT NULL,
    CONSTRAINT fk_historial_cita FOREIGN KEY (cita_id) REFERENCES ${mysql.escapeId(source)}.padres(id) ON UPDATE CASCADE,
    CONSTRAINT fk_historial_lote FOREIGN KEY (lote_vacuna_id) REFERENCES ${mysql.escapeId(source)}.padres(id) ON UPDATE CASCADE,
    CONSTRAINT ck_historial_documento CHECK ((origen='local' AND documento_referencia IS NULL)
      OR (origen='externo' AND documento_referencia IS NOT NULL AND CHAR_LENGTH(TRIM(documento_referencia))>0))
  ) ENGINE=InnoDB`);
  await c.query(`INSERT INTO ${mysql.escapeId(source)}.historial_vacunacion VALUES
    (1,'local',NULL,1,1,'Hospital ficticio'), (2,'externo','Carnet ficticio 001',NULL,NULL,'Centro ficticio')`);
  schema = await inspectSchema(c, source);
  file = await runBackup({ database: source, dir: directory });
});
after(async () => {
  if (c) {
    try { if (created) await c.query(`DROP DATABASE ${mysql.escapeId(source)}`); } finally { await c.end(); }
  }
  if (directory) {
    // Borrar exclusivamente archivos conocidos en el directorio creado por esta prueba.
    for (const name of await fs.readdir(directory)) await fs.unlink(path.join(directory, name));
    await fs.rmdir(directory);
  }
});

test('recupera el SQL generado por runBackup y conserva estructura, filas y relaciones', async () => {
  const result = await verifyBackup({ file: file.ruta, directory, expectedSchema: schema });
  assert.equal(result.tablas, 3);
  assert.equal(result.registros, 5);
  assert.equal(result.relaciones, 3);
  assert.equal(result.temporalesEliminados, true);
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
  await assertUntouched();
});

test('rechaza un respaldo truncado y la extensión partial sin crear recursos MySQL', async () => {
  const broken = path.join(directory, 'truncado.sql');
  await fs.writeFile(broken, '-- MySQL dump 10.13\nCREATE TABLE incompleta (id INT);');
  await assert.rejects(verifyBackup({ file: broken, directory }), { code: 'RESPALDO_INCOMPLETO' });
  const partial = file.ruta + '.partial';
  await fs.copyFile(file.ruta, partial);
  await assert.rejects(verifyBackup({ file: partial, directory }), { code: 'ARCHIVO_NO_ADMITIDO' });
  await assertUntouched();
});

test('la cuenta aislada rechaza cambios en la base de origen y limpia tras el error', async () => {
  const injected = path.join(directory, 'escape.sql');
  await fs.writeFile(injected, `-- MySQL dump 10.13\nDELETE FROM ${mysql.escapeId(source)}.padres;\n-- Dump completed on 2026-01-01\n`);
  await assert.rejects(verifyBackup({ file: injected, directory }), { code: 'SQL_RECHAZADO' });
  await assertUntouched();
});

test('detecta referencias huérfanas restauradas con comprobación de claves desactivada', async () => {
  const broken = path.join(directory, 'huerfano.sql');
  const content = await fs.readFile(file.ruta, 'utf8');
  await fs.writeFile(broken, content.replace(/\n-- Dump completed on/, '\nSET FOREIGN_KEY_CHECKS=0; INSERT INTO hijos VALUES (3,999);\n-- Dump completed on'));
  await assert.rejects(verifyBackup({ file: broken, directory, expectedSchema: schema }), { code: 'REFERENCIAS_HUERFANAS' });
  await assertUntouched();
});

test('detiene una importación que excede el plazo y elimina base y cuenta temporal', async () => {
  const slow = path.join(directory, 'lento.sql');
  await fs.writeFile(slow, '-- MySQL dump 10.13\nSELECT SLEEP(5);\n-- Dump completed on 2026-01-01\n');
  await assert.rejects(verifyBackup({ file: slow, directory, timeoutMs: 200 }), { code: 'TIEMPO_AGOTADO' });
  await assertUntouched();
});


test('rechaza la pérdida de una clave única o un cambio de regla referencial', async () => {
  const content = await fs.readFile(file.ruta, 'utf8');
  for (const [name, statement] of [
    ['sin-unico.sql', 'ALTER TABLE padres DROP INDEX texto;'],
    ['fk-modificada.sql', 'ALTER TABLE hijos DROP FOREIGN KEY fk_padre; ALTER TABLE hijos ADD CONSTRAINT fk_padre FOREIGN KEY (padre) REFERENCES padres(id) ON DELETE CASCADE;']
  ]) {
    const altered = path.join(directory, name);
    await fs.writeFile(altered, content.replace(/\n-- Dump completed on/, `\n${statement}\n-- Dump completed on`));
    await assert.rejects(verifyBackup({ file: altered, directory, expectedSchema: schema }), { code: 'ESTRUCTURA_DIFERENTE' });
    await assertUntouched();
  }
});

test('rechaza la pérdida, desactivación o modificación de un CHECK en la estructura restaurada', async () => {
  const check = schema.checks.find(item => item.nombre === 'ck_historial_documento');
  assert.equal(check.aplicada, 'YES');
  assert.match(check.condicion, /documento_referencia/);
  const content = await fs.readFile(file.ruta, 'utf8');
  for (const [name, statement] of [
    ['sin-check.sql', 'ALTER TABLE historial_vacunacion DROP CHECK ck_historial_documento;'],
    ['check-desactivado.sql', 'ALTER TABLE historial_vacunacion ALTER CHECK ck_historial_documento NOT ENFORCED;'],
    ['check-modificado.sql', "ALTER TABLE historial_vacunacion DROP CHECK ck_historial_documento; ALTER TABLE historial_vacunacion ADD CONSTRAINT ck_historial_documento CHECK (origen IN ('local','externo'));"]
  ]) {
    const altered = path.join(directory, name);
    await fs.writeFile(altered, content.replace(/\n-- Dump completed on/, `\n${statement}\n-- Dump completed on`));
    await assert.rejects(verifyBackup({ file: altered, directory, expectedSchema: schema }), { code: 'ESTRUCTURA_DIFERENTE' });
    await assertUntouched();
  }
});

test('rechaza un origen contradictorio aun con claves válidas y sin comparar una estructura de referencia', async () => {
  const content = await fs.readFile(file.ruta, 'utf8');
  for (const [name, statement] of [
    ['externo-cita.sql', 'UPDATE historial_vacunacion SET cita_id=1 WHERE id=2;'],
    ['externo-lote.sql', 'UPDATE historial_vacunacion SET lote_vacuna_id=1 WHERE id=2;'],
    ['local-sin-cita.sql', 'UPDATE historial_vacunacion SET cita_id=NULL WHERE id=1;'],
    ['local-sin-lote.sql', 'UPDATE historial_vacunacion SET lote_vacuna_id=NULL WHERE id=1;'],
    ['externo-sin-centro.sql', "UPDATE historial_vacunacion SET establecimiento='   ' WHERE id=2;"],
    ['externo-sin-documento.sql', 'ALTER TABLE historial_vacunacion ALTER CHECK ck_historial_documento NOT ENFORCED; UPDATE historial_vacunacion SET documento_referencia=NULL WHERE id=2;'],
    ['externo-documento-vacio.sql', "ALTER TABLE historial_vacunacion ALTER CHECK ck_historial_documento NOT ENFORCED; UPDATE historial_vacunacion SET documento_referencia='   ' WHERE id=2;"],
    ['local-documento.sql', "ALTER TABLE historial_vacunacion ALTER CHECK ck_historial_documento NOT ENFORCED; UPDATE historial_vacunacion SET documento_referencia='Documento ficticio' WHERE id=1;"]
  ]) {
    const altered = path.join(directory, name);
    await fs.writeFile(altered, content.replace(/\n-- Dump completed on/, `\n${statement}\n-- Dump completed on`));
    await assert.rejects(verifyBackup({ file: altered, directory }), { code: 'ORIGEN_HISTORIAL_INVALIDO' });
    await assertUntouched();
  }
});

test('acepta el formato anterior de historial y rechaza una migración incompleta', async () => {
  const previous = path.join(directory, 'historial-anterior.sql');
  await fs.writeFile(previous, '-- MySQL dump 10.13\nCREATE TABLE historial_vacunacion (id INT PRIMARY KEY, cita_id INT NOT NULL, lote_vacuna_id INT NOT NULL); INSERT INTO historial_vacunacion VALUES (1,1,1);\n-- Dump completed on 2026-01-01\n');
  const result = await verifyBackup({ file: previous, directory });
  assert.equal(result.registros, 1);
  assert.equal(result.temporalesEliminados, true);
  const partial = path.join(directory, 'historial-migracion-incompleta.sql');
  await fs.writeFile(partial, '-- MySQL dump 10.13\nCREATE TABLE historial_vacunacion (id INT PRIMARY KEY, origen VARCHAR(20));\n-- Dump completed on 2026-01-01\n');
  await assert.rejects(verifyBackup({ file: partial, directory }), { code: 'HISTORIAL_INCOMPLETO' });
  await assertUntouched();
});
