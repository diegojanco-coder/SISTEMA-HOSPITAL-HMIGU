const { pool } = require('../config/db');

async function findDisponibles(vacunaId) {
  const [rows] = await pool.query(
    `SELECT * FROM lotes_vacuna WHERE vacuna_id = ? AND estado = 'activo'
     AND fecha_vencimiento > CURDATE() AND cantidad_disponible > 0 ORDER BY fecha_vencimiento ASC`, [vacunaId]
  );
  return rows;
}

async function create({ vacunaId, numeroLote, fechaVencimiento, cantidadDisponible }) {
  const [result] = await pool.query(
    `INSERT INTO lotes_vacuna (vacuna_id, numero_lote, fecha_vencimiento, cantidad_disponible) VALUES (?, ?, ?, ?)`,
    [vacunaId, numeroLote, fechaVencimiento, cantidadDisponible]
  );
  const [rows] = await pool.query('SELECT * FROM lotes_vacuna WHERE id = ?', [result.insertId]);
  return rows[0];
}

module.exports = { findDisponibles, create };
