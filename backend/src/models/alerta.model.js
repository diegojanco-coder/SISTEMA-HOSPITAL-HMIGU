const { pool } = require('../config/db');

async function upsert({ pacienteId, dosisId, estadoSemaforo, fechaLimite, mensaje }) {
  const [previas] = await pool.query('SELECT estado_semaforo, mensaje FROM alertas WHERE paciente_id = ? AND dosis_id = ?', [pacienteId, dosisId]);
  await pool.query(
    `INSERT INTO alertas (paciente_id, dosis_id, estado_semaforo, fecha_limite, mensaje)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE estado_semaforo = VALUES(estado_semaforo),
       fecha_limite = VALUES(fecha_limite), mensaje = VALUES(mensaje), updated_at = NOW()`,
    [pacienteId, dosisId, estadoSemaforo, fechaLimite, mensaje]
  );
  return !previas[0] || previas[0].estado_semaforo !== estadoSemaforo || previas[0].mensaje !== mensaje;
}

async function eliminarPorPacienteDosis(pacienteId, dosisId) {
  await pool.query('DELETE FROM alertas WHERE paciente_id = ? AND dosis_id = ?', [pacienteId, dosisId]);
}

async function findAll({ estado, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  let sql = `SELECT a.*, p.nombres, p.apellidos, p.codigo_paciente, v.nombre AS vacuna_nombre, d.nombre_dosis
             FROM alertas a
             INNER JOIN pacientes p ON p.id = a.paciente_id
             INNER JOIN dosis d ON d.id = a.dosis_id
             INNER JOIN vacunas v ON v.id = d.vacuna_id
             WHERE p.estado = 'activo'`;
  const params = [];
  if (estado) {
    sql += ' AND a.estado_semaforo = ?';
    params.push(estado);
  }
  sql += ' ORDER BY FIELD(a.estado_semaforo, "rojo", "amarillo", "verde"), a.fecha_limite ASC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findByPacienteId(pacienteId) {
  const [rows] = await pool.query(
    `SELECT a.*, v.nombre AS vacuna_nombre, d.nombre_dosis
     FROM alertas a
     INNER JOIN dosis d ON d.id = a.dosis_id
     INNER JOIN vacunas v ON v.id = d.vacuna_id
     WHERE a.paciente_id = ?
     ORDER BY FIELD(a.estado_semaforo, "rojo", "amarillo", "verde")`,
    [pacienteId]
  );
  return rows;
}

async function marcarLeida(id) {
  await pool.query('UPDATE alertas SET leida = 1 WHERE id = ?', [id]);
}

async function resumen() {
  const [rows] = await pool.query(
    `SELECT estado_semaforo, COUNT(*) AS total FROM alertas
     INNER JOIN pacientes p ON p.id = alertas.paciente_id AND p.estado = 'activo'
     GROUP BY estado_semaforo`
  );
  return rows;
}

module.exports = { upsert, eliminarPorPacienteDosis, findAll, findByPacienteId, marcarLeida, resumen };
