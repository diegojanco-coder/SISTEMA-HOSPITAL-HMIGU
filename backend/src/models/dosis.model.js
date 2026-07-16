const { pool } = require('../config/db');

async function findByVacunaId(vacunaId) {
  const [rows] = await pool.query(
    "SELECT * FROM dosis WHERE vacuna_id = ? AND estado = 'activo' ORDER BY numero_dosis ASC",
    [vacunaId]
  );
  return rows;
}

async function findAllConVacuna() {
  const [rows] = await pool.query(
    `SELECT d.*, v.nombre AS vacuna_nombre, v.nombre_corto AS vacuna_nombre_corto
     FROM dosis d INNER JOIN vacunas v ON v.id = d.vacuna_id
     WHERE d.estado = 'activo' AND v.estado = 'activo'
     ORDER BY v.nombre, d.numero_dosis`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM dosis WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create(vacunaId, data) {
  const [result] = await pool.query(
    `INSERT INTO dosis (vacuna_id, numero_dosis, nombre_dosis, edad_recomendada_dias, tolerancia_dias, intervalo_minimo_dias)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [vacunaId, data.numeroDosis, data.nombreDosis, data.edadRecomendadaDias,
     data.toleranciaDias ?? 30, data.intervaloMinimoDias ?? 0]
  );
  return findById(result.insertId);
}

async function update(id, data) {
  await pool.query(
    `UPDATE dosis SET nombre_dosis = ?, edad_recomendada_dias = ?, tolerancia_dias = ?,
       intervalo_minimo_dias = ?, estado = ? WHERE id = ?`,
    [data.nombreDosis, data.edadRecomendadaDias, data.toleranciaDias ?? 30,
     data.intervaloMinimoDias ?? 0, data.estado || 'activo', id]
  );
  return findById(id);
}

async function eliminar(id) {
  await pool.query("UPDATE dosis SET estado = 'inactivo' WHERE id = ?", [id]);
}

module.exports = { findByVacunaId, findAllConVacuna, findById, create, update, eliminar };
