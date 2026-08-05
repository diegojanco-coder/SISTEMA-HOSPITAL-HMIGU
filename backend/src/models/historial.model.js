const { pool } = require('../config/db');

async function findByPacienteId(pacienteId) {
  const [rows] = await pool.query(
    `SELECT h.*, d.nombre_dosis, d.numero_dosis, v.nombre AS vacuna_nombre, v.nombre_corto,
            u.nombre_completo AS aplicado_por
     FROM historial_vacunacion h
     INNER JOIN dosis d ON d.id = h.dosis_id
     INNER JOIN vacunas v ON v.id = d.vacuna_id
     LEFT JOIN usuarios u ON u.id = h.usuario_id
     WHERE h.paciente_id = ?
     ORDER BY h.fecha_aplicacion ASC`,
    [pacienteId]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM historial_vacunacion WHERE id = ?', [id]);
  return rows[0] || null;
}

async function existeRegistro(pacienteId, dosisId) {
  const [rows] = await pool.query(
    'SELECT id FROM historial_vacunacion WHERE paciente_id = ? AND dosis_id = ?',
    [pacienteId, dosisId]
  );
  return rows.length > 0;
}

async function create(data) {
  const [result] = await pool.query(
    `INSERT INTO historial_vacunacion (paciente_id, dosis_id, usuario_id, fecha_aplicacion, lote, peso_kg, talla_cm, establecimiento, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.pacienteId, data.dosisId, data.usuarioId || null, data.fechaAplicacion,
     data.lote || null, data.pesoKg || null, data.tallaCm || null,
     data.establecimiento || 'Hospital Materno Germán Urquidi', data.observaciones || null]
  );
  return findById(result.insertId);
}

async function update(id, data) {
  await pool.query(
    `UPDATE historial_vacunacion SET fecha_aplicacion = ?, lote = ?, peso_kg = ?, talla_cm = ?, establecimiento = ?, observaciones = ?
     WHERE id = ?`,
    [data.fechaAplicacion, data.lote || null, data.pesoKg || null, data.tallaCm || null,
     data.establecimiento || 'Hospital Materno Germán Urquidi', data.observaciones || null, id]
  );
  return findById(id);
}

async function contarAplicadasEntreFechas(desde, hasta) {
  const [rows] = await pool.query(
    `SELECT v.nombre AS vacuna, COUNT(*) AS total
     FROM historial_vacunacion h
     INNER JOIN dosis d ON d.id = h.dosis_id
     INNER JOIN vacunas v ON v.id = d.vacuna_id
     WHERE h.fecha_aplicacion BETWEEN ? AND ?
     GROUP BY v.nombre ORDER BY total DESC`,
    [desde, hasta]
  );
  return rows;
}

module.exports = { findByPacienteId, findById, existeRegistro, create, update, contarAplicadasEntreFechas };
