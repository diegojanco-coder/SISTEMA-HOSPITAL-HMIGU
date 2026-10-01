const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const mysql = require('mysql2/promise');
const { db, backup } = require('../config/env');

const connectionOptions = { host: db.host, port: db.port, user: db.user, password: db.password, dateStrings: true };
const quote = mysql.escapeId;

class BackupVerificationError extends Error {
  constructor(phase, code = 'VERIFICACION_FALLIDA') {
    super(`No se verificó el respaldo. Etapa: ${phase}. Código: ${code}.`);
    this.code = code;
  }
}

// Se inspecciona la estructura, nunca se imprimen registros del paciente.
async function inspectSchema(connection, database) {
  const [metadata] = await connection.query(`SELECT TABLE_NAME tabla, COLUMN_NAME columna
    FROM information_schema.columns
    WHERE table_schema='information_schema'
      AND ((table_name='STATISTICS' AND column_name IN ('IS_VISIBLE','EXPRESSION'))
        OR (table_name='TABLE_CONSTRAINTS' AND column_name='ENFORCED'))`);
  const hasColumn = (table, column) => metadata.some(item => item.tabla === table && item.columna === column);
  const indexVisibility = hasColumn('STATISTICS', 'IS_VISIBLE') ? 'IS_VISIBLE' : 'NULL';
  const indexExpression = hasColumn('STATISTICS', 'EXPRESSION') ? 'EXPRESSION' : 'NULL';
  const checkEnforced = hasColumn('TABLE_CONSTRAINTS', 'ENFORCED') ? 'tc.ENFORCED' : 'NULL';
  const [tables] = await connection.query('SELECT TABLE_NAME nombre, TABLE_TYPE tipo, ENGINE motor, TABLE_COLLATION collation FROM information_schema.tables WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME', [database]);
  if (!tables.length || tables.some(t => t.tipo !== 'BASE TABLE')) throw new BackupVerificationError('estructura', 'SOLO_TABLAS');
  const [columns] = await connection.query('SELECT TABLE_NAME tabla, COLUMN_NAME columna, COLUMN_TYPE tipo, IS_NULLABLE nullable, COLUMN_DEFAULT valorInicial, EXTRA extra, COLLATION_NAME collation, GENERATION_EXPRESSION expresion FROM information_schema.columns WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME, ORDINAL_POSITION', [database]);
  const [keys] = await connection.query('SELECT TABLE_NAME tabla, CONSTRAINT_NAME nombre, COLUMN_NAME columna, REFERENCED_TABLE_NAME referencia, REFERENCED_COLUMN_NAME destino, ORDINAL_POSITION posicion FROM information_schema.key_column_usage WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION', [database]);
  const [indexes] = await connection.query(`SELECT TABLE_NAME tabla, INDEX_NAME nombre, NON_UNIQUE noUnico, SEQ_IN_INDEX posicion, COLUMN_NAME columna, SUB_PART prefijo, INDEX_TYPE tipo, COLLATION orden, ${indexVisibility} visible, ${indexExpression} expresion FROM information_schema.statistics WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`, [database]);
  const [relations] = await connection.query('SELECT TABLE_NAME tabla, CONSTRAINT_NAME nombre, UPDATE_RULE alActualizar, DELETE_RULE alEliminar FROM information_schema.referential_constraints WHERE CONSTRAINT_SCHEMA=? ORDER BY TABLE_NAME, CONSTRAINT_NAME', [database]);
  const [checks] = await connection.query(`SELECT tc.TABLE_NAME tabla, tc.CONSTRAINT_NAME nombre, cc.CHECK_CLAUSE condicion, ${checkEnforced} aplicada
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON cc.CONSTRAINT_SCHEMA=tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME=tc.CONSTRAINT_NAME
    WHERE tc.TABLE_SCHEMA=? AND tc.CONSTRAINT_TYPE='CHECK' ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_NAME`, [database]);
  return { tables: tables.map(t => t.nombre), storage: tables, columns, keys, indexes, relations, checks };
}

