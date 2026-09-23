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
function textoRequerido(valor, maximo, campo) {
 if(typeof valor!=='string' || !valor.trim() || valor.trim().length>maximo)throw new HistorialError(`${campo} es obligatorio y admite hasta ${maximo} caracteres`);
 return valor.trim();
}
async function validarHistoriaAfectada(db,paciente,dosisModificada,propuesta){
 const [catalogo]=await db.query('SELECT d.* FROM dosis d JOIN historial_vacunacion h ON h.dosis_id=d.id WHERE h.paciente_id=?',[paciente.id]);
 if(!catalogo.some(d=>d.id===dosisModificada.id))catalogo.push(dosisModificada);
 for(const h of propuesta){
  const d=catalogo.find(d=>d.id===h.dosis_id);if(!d)continue;
  let regla=d.regla_calendario;
  try{if(typeof regla==='string')regla=JSON.parse(regla);}catch{if(d.id===dosisModificada.id)throw new HistorialError('La regla requiere revisión');}
  if(d.id===dosisModificada.id || regla?.programacion?.dosisId===dosisModificada.id || (d.vacuna_id===dosisModificada.vacuna_id && d.numero_dosis===dosisModificada.numero_dosis+1 && d.intervalo_minimo_dias>0))
   await validarAplicacion(db,paciente,d,h.fecha_aplicacion,propuesta);
 }
}
async function registrarAntecedente(data, auditor = {}) {
 if(!Number.isInteger(data.pacienteId) || data.pacienteId<1 || !Number.isInteger(data.dosisId) || data.dosisId<1)throw new HistorialError('Seleccione paciente y dosis válidos');
 if(!esFechaISOValida(data.fechaAplicacion))throw new HistorialError('La fecha de aplicación debe ser válida');
 const establecimiento=textoRequerido(data.establecimiento,150,'El establecimiento de origen');
 const documento=textoRequerido(data.documentoReferencia,200,'La referencia del documento');
 if(data.observaciones!=null && (typeof data.observaciones!=='string' || data.observaciones.length>255))throw new HistorialError('Las observaciones admiten hasta 255 caracteres');
 if(!Number.isInteger(auditor.usuarioId) || auditor.usuarioId<1)throw new HistorialError('Se requiere el usuario que registra el antecedente');
 const registro=await transaction(async db=>{
  const [[paciente]]=await db.query("SELECT *,CURDATE() hoy FROM pacientes WHERE id=? AND estado='activo' FOR UPDATE",[data.pacienteId]);
  if(!paciente)throw new HistorialError('Paciente no encontrado o inactivo',404);
  if(data.fechaAplicacion>paciente.hoy)throw new HistorialError('La fecha de aplicación no puede ser futura');
  const [[dosis]]=await db.query("SELECT d.* FROM dosis d JOIN vacunas v ON v.id=d.vacuna_id WHERE d.id=? AND d.estado='activo' AND v.estado='activo'",[data.dosisId]);
  if(!dosis)throw new HistorialError('Dosis no encontrada o inactiva',404);
  const [historial]=await db.query('SELECT dosis_id,fecha_aplicacion FROM historial_vacunacion WHERE paciente_id=?',[data.pacienteId]);
  if(historial.some(h=>h.dosis_id===data.dosisId))throw new HistorialError('Esta dosis ya está registrada para el paciente',409);
  const [otras]=await db.query('SELECT h.fecha_aplicacion,d.numero_dosis FROM historial_vacunacion h JOIN dosis d ON d.id=h.dosis_id WHERE h.paciente_id=? AND d.vacuna_id=?',[data.pacienteId,dosis.vacuna_id]);
  if(otras.some(d=>(d.numero_dosis<dosis.numero_dosis && d.fecha_aplicacion>data.fechaAplicacion)||(d.numero_dosis>dosis.numero_dosis && d.fecha_aplicacion<data.fechaAplicacion)))throw new HistorialError('La fecha no puede invertir el orden de las dosis ya registradas');
  await validarHistoriaAfectada(db,paciente,dosis,[...historial,{dosis_id:dosis.id,fecha_aplicacion:data.fechaAplicacion}]);
  // Procedencia fija: los datos recibidos no pueden crear cita ni consumir lote local.
  const [nuevo]=await db.query("INSERT INTO historial_vacunacion(paciente_id,dosis_id,usuario_id,cita_id,lote_vacuna_id,fecha_aplicacion,establecimiento,observaciones,origen,documento_referencia) VALUES (?,?,?,NULL,NULL,?,?,?,'externo',?)",[data.pacienteId,data.dosisId,auditor.usuarioId,data.fechaAplicacion,establecimiento,data.observaciones?.trim()||null,documento]);
  const guardado=await historialModel.findById(nuevo.insertId,db);
  await auditoriaModel.create({usuarioId:auditor.usuarioId,accion:'CREAR',entidad:'historial_vacunacion',entidadId:guardado.id,datosNuevos:guardado,ip:auditor.ip,userAgent:auditor.userAgent},db);
  return guardado;
 });
 try {await alertaService.generarAlertasPaciente(registro.paciente_id);}catch{registro.advertencias=['El antecedente se guardó, pero no se pudieron actualizar las alertas.'];}
 return registro;
}
async function editarRegistro(id, data, auditor = {}) {
  if (!esFechaISOValida(data.fechaAplicacion)) throw new HistorialError('La fecha de aplicación debe ser válida');
  const actualizado = await transaction(async db => {
    const [[referencia]] = await db.query('SELECT paciente_id FROM historial_vacunacion WHERE id=?', [id]);
    if (!referencia) throw new HistorialError('Registro de historial no encontrado', 404);
    await db.query('SELECT id FROM pacientes WHERE id=? FOR UPDATE', [referencia.paciente_id]);
    const [[registro]] = await db.query(`SELECT h.*, p.fecha_nacimiento, lv.fecha_vencimiento, d.vacuna_id, d.numero_dosis, CURDATE() AS hoy
      FROM historial_vacunacion h JOIN pacientes p ON p.id=h.paciente_id
      LEFT JOIN lotes_vacuna lv ON lv.id=h.lote_vacuna_id JOIN dosis d ON d.id=h.dosis_id
      WHERE h.id=? FOR UPDATE`, [id]);
    if (data.fechaAplicacion > registro.hoy) throw new HistorialError('La fecha de aplicación no puede ser futura');
    if (data.fechaAplicacion < registro.fecha_nacimiento) throw new HistorialError('La aplicación no puede ser anterior al nacimiento');
    if (registro.fecha_vencimiento && data.fechaAplicacion > registro.fecha_vencimiento) throw new HistorialError('La aplicación no puede ser posterior al vencimiento del lote');
    if(registro.origen==='externo'){
     data={...data,establecimiento:textoRequerido(data.establecimiento,150,'El establecimiento de origen'),documentoReferencia:textoRequerido(data.documentoReferencia??registro.documento_referencia,200,'La referencia del documento')};
    }else if(data.documentoReferencia!=null)throw new HistorialError('Una aplicación local no admite documento de antecedente externo');
    const [otras] = await db.query(`SELECT h.fecha_aplicacion, d.numero_dosis FROM historial_vacunacion h JOIN dosis d ON d.id=h.dosis_id
      WHERE h.paciente_id=? AND d.vacuna_id=? AND h.id<>? FOR UPDATE`, [registro.paciente_id, registro.vacuna_id, id]);
    if (otras.some(d => (d.numero_dosis < registro.numero_dosis && d.fecha_aplicacion > data.fechaAplicacion) || (d.numero_dosis > registro.numero_dosis && d.fecha_aplicacion < data.fechaAplicacion))) {
      throw new HistorialError('La fecha no puede invertir el orden de las dosis ya registradas');
    }
    const [[paciente]]=await db.query('SELECT * FROM pacientes WHERE id=?',[registro.paciente_id]);
    const [historial]=await db.query('SELECT dosis_id,fecha_aplicacion FROM historial_vacunacion WHERE paciente_id=?',[registro.paciente_id]);
    const propuesta=historial.map(h=>h.dosis_id===registro.dosis_id?{...h,fecha_aplicacion:data.fechaAplicacion}:h);
    const [[dosisEditada]]=await db.query('SELECT * FROM dosis WHERE id=?',[registro.dosis_id]);
    await validarHistoriaAfectada(db,paciente,dosisEditada,propuesta);
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
module.exports = { listarPorPaciente, editarRegistro, registrarAntecedente, HistorialError };
