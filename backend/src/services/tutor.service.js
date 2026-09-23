const tutorModel = require('../models/tutor.model');
const transaction = require('../utils/transaction.util');
const { calcularEdadExacta } = require('../utils/edad.util');
const pacienteModel = require('../models/paciente.model');
const { resolverContactoPaciente } = require('../utils/contactoPaciente.util');
class TutorError extends Error {
  constructor(message, status = 409) { super(message); this.status = status; }
}
async function listar(filtros) {
  const { rows, total } = await tutorModel.findAll(filtros);
  return { rows, total, page: Number(filtros.page) || 1, limit: Number(filtros.limit) || 10 };
}
async function obtener(id) {
  const tutor = await tutorModel.findById(id);
  if (!tutor) return null;
  return { ...tutor, pacientes: await tutorModel.findPacientesByTutorId(id) };
}
// Same lock order as patient registration: patients first, then tutors and links.
async function bloquearPacientes(db) {
  await db.query('SELECT id FROM pacientes ORDER BY id FOR UPDATE');
}
async function tutorActivo(db, id) {
  const [[tutor]] = await db.query('SELECT * FROM tutores WHERE id = ? FOR UPDATE', [id]);
  if (!tutor) throw new TutorError('Tutor no encontrado', 404);
  if (tutor.estado !== 'activo') throw new TutorError('El tutor está inactivo');
  return tutor;
}
async function normalizarPrincipal(db, pacienteId) {
  const [rows] = await db.query("SELECT pt.tutor_id FROM paciente_tutor pt JOIN tutores t ON t.id=pt.tutor_id WHERE pt.paciente_id=? AND pt.estado='activo' AND t.estado='activo' ORDER BY pt.es_principal DESC, pt.tutor_id FOR UPDATE", [pacienteId]);
  await db.query('UPDATE paciente_tutor SET es_principal = (tutor_id = ?) WHERE paciente_id = ?', [rows[0]?.tutor_id || 0, pacienteId]);
  await marcarContactoPendiente(db,pacienteId);
}
async function marcarContactoPendiente(db,pacienteId) {
  const paciente=await pacienteModel.findById(pacienteId,db);
  if(!paciente)return;
  const tutores=await pacienteModel.findTutoresByPacienteId(pacienteId,db);
  const contacto=resolverContactoPaciente(paciente,tutores);
  const requiereTutor=paciente.es_dependiente || calcularEdadExacta(paciente.fecha_nacimiento).anios<18;
  if(paciente.identidad_provisional || !contacto.email?.trim() || !contacto.telefono?.trim() ||
      (requiereTutor && (!tutores[0]?.email?.trim() || !tutores[0]?.telefono?.trim()))) {
    await db.query('UPDATE pacientes SET registro_pendiente=1 WHERE id=?',[pacienteId]);
  }
}
async function comprobarResponsable(db, pacienteId, tutorId) {
  const [[paciente]] = await db.query('SELECT * FROM pacientes WHERE id=? FOR UPDATE', [pacienteId]);
  if (!paciente) throw new TutorError('Paciente no encontrado', 404);
  if (paciente.estado === 'activo' && (paciente.es_dependiente || calcularEdadExacta(paciente.fecha_nacimiento).anios < 18)) {
    const [otros] = await db.query("SELECT t.id FROM tutores t JOIN paciente_tutor pt ON pt.tutor_id=t.id WHERE pt.paciente_id=? AND t.id<>? AND t.estado='activo' AND pt.estado='activo' FOR UPDATE", [pacienteId, tutorId]);
    if (!otros.length) throw new TutorError('No se puede retirar al único tutor activo de un menor o paciente dependiente. Vincule primero otro responsable.');
  }
}
async function vincular(db, tutorId, pacienteId, esPrincipal) {
  const [[paciente]] = await db.query("SELECT id FROM pacientes WHERE id=? AND estado='activo' FOR UPDATE", [pacienteId]);
  if (!paciente) throw new TutorError('Paciente no encontrado o inactivo', 404);
  await tutorActivo(db, tutorId);
  if (esPrincipal) await db.query('UPDATE paciente_tutor SET es_principal=0 WHERE paciente_id=?', [pacienteId]);
  await db.query("INSERT INTO paciente_tutor (paciente_id,tutor_id,es_principal) VALUES (?,?,?) ON DUPLICATE KEY UPDATE es_principal=IF(VALUES(es_principal)=1,1,es_principal), estado='activo'", [pacienteId, tutorId, esPrincipal ? 1 : 0]);
  await normalizarPrincipal(db, pacienteId);
}
async function crear(data) {
  return transaction(async db => {
    await bloquearPacientes(db);
    const tutor = await tutorModel.create(data, db);
    if (data.pacienteId) await vincular(db, tutor.id, data.pacienteId, true);
    return tutor;
  });
}
async function actualizar(id, data) {
  return transaction(async db => {
    await bloquearPacientes(db);
    await tutorActivo(db,id);
    const tutor=await tutorModel.update(id,data,db);
    const [vinculos]=await db.query("SELECT paciente_id FROM paciente_tutor WHERE tutor_id=? AND estado='activo'",[id]);
    for(const vinculo of vinculos)await marcarContactoPendiente(db,vinculo.paciente_id);
    return tutor;
  });
}
async function desactivar(id) {
  return transaction(async db => {
    await bloquearPacientes(db);
    await tutorActivo(db, id);
    const [links] = await db.query("SELECT paciente_id FROM paciente_tutor WHERE tutor_id=? AND estado='activo' FOR UPDATE", [id]);
    for (const link of links) await comprobarResponsable(db, link.paciente_id, id);
    await db.query("UPDATE tutores SET estado='inactivo' WHERE id=?", [id]);
    for (const link of links) await normalizarPrincipal(db, link.paciente_id);
  });
}
async function vincularPaciente(tutorId, pacienteId, esPrincipal = false) {
  return transaction(async db => {
    await bloquearPacientes(db);
    await vincular(db, tutorId, pacienteId, esPrincipal);
  });
}
async function desvincularPaciente(tutorId, pacienteId) {
  return transaction(async db => {
    await bloquearPacientes(db);
    const [[link]] = await db.query("SELECT id FROM paciente_tutor WHERE tutor_id=? AND paciente_id=? AND estado='activo' FOR UPDATE", [tutorId, pacienteId]);
    if (!link) throw new TutorError('El vínculo no existe o ya está inactivo', 404);
    await comprobarResponsable(db, pacienteId, tutorId);
    await db.query("UPDATE paciente_tutor SET estado='inactivo',es_principal=0 WHERE id=?", [link.id]);
    await normalizarPrincipal(db, pacienteId);
  });
}
module.exports = { listar, obtener, crear, actualizar, desactivar, vincularPaciente, desvincularPaciente, TutorError };
