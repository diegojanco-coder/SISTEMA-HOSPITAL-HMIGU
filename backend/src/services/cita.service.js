const { pool } = require('../config/db');
const alertaService = require('./alerta.service');
const { esFechaISOValida } = require('../utils/validation.util');

class CitaError extends Error { constructor(message, status = 422) { super(message); this.status = status; } }

async function registrarCita({ pacienteId, usuarioId, fechaHora, observaciones, dosisAplicadas }) {
  if (!Array.isArray(dosisAplicadas) || dosisAplicadas.length === 0) throw new CitaError('La cita debe incluir al menos una dosis aplicada');
  for (const item of dosisAplicadas) {
    if (item.fechaAplicacion && !esFechaISOValida(String(item.fechaAplicacion).slice(0, 10))) {
      throw new CitaError('La fecha de aplicación no es válida');
    }
    if (item.fechaAplicacion && new Date(`${item.fechaAplicacion}T00:00:00`) > new Date()) {
      throw new CitaError('La fecha de aplicación no puede ser futura');
    }
  }
  const connection = await pool.getConnection();
  let resultado;
  try {
    await connection.beginTransaction();
    const [[paciente]] = await connection.query('SELECT id FROM pacientes WHERE id = ? AND estado = \'activo\' FOR UPDATE', [pacienteId]);
    if (!paciente) throw new CitaError('Paciente no encontrado o inactivo', 404);
    const [cita] = await connection.query('INSERT INTO citas (paciente_id, usuario_id, fecha_hora, observaciones) VALUES (?, ?, ?, ?)', [pacienteId, usuarioId, fechaHora || new Date(), observaciones || null]);
    const registros = [];
    for (const item of dosisAplicadas) {
      const [[lote]] = await connection.query(
        `SELECT l.id, l.vacuna_id, l.fecha_vencimiento, l.cantidad_disponible, l.estado,
                d.id AS dosis_id, d.vacuna_id AS dosis_vacuna_id, d.estado AS dosis_estado,
                v.estado AS vacuna_estado
         FROM lotes_vacuna l
         INNER JOIN dosis d ON d.id = ?
         INNER JOIN vacunas v ON v.id = d.vacuna_id
         WHERE l.id = ? FOR UPDATE`, [item.dosisId, item.loteVacunaId]
      );
      if (!lote || lote.vacuna_id !== lote.dosis_vacuna_id || lote.dosis_estado !== 'activo' || lote.vacuna_estado !== 'activo') {
        throw new CitaError('La dosis o el lote seleccionado no está activo o no corresponde a la vacuna indicada');
      }
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
    resultado = { id: cita.insertId, pacienteId, dosisAplicadas: registros };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }

  // La vacunación ya está confirmada; un fallo de alertas no debe invitar a repetirla.
  try {
    await alertaService.generarAlertasPaciente(pacienteId);
  } catch {
    resultado.advertencias = [{
      codigo: 'ALERTAS_NO_ACTUALIZADAS',
      mensaje: 'La vacunación fue registrada, pero no se pudieron actualizar las alertas. No vuelva a registrar las dosis.',
    }];
  }
  return resultado;
}

module.exports = { registrarCita, CitaError };
