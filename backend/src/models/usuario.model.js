const { pool } = require('../config/db');

const CAMPOS_PUBLICOS = 'id, nombre_completo, email, username, rol, estado, ultimo_login, created_at, updated_at';

async function findAll({ estado } = {}) {
  let sql = `SELECT ${CAMPOS_PUBLICOS} FROM usuarios`;
  const params = [];
  if (estado) {
    sql += ' WHERE estado = ?';
    params.push(estado);
  }
  sql += ' ORDER BY nombre_completo ASC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function findByLogin(loginValue) {
  // Solo permite iniciar sesión con username (no con email)
  const [rows] = await pool.query(
    'SELECT * FROM usuarios WHERE username = ? LIMIT 1',
    [loginValue]
  );
  return rows[0] || null;
}

async function create({ nombreCompleto, email, username, passwordHash, rol }) {
  const [result] = await pool.query(
    `INSERT INTO usuarios (nombre_completo, email, username, password_hash, rol)
     VALUES (?, ?, ?, ?, ?)`,
    [nombreCompleto, email, username, passwordHash, rol]
  );
  return findById(result.insertId);
}

async function update(id, { nombreCompleto, email, username, rol, estado }) {
  await pool.query(
    `UPDATE usuarios SET nombre_completo = ?, email = ?, username = ?, rol = ?, estado = ?
     WHERE id = ?`,
    [nombreCompleto, email, username, rol, estado, id]
  );
  return findById(id);
}

async function updatePassword(id, passwordHash) {
  await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [passwordHash, id]);
}

async function marcarLogin(id) {
  await pool.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [id]);
}

async function desactivar(id) {
  await pool.query("UPDATE usuarios SET estado = 'inactivo' WHERE id = ?", [id]);
  return findById(id);
}

module.exports = {
  findAll, findById, findByLogin, create, update, updatePassword, marcarLogin, desactivar
};
