const { validarAplicacion } = require('./validarAplicacion.service');
const auditoria = require('../models/auditoria.model');
const { pool } = require('../config/db');
const alertaService = require('./alerta.service');
const { esFechaISOValida } = require('../utils/validation.util');

class CitaError extends Error { constructor(message, status = 422) { super(message); this.status = status; } }

async function registrarCita({ pacienteId, usuarioId, fechaHora, observaciones, dosisAplicadas }) {
  if (!Array.isArray(dosisAplicadas) || dosisAplicadas.length === 0) throw new CitaError('La cita debe incluir al menos una dosis aplicada');
  for (const item of dosisAplicadas) {
    if (item.fechaAplicacion && !esFechaISOValida(item.fechaAplicacion)) {
      throw new CitaError('La fecha de aplicación no es válida');
    }
    if (item.fechaAplicacion && new Date(`${item.fechaAplicacion}T00:00:00`) > new Date()) {
      throw new CitaError('La fecha de aplicación no puede ser futura');
    }
  }
  if (fechaHora && (!Number.isFinite(new Date(fechaHora).getTime()) || new Date(fechaHora) > new Date())) throw new CitaError('La fecha de la visita no puede ser inválida o futura');
  const connection = await pool.getConnection();
  let resultado;
  try {
    await connection.beginTransaction();
    const [[paciente]] = await connection.query('SELECT *, CURDATE() AS hoy FROM pacientes WHERE id = ? AND estado = \'activo\' FOR UPDATE', [pacienteId]);
    if (!paciente) throw new CitaError('Paciente no encontrado o inactivo', 404);
    const [cita] = await connection.query('INSERT INTO citas (paciente_id, usuario_id, fecha_hora, observaciones) VALUES (?, ?, ?, ?)', [pacienteId, usuarioId, fechaHora || new Date(), observaciones || null]);
    const registros = [];
    for (const item of dosisAplicadas) {
      const [[lote]] = await connection.query(
        `SELECT l.id, l.vacuna_id, l.fecha_vencimiento, l.cantidad_disponible, l.estado, l.fecha_vencimiento < CURDATE() AS vencido,
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
      if (lote.estado !== 'activo' || Boolean(lote.vencido) || lote.cantidad_disponible < 1) throw new CitaError('El lote está vencido, inactivo o sin stock', 409);
      const [[duplicada]] = await connection.query('SELECT id FROM historial_vacunacion WHERE paciente_id = ? AND dosis_id = ?', [pacienteId, item.dosisId]);
      if (duplicada) throw new CitaError('Esta dosis ya fue registrada previamente para el paciente', 409);
      const fecha=item.fechaAplicacion||paciente.hoy;
      if(fecha>paciente.hoy)throw new CitaError('La fecha de aplicación no puede ser futura');
      if(fecha>lote.fecha_vencimiento)throw new CitaError('La aplicación no puede ser posterior al vencimiento del lote');
      const [[dosis]]=await connection.query('SELECT * FROM dosis WHERE id=?',[item.dosisId]);
      const [historial]=await connection.query('SELECT dosis_id,fecha_aplicacion FROM historial_vacunacion WHERE paciente_id=?',[pacienteId]);
      await validarAplicacion(connection,paciente,dosis,fecha,historial);
      const [aplicacion] = await connection.query(
        `INSERT INTO historial_vacunacion (paciente_id, dosis_id, usuario_id, cita_id, lote_vacuna_id, fecha_aplicacion, establecimiento, observaciones)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [pacienteId, item.dosisId, usuarioId, cita.insertId, item.loteVacunaId, fecha, item.establecimiento || 'Hospital Materno Germán Urquidi', item.observaciones || null]
      );
      const [stock] = await connection.query('UPDATE lotes_vacuna SET cantidad_disponible = cantidad_disponible - 1 WHERE id = ? AND cantidad_disponible > 0', [item.loteVacunaId]);
      if (stock.affectedRows !== 1) throw new CitaError('No fue posible reservar el stock del lote', 409);
      registros.push({ id: aplicacion.insertId, dosisId: item.dosisId, loteVacunaId: item.loteVacunaId });
    }
    await auditoria.create({usuarioId,accion:'CREAR',entidad:'citas',entidadId:cita.insertId,datosNuevos:{pacienteId,dosisAplicadas:registros}},connection);
    await connection.commit();
    resultado = { id: cita.insertId, pacienteId, dosisAplicadas: registros };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  try { await alertaService.generarAlertasPaciente(pacienteId); }
  catch (error) {
    console.error('[ALERTAS] Aplicación guardada; actualización pendiente:', error.message);
    resultado.advertencias = ['La vacunación se guardó, pero no se pudieron actualizar las alertas.'];
  }
  return resultado;
}

module.exports = { registrarCita, CitaError };
