const { pool } = require('../config/db');

async function findInventarioLotes(filtros = {}) {
  const {
    vacunaId,
    estado,
    stockMin = 0,
    diasMax = 30,
    page = 1,
    limit = 50
  } = filtros;

  const params = [];
  let sql = `
    SELECT
      v.id AS vacuna_id,
      v.nombre AS vacuna_nombre,
      lv.id AS lote_id,
      lv.numero_lote,
      lv.fecha_vencimiento,
      lv.cantidad_disponible AS stock_disponible,
      lv.estado,
      DATEDIFF(lv.fecha_vencimiento, CURDATE()) AS dias_restantes,
      CASE
        WHEN lv.estado = 'activo' AND DATEDIFF(lv.fecha_vencimiento, CURDATE()) <= 15 THEN 'rojo'
        WHEN lv.estado = 'activo' AND DATEDIFF(lv.fecha_vencimiento, CURDATE()) <= 30 THEN 'amarillo'
        WHEN lv.estado = 'activo' THEN 'verde'
        ELSE 'inactivo'
      END AS nivel_riesgo,
      CASE
        WHEN lv.estado = 'activo' AND lv.cantidad_disponible = 0 THEN 'sin_stock'
        WHEN lv.estado = 'activo' AND lv.cantidad_disponible > 0 THEN 'disponible'
        ELSE 'inactivo'
      END AS estado_stock
    FROM lotes_vacuna lv
    JOIN vacunas v ON v.id = lv.vacuna_id
    WHERE 1 = 1
  `;

  if (vacunaId) {
    sql += ' AND v.id = ?';
    params.push(vacunaId);
  }

  if (estado) {
    sql += ' AND lv.estado = ?';
    params.push(estado);
  }

  if (stockMin !== null && stockMin !== undefined) {
    sql += ' AND lv.cantidad_disponible >= ?';
    params.push(Number(stockMin));
  }

  if (diasMax !== null && diasMax !== undefined) {
    sql += ' AND DATEDIFF(lv.fecha_vencimiento, CURDATE()) <= ?';
    params.push(Number(diasMax));
  }

  sql += ' ORDER BY v.nombre ASC, lv.fecha_vencimiento ASC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const [rows] = await pool.query(sql, params);

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM lotes_vacuna lv JOIN vacunas v ON v.id = lv.vacuna_id WHERE 1 = 1 ${
      vacunaId ? 'AND v.id = ?' : ''
    } ${estado ? 'AND lv.estado = ?' : ''}`,
    [...(vacunaId ? [vacunaId] : []), ...(estado ? [estado] : [])]
  );

  return { rows, total, page: Number(page), limit: Number(limit) };
}

async function findLotesProximosVencer(filtros = {}) {
  const { dias = 30, vacunaId, page = 1, limit = 50 } = filtros;
  const params = [Number(dias)];

  let sql = `
    SELECT
      v.id AS vacuna_id,
      v.nombre AS vacuna_nombre,
      lv.id AS lote_id,
      lv.numero_lote,
      lv.fecha_vencimiento,
      lv.cantidad_disponible AS stock_disponible,
      lv.estado,
      DATEDIFF(lv.fecha_vencimiento, CURDATE()) AS dias_restantes,
      CASE
        WHEN DATEDIFF(lv.fecha_vencimiento, CURDATE()) <= 15 THEN 'rojo'
        WHEN DATEDIFF(lv.fecha_vencimiento, CURDATE()) <= 30 THEN 'amarillo'
        ELSE 'verde'
      END AS nivel_riesgo
    FROM lotes_vacuna lv
    JOIN vacunas v ON v.id = lv.vacuna_id
    WHERE lv.estado = 'activo'
      AND DATEDIFF(lv.fecha_vencimiento, CURDATE()) >= 0
      AND DATEDIFF(lv.fecha_vencimiento, CURDATE()) <= ?
  `;

  if (vacunaId) {
    sql += ' AND v.id = ?';
    params.push(vacunaId);
  }

  sql += ' ORDER BY DATEDIFF(lv.fecha_vencimiento, CURDATE()) ASC, lv.fecha_vencimiento ASC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findAuditoriaVacunacion(filtros = {}) {
  const {
    usuarioId,
    pacienteId,
    desde,
    hasta,
    page = 1,
    limit = 50
  } = filtros;

  const params = [];
  let sql = `
    SELECT
      a.id,
      a.usuario_id,
      u.nombre_completo AS usuario_nombre,
      a.accion,
      a.entidad,
      a.entidad_id,
      p.id AS paciente_id,
      CONCAT(p.nombres, ' ', p.apellidos) AS paciente_nombre,
      p.codigo_paciente,
      a.ip,
      a.user_agent,
      a.created_at AS fecha_operacion
    FROM auditoria a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    LEFT JOIN historial_vacunacion hv ON hv.id = a.entidad_id AND a.entidad = 'historial_vacunacion'
    LEFT JOIN pacientes p ON p.id = hv.paciente_id
    WHERE a.entidad = 'historial_vacunacion'
  `;

  if (usuarioId) {
    sql += ' AND a.usuario_id = ?';
    params.push(usuarioId);
  }

  if (pacienteId) {
    sql += ' AND hv.paciente_id = ?';
    params.push(pacienteId);
  }

  if (desde) {
    sql += ' AND DATE(a.created_at) >= ?';
    params.push(desde);
  }

  if (hasta) {
    sql += ' AND DATE(a.created_at) <= ?';
    params.push(hasta);
  }

  sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const [rows] = await pool.query(sql, params);

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM auditoria a WHERE a.entidad = 'historial_vacunacion' ${
      usuarioId ? 'AND a.usuario_id = ?' : ''
    } ${pacienteId ? 'AND EXISTS (SELECT 1 FROM historial_vacunacion hv WHERE hv.id = a.entidad_id AND hv.paciente_id = ?)' : ''
    } ${desde ? 'AND DATE(a.created_at) >= ?' : ''} ${hasta ? 'AND DATE(a.created_at) <= ?' : ''}`,
    [
      ...(usuarioId ? [usuarioId] : []),
      ...(pacienteId ? [pacienteId] : []),
      ...(desde ? [desde] : []),
      ...(hasta ? [hasta] : [])
    ]
  );

  return { rows, total, page: Number(page), limit: Number(limit) };
}

