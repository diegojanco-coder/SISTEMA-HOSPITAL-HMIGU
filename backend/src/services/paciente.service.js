const { pool } = require('../config/db');
const { esFechaISOValida } = require('../utils/validation.util');
const pacienteModel = require('../models/paciente.model');
const dosisModel = require('../models/dosis.model');
const historialModel = require('../models/historial.model');
const motor = require('./motorVacunacion.service');
const { calcularEdadExacta, formatearEdad } = require('../utils/edad.util');

class PacienteError extends Error {
  constructor(message, status = 422) { super(message); this.status = status; }
}

function validarReglasPaciente(data) {
  const fecha = new Date(`${data.fechaNacimiento}T00:00:00`);
  if (!esFechaISOValida(data.fechaNacimiento) || Number.isNaN(fecha.getTime()) || fecha > new Date()) throw new PacienteError('La fecha de nacimiento no puede ser posterior a la fecha actual');
  if ((calcularEdadExacta(data.fechaNacimiento).anios < 18 || data.esDependiente) && !data.tutorId && !data.tutor && !data.tieneTutor) throw new PacienteError('Todo paciente menor de 18 años o dependiente debe estar vinculado a un tutor');
}

async function listar(filtros) {
  const { rows, total } = await pacienteModel.findAll(filtros);
  const rowsConEdad = rows.map((p) => {
    const edad = calcularEdadExacta(p.fecha_nacimiento);
    return { ...p, edad, edad_meses: (edad.anios * 12) + edad.meses, edad_formateada: formatearEdad(edad) };
  });
  return { rows: rowsConEdad, total, page: Number(filtros.page) || 1, limit: Number(filtros.limit) || 10 };
}

async function obtener(id) {
  const paciente = await pacienteModel.findById(id);
  if (!paciente) return null;
  const tutores = await pacienteModel.findTutoresByPacienteId(id);
  const edad = calcularEdadExacta(paciente.fecha_nacimiento);
  return { ...paciente, edad, edad_meses: (edad.anios * 12) + edad.meses, edad_formateada: formatearEdad(edad), tutores };
}

async function obtenerEsquema(id) {
  const paciente = await pacienteModel.findById(id);
  if (!paciente) return null;
  const catalogoDosis = await dosisModel.findAllConVacuna();
  const historial = await historialModel.findByPacienteId(id);
  return motor.evaluarEsquema(paciente, catalogoDosis, historial);
}

async function guardar(id, data) {
 const conn = await pool.getConnection();
 try {
  await conn.beginTransaction();
  // Lock the patient rows while allocating the sequential patient code.
  await conn.query('SELECT id FROM pacientes ORDER BY id FOR UPDATE');
  const previo = id ? await pacienteModel.findById(id, conn) : null;
  if (id && !previo) throw new PacienteError('Paciente no encontrado',404);
  const [vinculos] = id ? await conn.query("SELECT t.id FROM tutores t JOIN paciente_tutor pt ON pt.tutor_id=t.id WHERE pt.paciente_id=? AND pt.estado='activo' AND t.estado='activo' FOR UPDATE",[id]) : [[]];
  const datos = {...data, departamento:data.departamento ?? previo?.departamento, esDependiente:data.esDependiente ?? Boolean(previo?.es_dependiente), tieneTutor:vinculos.length>0};
  validarReglasPaciente(datos);
  let tutorId=data.tutorId;
  if(tutorId && data.tutor) throw new PacienteError('Seleccione un tutor existente o registre uno nuevo');
  if(tutorId) {
   const [rows]=await conn.query("SELECT id FROM tutores WHERE id=? AND estado='activo' FOR UPDATE",[tutorId]);
   if(!rows.length) throw new PacienteError('Tutor no encontrado o inactivo');
  } else if(data.tutor) {
   const t=data.tutor;
   const [result]=await conn.query('INSERT INTO tutores (nombres,apellidos,carnet_identidad,parentesco,telefono,email,direccion) VALUES (?,?,?,?,?,?,?)',[t.nombres,t.apellidos,t.carnetIdentidad,t.parentesco,t.telefono,t.email,t.direccion||null]);
   tutorId=result.insertId;
  }
  const paciente=id ? await pacienteModel.update(id,datos,conn) : await pacienteModel.create(datos,conn);
  if(tutorId) await conn.query('INSERT INTO paciente_tutor (paciente_id,tutor_id,es_principal) VALUES (?,?,?) ON DUPLICATE KEY UPDATE es_principal=IF(estado=\'inactivo\',VALUES(es_principal),es_principal), estado=\'activo\'',[paciente.id,tutorId,vinculos.length?0:1]);
  await conn.commit();
  return paciente;
 } catch(error) { await conn.rollback(); throw error; }
 finally { conn.release(); }
}
async function crear(data) {
 for (let intento = 0; ; intento++) {
  try { return await guardar(null,data); }
  catch (error) {
   if (error.code !== 'ER_LOCK_DEADLOCK' || intento >= 2) throw error;
  }
 }
}
async function actualizar(id,data) { return guardar(id,data); }

async function desactivar(id) {
  return pacienteModel.desactivar(id);
}

module.exports = { listar, obtener, obtenerEsquema, crear, actualizar, desactivar, PacienteError };
