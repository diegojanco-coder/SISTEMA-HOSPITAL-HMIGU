const { pool } = require('../config/db');

async function create({ usuarioId, accion, entidad, entidadId, datosPrevios, datosNuevos, ip, userAgent }) {
  await pool.query(
    `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, datos_previos, datos_nuevos, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      usuarioId,
      accion,
      entidad,
      entidadId || null,
      datosPrevios ? JSON.stringify(datosPrevios) : null,
      datosNuevos ? JSON.stringify(datosNuevos) : null,
      ip || null,
      userAgent || null
    ]
  );
}

async function findAll({ page = 1, limit = 20, entidad, usuarioId } = {}) {
  const offset = (page - 1) * limit;
  let sql = `SELECT a.*, u.nombre_completo AS usuario_nombre
             FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id WHERE 1=1`;
  const params = [];
  if (entidad) {
    sql += ' AND a.entidad = ?';
    params.push(entidad);
  }
  if (usuarioId) {
    sql += ' AND a.usuario_id = ?';
    params.push(usuarioId);
  }
  sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  const [rows] = await pool.query(sql, params);

  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM auditoria');
  return { rows, total };
}

module.exports = { create, findAll };
