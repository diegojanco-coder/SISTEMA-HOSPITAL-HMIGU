const { pool } = require('../config/db');

async function crear({ pacienteId, dosisId, fechaProgramada, creadoPor }) {
  const [result] = await pool.query(
    `INSERT INTO citas_vacunacion (paciente_id, dosis_id, fecha_programada, creado_por, estado)
     VALUES (?, ?, ?, ?, 'programada')`,
    [pacienteId, dosisId, fechaProgramada, creadoPor || null]
  );
  return { id: result.insertId };
}

async function listarPorPaciente(pacienteId) {
  const [rows] = await pool.query(
    `SELECT c.*, d.nombre_dosis, v.nombre AS vacuna_nombre
     FROM citas_vacunacion c
     JOIN dosis d ON d.id = c.dosis_id
     JOIN vacunas v ON v.id = d.vacuna_id
     WHERE c.paciente_id = ?
     ORDER BY c.fecha_programada DESC`,
    [pacienteId]
  );
  return rows;
}

/**
 * Trae las citas "programadas" cuya fecha_programada es mañana,
 * junto con los datos del paciente, dosis, y el email del tutor principal.
 * Esto es lo que usa el cron diario.
 */
async function listarParaNotificarManana() {
  const [rows] = await pool.query(
    `SELECT c.id AS cita_id, c.fecha_programada,
            p.nombres AS paciente_nombres, p.apellidos AS paciente_apellidos,
            d.nombre_dosis, v.nombre AS vacuna_nombre,
            t.email AS tutor_email
     FROM citas_vacunacion c
     JOIN pacientes p ON p.id = c.paciente_id
     JOIN dosis d ON d.id = c.dosis_id
     JOIN vacunas v ON v.id = d.vacuna_id
     LEFT JOIN paciente_tutor pt ON pt.paciente_id = p.id AND pt.es_principal = 1
     LEFT JOIN tutores t ON t.id = pt.tutor_id
     WHERE c.estado = 'programada'
       AND c.fecha_programada = DATE_ADD(CURDATE(), INTERVAL 1 DAY)`
  );
  return rows;
}

async function marcarNotificada(citaId) {
  await pool.query(
    `UPDATE citas_vacunacion SET estado = 'notificada' WHERE id = ?`,
    [citaId]
  );
}

module.exports = { crear, listarPorPaciente, listarParaNotificarManana, marcarNotificada };