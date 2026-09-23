const { pool } = require('../config/db');

async function findByPacienteId(pacienteId, db = pool) {
  const [rows] = await db.query(
    `SELECT h.*, d.nombre_dosis, d.numero_dosis, v.nombre AS vacuna_nombre, v.nombre_corto,
            CASE WHEN h.origen='local' THEN u.nombre_completo ELSE NULL END AS aplicado_por,
            u.nombre_completo AS registrado_por, lv.numero_lote AS lote
     FROM historial_vacunacion h
     INNER JOIN dosis d ON d.id = h.dosis_id
     INNER JOIN vacunas v ON v.id = d.vacuna_id
     LEFT JOIN usuarios u ON u.id = h.usuario_id
     LEFT JOIN lotes_vacuna lv ON lv.id = h.lote_vacuna_id
     WHERE h.paciente_id = ?
     ORDER BY h.fecha_aplicacion ASC`,
    [pacienteId]
  );
  return rows;
}

async function findById(id, db = pool) {
  const [rows] = await db.query('SELECT * FROM historial_vacunacion WHERE id = ?', [id]);
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
    `INSERT INTO historial_vacunacion
      (paciente_id, dosis_id, usuario_id, cita_id, lote_vacuna_id, fecha_aplicacion, establecimiento, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.pacienteId, data.dosisId, data.usuarioId || null, data.citaId, data.loteVacunaId,
     data.fechaAplicacion, data.establecimiento || 'Hospital Materno Germán Urquidi', data.observaciones || null]
  );
  return findById(result.insertId);
}

async function update(id, data, db = pool) {
  await db.query(
    `UPDATE historial_vacunacion SET fecha_aplicacion = ?, establecimiento = ?, observaciones = ?,
       documento_referencia = CASE WHEN origen='externo' THEN COALESCE(?,documento_referencia) ELSE NULL END
     WHERE id = ?`,
    [data.fechaAplicacion, data.establecimiento || 'Hospital Materno Germán Urquidi',
     data.observaciones || null, data.documentoReferencia ?? null, id]
  );
  return findById(id, db);
}

async function contarAplicadasEntreFechas(desde, hasta) {
  const [rows] = await pool.query(
    `SELECT v.nombre AS vacuna, COUNT(*) AS total
     FROM historial_vacunacion h
     INNER JOIN dosis d ON d.id = h.dosis_id
     INNER JOIN vacunas v ON v.id = d.vacuna_id
     WHERE h.origen='local' AND h.fecha_aplicacion BETWEEN ? AND ?
     GROUP BY v.nombre ORDER BY total DESC`,
    [desde, hasta]
  );
  return rows;
}

module.exports = { findByPacienteId, findById, existeRegistro, create, update, contarAplicadasEntreFechas };