async function openBackup(file, directory) {
  const root = await fs.realpath(directory);
  const stat = await fs.lstat(file);
  const real = await fs.realpath(file);
  const relative = path.relative(root, real);
  if (!stat.isFile() || stat.isSymbolicLink() || !relative || relative.startsWith('..') || path.isAbsolute(relative) || path.extname(real) !== '.sql') {
    throw new BackupVerificationError('archivo', 'ARCHIVO_NO_ADMITIDO');
  }
  const handle = await fs.open(real, 'r');
  try {
    const size = (await handle.stat()).size;
    const header = Buffer.alloc(128), footer = Buffer.alloc(Math.min(512, size));
    await handle.read(header, 0, header.length, 0);
    await handle.read(footer, 0, footer.length, size - footer.length);
    if (!header.toString('utf8').startsWith('-- MySQL dump ') || !/\n-- Dump completed on [^\r\n]+\s*$/.test(footer.toString('utf8'))) {
      throw new BackupVerificationError('archivo', 'RESPALDO_INCOMPLETO');
    }
    return handle;
  } catch (error) { await handle.close(); throw error; }
}

async function importBackup(handle, database, user, password, timeoutMs) {
  const digest = createHash('sha256');
  const child = spawn(backup.mysqlPath, [
    '--no-defaults', '--protocol=TCP', `--host=${db.host}`, `--port=${db.port}`,
    `--user=${user}`, `--database=${database}`, '--batch', '--binary-mode',
    '--local-infile=0', '--skip-reconnect', '--default-character-set=utf8mb4', '--connect-timeout=10'
  ], { windowsHide: true, env: { ...process.env, MYSQL_PWD: password }, stdio: ['pipe', 'ignore', 'pipe'] });
  // MySQL puede incluir valores de una sentencia fallida en stderr; no se divulgan.
  child.stderr.resume();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
  const completion = new Promise((resolve, reject) => {
    child.once('error', () => reject(new BackupVerificationError('cliente mysql', 'CLIENTE_NO_DISPONIBLE')));
    child.once('close', code => code === 0 && !timedOut ? resolve() : reject(new BackupVerificationError('restauración', timedOut ? 'TIEMPO_AGOTADO' : 'SQL_RECHAZADO')));
  });
  const hashing = new Transform({ transform(chunk, _encoding, callback) { digest.update(chunk); callback(null, chunk); } });
  try {
    const output = pipeline(handle.createReadStream({ start: 0, autoClose: false }), hashing, child.stdin)
      .catch(() => { child.kill(); throw new BackupVerificationError('lectura', 'LECTURA_INTERRUMPIDA'); });
    const results = await Promise.allSettled([completion, output]);
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
    return digest.digest('hex');
  } finally { clearTimeout(timer); }
}

async function checkRelations(connection, database, keys) {
  const groups = new Map();
  for (const key of keys) {
    const name = `${key.tabla}\0${key.nombre}`;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(key);
  }
  for (const group of groups.values()) {
    const key = group[0];
    const matches = group.map(k => `c.${quote(k.columna)}=p.${quote(k.destino)}`).join(' AND ');
    const present = group.map(k => `c.${quote(k.columna)} IS NOT NULL`).join(' AND ');
    const [[row]] = await connection.query(`SELECT COUNT(*) total FROM ${quote(database)}.${quote(key.tabla)} c LEFT JOIN ${quote(database)}.${quote(key.referencia)} p ON ${matches} WHERE ${present} AND p.${quote(key.destino)} IS NULL`);
    if (Number(row.total)) throw new BackupVerificationError('integridad', 'REFERENCIAS_HUERFANAS');
  }
  return groups.size;
}

async function checkHistoryOrigins(connection, database, schema) {
  const columns = schema.columns.filter(column => column.tabla === 'historial_vacunacion').map(column => column.columna);
  // Los respaldos previos a los antecedentes externos conservan su formato anterior.
  if (!columns.includes('origen') && !columns.includes('documento_referencia')) return;
  if (['origen', 'documento_referencia', 'cita_id', 'lote_vacuna_id', 'establecimiento'].some(column => !columns.includes(column))) {
    throw new BackupVerificationError('estructura', 'HISTORIAL_INCOMPLETO');
  }
  // Las FK admiten NULL y no garantizan estas combinaciones de procedencia.
  const [[row]] = await connection.query(`SELECT COUNT(*) total FROM ${quote(database)}.historial_vacunacion
    WHERE origen IS NULL OR origen NOT IN ('local','externo')
      OR (origen='local' AND (cita_id IS NULL OR lote_vacuna_id IS NULL OR documento_referencia IS NOT NULL))
      OR (origen='externo' AND (cita_id IS NOT NULL OR lote_vacuna_id IS NOT NULL
        OR documento_referencia IS NULL OR CHAR_LENGTH(TRIM(documento_referencia))=0
        OR establecimiento IS NULL OR CHAR_LENGTH(TRIM(establecimiento))=0))`);
  if (Number(row.total)) throw new BackupVerificationError('integridad', 'ORIGEN_HISTORIAL_INVALIDO');
}

