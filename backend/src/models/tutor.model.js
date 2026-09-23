const { pool } = require('../config/db');

async function findAll({ page = 1, limit = 10, q = '' } = {}) {
  const offset = (page - 1) * limit;
  const like = `%${q}%`;
  const [rows] = await pool.query(
    `SELECT * FROM tutores
     WHERE estado = 'activo' AND (nombres LIKE ? OR apellidos LIKE ? OR carnet_identidad LIKE ? OR CONCAT(nombres,' ',apellidos) LIKE ?)
     ORDER BY apellidos ASC LIMIT ? OFFSET ?`,
    [like, like, like, like, Number(limit), Number(offset)]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM tutores
     WHERE estado = 'activo' AND (nombres LIKE ? OR apellidos LIKE ? OR carnet_identidad LIKE ? OR CONCAT(nombres,' ',apellidos) LIKE ?)`,
    [like, like, like, like]
  );
  return { rows, total };
}

async function findById(id, db = pool) {
  const [rows] = await db.query('SELECT * FROM tutores WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create(data, db = pool) {
  const [result] = await db.query(
    `INSERT INTO tutores (nombres, apellidos, carnet_identidad, parentesco, telefono, email, direccion)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.nombres, data.apellidos, data.carnetIdentidad || null, data.parentesco, data.telefono || null,
     data.email || null, data.direccion || null]
  );
  return findById(result.insertId, db);
}

async function update(id, data, db = pool) {
  await db.query(
    `UPDATE tutores SET nombres = ?, apellidos = ?, carnet_identidad = ?, parentesco = ?,
       telefono = ?, email = ?, direccion = ? WHERE id = ?`,
    [data.nombres, data.apellidos, data.carnetIdentidad || null, data.parentesco, data.telefono || null,
     data.email || null, data.direccion || null, id]
  );
  return findById(id, db);
}

async function desactivar(id) {
  await pool.query("UPDATE tutores SET estado = 'inactivo' WHERE id = ?", [id]);
}

async function vincularPaciente(tutorId, pacienteId, esPrincipal = false) {
  await pool.query(
    `INSERT INTO paciente_tutor (paciente_id, tutor_id, es_principal) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE es_principal = VALUES(es_principal), estado = 'activo'`,
    [pacienteId, tutorId, esPrincipal ? 1 : 0]
  );
}

async function desvincularPaciente(tutorId, pacienteId) {
  await pool.query("UPDATE paciente_tutor SET estado = 'inactivo', es_principal = 0 WHERE tutor_id = ? AND paciente_id = ?", [tutorId, pacienteId]);
}

async function findPacientesByTutorId(tutorId) {
  const [rows] = await pool.query(
    `SELECT p.*, pt.es_principal FROM pacientes p
     INNER JOIN paciente_tutor pt ON pt.paciente_id = p.id
     WHERE pt.tutor_id = ? AND pt.estado = 'activo'`,
    [tutorId]
  );
  return rows;
}

module.exports = {
  findAll, findById, create, update, desactivar, vincularPaciente, desvincularPaciente, findPacientesByTutorId
};
