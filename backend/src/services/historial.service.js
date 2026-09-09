const { validarAplicacion } = require('./validarAplicacion.service');
const historialModel = require('../models/historial.model');
const auditoriaModel = require('../models/auditoria.model');
const alertaService = require('./alerta.service');
const transaction = require('../utils/transaction.util');
const { esFechaISOValida } = require('../utils/validation.util');
class HistorialError extends Error {
  constructor(message, status = 422) { super(message); this.status = status; }
}
async function listarPorPaciente(pacienteId) { return historialModel.findByPacienteId(pacienteId); }
async function editarRegistro(id, data, auditor = {}) {
  if (!esFechaISOValida(data.fechaAplicacion)) throw new HistorialError('La fecha de aplicación debe ser válida');
  const actualizado = await transaction(async db => {
    const [[referencia]] = await db.query('SELECT paciente_id FROM historial_vacunacion WHERE id=?', [id]);
    if (!referencia) throw new HistorialError('Registro de historial no encontrado', 404);
    await db.query('SELECT id FROM pacientes WHERE id=? FOR UPDATE', [referencia.paciente_id]);
    const [[registro]] = await db.query(`SELECT h.*, p.fecha_nacimiento, lv.fecha_vencimiento, d.vacuna_id, d.numero_dosis, CURDATE() AS hoy
      FROM historial_vacunacion h JOIN pacientes p ON p.id=h.paciente_id
      JOIN lotes_vacuna lv ON lv.id=h.lote_vacuna_id JOIN dosis d ON d.id=h.dosis_id
      WHERE h.id=? FOR UPDATE`, [id]);
    if (data.fechaAplicacion > registro.hoy) throw new HistorialError('La fecha de aplicación no puede ser futura');
    if (data.fechaAplicacion < registro.fecha_nacimiento) throw new HistorialError('La aplicación no puede ser anterior al nacimiento');
    if (data.fechaAplicacion > registro.fecha_vencimiento) throw new HistorialError('La aplicación no puede ser posterior al vencimiento del lote');
    const [otras] = await db.query(`SELECT h.fecha_aplicacion, d.numero_dosis FROM historial_vacunacion h JOIN dosis d ON d.id=h.dosis_id
      WHERE h.paciente_id=? AND d.vacuna_id=? AND h.id<>? FOR UPDATE`, [registro.paciente_id, registro.vacuna_id, id]);
    if (otras.some(d => (d.numero_dosis < registro.numero_dosis && d.fecha_aplicacion > data.fechaAplicacion) || (d.numero_dosis > registro.numero_dosis && d.fecha_aplicacion < data.fechaAplicacion))) {
      throw new HistorialError('La fecha no puede invertir el orden de las dosis ya registradas');
    }
    const [[paciente]]=await db.query('SELECT * FROM pacientes WHERE id=?',[registro.paciente_id]);
    const [catalogo]=await db.query('SELECT * FROM dosis WHERE vacuna_id=?',[registro.vacuna_id]);
    const [historial]=await db.query('SELECT dosis_id,fecha_aplicacion FROM historial_vacunacion WHERE paciente_id=?',[registro.paciente_id]);
    const propuesta=historial.map(h=>h.dosis_id===registro.dosis_id?{...h,fecha_aplicacion:data.fechaAplicacion}:h);
    for(const h of propuesta){
     const d=catalogo.find(d=>d.id===h.dosis_id);if(!d)continue;
     if(d.id===registro.dosis_id || d.regla_calendario?.programacion?.dosisId===registro.dosis_id || (d.numero_dosis===registro.numero_dosis+1 && d.intervalo_minimo_dias>0))
      await validarAplicacion(db,paciente,d,h.fecha_aplicacion,propuesta);
    }
    const previo = await historialModel.findById(id, db);
    const resultado = await historialModel.update(id, data, db);
    await auditoriaModel.create({ usuarioId: auditor.usuarioId || null, accion: 'EDITAR', entidad: 'historial_vacunacion', entidadId: id,
      datosPrevios: previo, datosNuevos: resultado, ip: auditor.ip, userAgent: auditor.userAgent }, db);
    return resultado;
  });
  try { await alertaService.generarAlertasPaciente(actualizado.paciente_id); }
  catch (error) {
    console.error('[ALERTAS] Corrección guardada; actualización pendiente:', error.message);
    actualizado.advertencias = ['La corrección se guardó, pero no se pudieron actualizar las alertas.'];
  }
  return actualizado;
}
module.exports = { listarPorPaciente, editarRegistro, HistorialError };