async function verifyBackup({ file, directory = backup.dir, expectedSchema, timeoutMs = 120000 }) {
  const handle = await openBackup(file, directory);
  // Sin comodines en el nombre: GRANT se limita exactamente a este esquema.
  const temporary = `hmguverify${randomBytes(12).toString('hex')}`;
  const user = `hmguverify${randomBytes(8).toString('hex')}`;
  const password = randomBytes(32).toString('base64url');
  if (!/^hmguverify[a-f0-9]{24}$/.test(temporary) || temporary === db.database) {
    await handle.close(); throw new BackupVerificationError('aislamiento');
  }
  let admin, createdDatabase = false, createdUser = false, result, failure;
  try {
    admin = await mysql.createConnection(connectionOptions);
    await admin.query(`CREATE DATABASE ${quote(temporary)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    createdDatabase = true; // No borrar una base preexistente si CREATE falla.
    await admin.query('CREATE USER ?@\'%\' IDENTIFIED BY ?', [user, password]);
    createdUser = true;
    await admin.query(`GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, LOCK TABLES ON ${quote(temporary)}.* TO ?@'%'`, [user]);
    const sha256 = await importBackup(handle, temporary, user, password, timeoutMs);
    const schema = await inspectSchema(admin, temporary);
    if (expectedSchema && JSON.stringify(schema) !== JSON.stringify(expectedSchema)) throw new BackupVerificationError('estructura', 'ESTRUCTURA_DIFERENTE');
    let rows = 0;
    for (const table of schema.tables) {
      const [checks] = await admin.query(`CHECK TABLE ${quote(temporary)}.${quote(table)}`);
      if (!checks.some(check => check.Msg_type === 'status' && check.Msg_text === 'OK') || checks.some(check => check.Msg_type === 'error')) throw new BackupVerificationError('tablas', 'TABLA_INVALIDA');
      const [[count]] = await admin.query(`SELECT COUNT(*) total FROM ${quote(temporary)}.${quote(table)}`);
      rows += Number(count.total);
    }
    const relations = await checkRelations(admin, temporary, schema.keys);
    await checkHistoryOrigins(admin, temporary, schema);
    result = { archivo: path.basename(file), sha256, tablas: schema.tables.length, registros: rows, relaciones: relations, verificadoEl: new Date().toISOString() };
  } catch (error) {
    failure = error instanceof BackupVerificationError ? error : new BackupVerificationError('MySQL', /^ER_[A-Z_]+$/.test(error.code || '') ? error.code : 'CONEXION_O_PERMISOS');
  } finally {
    // Intentar todas las limpiezas aunque una falle.
    const cleanupErrors = [];
    try { await handle.close(); } catch { cleanupErrors.push('archivo'); }
    if (admin && createdUser) {
      try { await admin.query('DROP USER ?@\'%\'', [user]); } catch { cleanupErrors.push(`usuario ${user}`); }
    }
    if (admin && createdDatabase) {
      try { await admin.query(`DROP DATABASE ${quote(temporary)}`); } catch { cleanupErrors.push(`base ${temporary}`); }
    }
    if (admin) {
      try { await admin.end(); } catch { cleanupErrors.push('conexión'); }
    }
    if (cleanupErrors.length) failure = new BackupVerificationError(`limpieza pendiente: ${cleanupErrors.join(', ')}`, 'LIMPIEZA_PENDIENTE');
  }
  if (failure) throw failure;
  return { ...result, temporalesEliminados: true };
}

module.exports = { verifyBackup, inspectSchema, BackupVerificationError };
