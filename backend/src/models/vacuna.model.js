const { pool } = require('../config/db');

async function findAll({ soloActivas = false } = {}) {
  let sql = 'SELECT * FROM vacunas';
  const params = [];
  if (soloActivas) {
    sql += " WHERE estado = 'activo'";
  }
  sql += ' ORDER BY nombre ASC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM vacunas WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create(data) {
  const [result] = await pool.query(
    `INSERT INTO vacunas (nombre, nombre_corto, descripcion, enfermedad_previene, via_administracion)
     VALUES (?, ?, ?, ?, ?)`,
    [data.nombre, data.nombreCorto, data.descripcion || null, data.enfermedadPrevine || null,
     data.viaAdministracion || 'intramuscular']
  );
  return findById(result.insertId);
}

async function update(id, data) {
  await pool.query(
    `UPDATE vacunas SET nombre = ?, nombre_corto = ?, descripcion = ?, enfermedad_previene = ?,
       via_administracion = ?, estado = ? WHERE id = ?`,
    [data.nombre, data.nombreCorto, data.descripcion || null, data.enfermedadPrevine || null,
     data.viaAdministracion || 'intramuscular', data.estado || 'activo', id]
  );
  return findById(id);
}

async function desactivar(id) {
  await pool.query("UPDATE vacunas SET estado = 'inactivo' WHERE id = ?", [id]);
}

module.exports = { findAll, findById, create, update, desactivar };