async function findResumenVacunaciones(filtros = {}) {
  const {
    desde,
    hasta,
    vacunaId,
    usuarioId,
    page = 1,
    limit = 50
  } = filtros;

  const params = [];
  let sql = `
    SELECT
      DATE(h.fecha_aplicacion) AS fecha_aplicacion,
      v.id AS vacuna_id,
      v.nombre AS vacuna_nombre,
      u.id AS usuario_id,
      u.nombre_completo AS usuario_nombre,
      COUNT(*) AS total_dosis_aplicadas
    FROM historial_vacunacion h
    JOIN dosis d ON d.id = h.dosis_id
    JOIN vacunas v ON v.id = d.vacuna_id
    LEFT JOIN usuarios u ON u.id = h.usuario_id
    WHERE 1 = 1
  `;

  if (desde) {
    sql += ' AND DATE(h.fecha_aplicacion) >= ?';
    params.push(desde);
  }

  if (hasta) {
    sql += ' AND DATE(h.fecha_aplicacion) <= ?';
    params.push(hasta);
  }

  if (vacunaId) {
    sql += ' AND v.id = ?';
    params.push(vacunaId);
  }

  if (usuarioId) {
    sql += ' AND u.id = ?';
    params.push(usuarioId);
  }

  sql += ' GROUP BY DATE(h.fecha_aplicacion), v.id, v.nombre, u.id, u.nombre_completo ORDER BY DATE(h.fecha_aplicacion) DESC, v.nombre ASC';
  const [rows] = await pool.query(sql, params);

  const total = Array.isArray(rows) ? rows.reduce((sum, item) => sum + Number(item.total_dosis_aplicadas || 0), 0) : 0;

  return {
    rows: rows.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit)),
    total,
    page: Number(page),
    limit: Number(limit),
    totalRegistros: rows.length
  };
}

module.exports = {
  findInventarioLotes,
  findLotesProximosVencer,
  findAuditoriaVacunacion,
  findResumenVacunaciones
};
