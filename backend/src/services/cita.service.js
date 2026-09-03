const { pool } = require('../config/db');
const alertaService = require('./alerta.service');

class CitaError extends Error { constructor(message, status = 422) { super(message); this.status = status; } }

async function registrarCita({ pacienteId, usuarioId, fechaHora, observaciones, dosisAplicadas }) {
  if (!Array.isArray(dosisAplicadas) || dosisAplicadas.length === 0) throw new CitaError('La cita debe incluir al menos una dosis aplicada');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[paciente]] = await connection.query('SELECT id FROM pacientes WHERE id = ? AND estado = \'activo\' FOR UPDATE', [pacienteId]);
    if (!paciente) throw new CitaError('Paciente no encontrado o inactivo', 404);
    const [cita] = await connection.query('INSERT INTO citas (paciente_id, usuario_id, fecha_hora, observaciones) VALUES (?, ?, ?, ?)', [pacienteId, usuarioId, fechaHora || new Date(), observaciones || null]);
    const registros = [];
    for (const item of dosisAplicadas) {
      const [[lote]] = await connection.query(
        `SELECT l.id, l.vacuna_id, l.fecha_vencimiento, l.cantidad_disponible, l.estado, d.id AS dosis_id, d.vacuna_id AS dosis_vacuna_id
         FROM lotes_vacuna l INNER JOIN dosis d ON d.id = ? WHERE l.id = ? FOR UPDATE`, [item.dosisId, item.loteVacunaId]
      );
      if (!lote || lote.vacuna_id !== lote.dosis_vacuna_id) throw new CitaError('El lote no corresponde a la vacuna de la dosis seleccionada');
      if (lote.estado !== 'activo' || new Date(lote.fecha_vencimiento) <= new Date() || lote.cantidad_disponible < 1) throw new CitaError('El lote está vencido, inactivo o sin stock', 409);
      const [[duplicada]] = await connection.query('SELECT id FROM historial_vacunacion WHERE paciente_id = ? AND dosis_id = ?', [pacienteId, item.dosisId]);
      if (duplicada) throw new CitaError('Esta dosis ya fue registrada previamente para el paciente', 409);
      const [aplicacion] = await connection.query(
        `INSERT INTO historial_vacunacion (paciente_id, dosis_id, usuario_id, cita_id, lote_vacuna_id, fecha_aplicacion, establecimiento, observaciones)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [pacienteId, item.dosisId, usuarioId, cita.insertId, item.loteVacunaId, item.fechaAplicacion || new Date(), item.establecimiento || 'Hospital Materno Germán Urquidi', item.observaciones || null]
      );
      const [stock] = await connection.query('UPDATE lotes_vacuna SET cantidad_disponible = cantidad_disponible - 1 WHERE id = ? AND cantidad_disponible > 0', [item.loteVacunaId]);
      if (stock.affectedRows !== 1) throw new CitaError('No fue posible reservar el stock del lote', 409);
      registros.push({ id: aplicacion.insertId, dosisId: item.dosisId, loteVacunaId: item.loteVacunaId });
    }
    await connection.commit();
    await alertaService.generarAlertasPaciente(pacienteId);
    return { id: cita.insertId, pacienteId, dosisAplicadas: registros };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

module.exports = { registrarCita, CitaError };
