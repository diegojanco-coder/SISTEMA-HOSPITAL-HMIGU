const { pool } = require('../config/db');

async function findAll({ page = 1, limit = 10, q = '' } = {}) {
  const offset = (page - 1) * limit;
  const like = `%${q}%`;
  const [rows] = await pool.query(
    `SELECT p.*,
            (SELECT COUNT(*) FROM historial_vacunacion h WHERE h.paciente_id = p.id) AS dosis_aplicadas
     FROM pacientes p
     WHERE p.estado = 'activo'
       AND (
         p.nombres LIKE ?
         OR p.apellidos LIKE ?
         OR p.codigo_paciente LIKE ?
         OR p.carnet_identidad LIKE ?
         OR CONCAT(p.nombres, ' ', p.apellidos) LIKE ?
       )
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [like, like, like, like, like, Number(limit), Number(offset)]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM pacientes
     WHERE estado = 'activo'
       AND (
         nombres LIKE ?
         OR apellidos LIKE ?
         OR codigo_paciente LIKE ?
         OR carnet_identidad LIKE ?
         OR CONCAT(nombres, ' ', apellidos) LIKE ?
       )`,
    [like, like, like, like, like]
  );
  return { rows, total };
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM pacientes WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findTutoresByPacienteId(pacienteId) {
  const [rows] = await pool.query(
    `SELECT t.*, pt.es_principal
     FROM tutores t
     INNER JOIN paciente_tutor pt ON pt.tutor_id = t.id
     WHERE pt.paciente_id = ?`,
    [pacienteId]
  );
  return rows;
}

async function generarCodigoPaciente() {
  const anio = new Date().getFullYear();
  const [[{ total }]] = await pool.query(
    "SELECT COUNT(*) AS total FROM pacientes WHERE codigo_paciente LIKE ?",
    [`PAC-${anio}-%`]
  );
  const correlativo = String(total + 1).padStart(4, '0');
  return `PAC-${anio}-${correlativo}`;
}

async function create(data) {
  const codigo = await generarCodigoPaciente();
  const [result] = await pool.query(
    `INSERT INTO pacientes
      (codigo_paciente, nombres, apellidos, carnet_identidad, fecha_nacimiento, sexo,
       discapacidad, observaciones_generales,
       direccion, telefono_contacto, lugar_nacimiento, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [codigo, data.nombres, data.apellidos, data.carnetIdentidad || null, data.fechaNacimiento,
     data.sexo, data.discapacidad || null, data.observacionesGenerales || null,
     data.direccion || null, data.telefonoContacto || null, data.lugarNacimiento || null,
     data.creadoPor || null]
  );
  return findById(result.insertId);
}

async function update(id, data) {
  await pool.query(
    `UPDATE pacientes SET nombres = ?, apellidos = ?, carnet_identidad = ?, fecha_nacimiento = ?,
       sexo = ?, discapacidad = ?, observaciones_generales = ?,
       direccion = ?, telefono_contacto = ?, lugar_nacimiento = ?
     WHERE id = ?`,
    [data.nombres, data.apellidos, data.carnetIdentidad || null, data.fechaNacimiento, data.sexo,
     data.discapacidad || null, data.observacionesGenerales || null,
     data.direccion || null, data.telefonoContacto || null, data.lugarNacimiento || null, id]
  );
  return findById(id);
}

async function desactivar(id) {
  await pool.query("UPDATE pacientes SET estado = 'inactivo' WHERE id = ?", [id]);
}

module.exports = { findAll, findById, findTutoresByPacienteId, create, update, desactivar };
