const { pool } = require('../config/db');
const { esFechaISOValida, esTelefonoBoliviano } = require('../utils/validation.util');
const isEmail = require('validator/lib/isEmail');
const { resolverContactoPaciente } = require('../utils/contactoPaciente.util');
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
  const [tutores] = rows.length ? await pool.query(`SELECT t.*,pt.paciente_id,pt.es_principal
    FROM paciente_tutor pt JOIN tutores t ON t.id=pt.tutor_id
    WHERE pt.paciente_id IN (?) AND pt.estado='activo' AND t.estado='activo'`,[rows.map(p=>p.id)]) : [[]];
  const rowsConEdad = rows.map((p) => {
    const edad = calcularEdadExacta(p.fecha_nacimiento);
    return { ...p, edad, edad_meses: (edad.anios * 12) + edad.meses, edad_formateada: formatearEdad(edad),
      contacto_principal: resolverContactoPaciente(p,tutores.filter(t=>t.paciente_id===p.id)) };
  });
  return { rows: rowsConEdad, total, page: Number(filtros.page) || 1, limit: Number(filtros.limit) || 10 };
}

async function obtener(id) {
  const paciente = await pacienteModel.findById(id);
  if (!paciente) return null;
  const tutores = await pacienteModel.findTutoresByPacienteId(id);
  const edad = calcularEdadExacta(paciente.fecha_nacimiento);
  return { ...paciente, edad, edad_meses: (edad.anios * 12) + edad.meses, edad_formateada: formatearEdad(edad), tutores,
    contacto_principal: resolverContactoPaciente(paciente,tutores) };
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
  const [vinculos] = id ? await conn.query("SELECT t.*,pt.es_principal FROM tutores t JOIN paciente_tutor pt ON pt.tutor_id=t.id WHERE pt.paciente_id=? AND pt.estado='activo' AND t.estado='activo' ORDER BY pt.es_principal DESC,t.id FOR UPDATE",[id]) : [[]];
  const datos = {...data, departamento:data.departamento ?? previo?.departamento,
    certificadoNacimiento:data.certificadoNacimiento ?? previo?.certificado_nacimiento ?? '',
    esDependiente:data.esDependiente ?? Boolean(previo?.es_dependiente), tieneTutor:vinculos.length>0};
  validarReglasPaciente(datos);
  const menor = calcularEdadExacta(datos.fechaNacimiento).anios < 18;
  if (data.tipoPaciente && data.tipoPaciente !== (menor ? 'menor' : 'adulto')) throw new PacienteError('La fecha de nacimiento no corresponde al tipo de paciente seleccionado');
  datos.identidadProvisional = data.identidadProvisional ?? Boolean(previo?.identidad_provisional);
  if (datos.identidadProvisional && !menor) throw new PacienteError('La identidad provisional solo corresponde a menores');
  if (datos.identidadProvisional) {
    datos.nombres = 'Recién nacido';
    datos.apellidos = datos.apellidos?.trim() || 'Por confirmar';
  }
  datos.carnetIdentidad = datos.carnetIdentidad?.trim() || '';
  datos.certificadoNacimiento = datos.certificadoNacimiento?.trim().toUpperCase() || '';
  if (datos.carnetIdentidad || datos.certificadoNacimiento) {
    const condiciones=[]; const parametros=[];
    if(datos.carnetIdentidad){condiciones.push('carnet_identidad=?');parametros.push(datos.carnetIdentidad);}
    if(datos.certificadoNacimiento){condiciones.push('certificado_nacimiento=?');parametros.push(datos.certificadoNacimiento);}
    if(id){parametros.push(id);}
    const [duplicados]=await conn.query(`SELECT id,codigo_paciente,carnet_identidad,certificado_nacimiento FROM pacientes
      WHERE (${condiciones.join(' OR ')})${id?' AND id<>?':''} LIMIT 1 FOR UPDATE`,parametros);
    if(duplicados.length)throw new PacienteError(`Ya existe el paciente ${duplicados[0].codigo_paciente} con ese documento`,409);
  }
  datos.contactoAlertas = data.contactoAlertas || (menor || datos.esDependiente ? 'tutor' : 'paciente');
  if (!['paciente','tutor'].includes(datos.contactoAlertas) || (menor && datos.contactoAlertas !== 'tutor') ||
      (!menor && !datos.esDependiente && datos.contactoAlertas !== 'paciente')) throw new PacienteError('Seleccione el contacto correspondiente al tipo de paciente');
  if (menor) { datos.email = null; datos.telefonoContacto = null; }
  let tutorId=data.tutorId;
  let principal = vinculos[0] || null;
  if(tutorId && data.tutor) throw new PacienteError('Seleccione un tutor existente o registre uno nuevo');
  if(tutorId) {
   const [rows]=await conn.query("SELECT * FROM tutores WHERE id=? AND estado='activo' FOR UPDATE",[tutorId]);
   if(!rows.length) throw new PacienteError('Tutor no encontrado o inactivo');
   principal = rows[0];
  } else if(data.tutor) {
   const t=data.tutor;
   validarContacto(t.telefono,t.email,Boolean(data.guardarPrerregistro));
   const [result]=await conn.query('INSERT INTO tutores (nombres,apellidos,carnet_identidad,parentesco,telefono,email,direccion) VALUES (?,?,?,?,?,?,?)',[t.nombres,t.apellidos,t.carnetIdentidad?.trim()||null,t.parentesco,t.telefono.trim(),t.email?.trim()||null,t.direccion||null]);
   tutorId=result.insertId;
   principal = { ...t, id:tutorId,estado:'activo',es_principal:1 };
  }
  if(menor || datos.esDependiente) validarContacto(principal?.telefono,principal?.email,Boolean(data.guardarPrerregistro));
  const contacto = datos.contactoAlertas === 'tutor' ? principal : { telefono:datos.telefonoContacto,email:datos.email };
  validarContacto(contacto?.telefono,contacto?.email,Boolean(data.guardarPrerregistro));
  datos.registroPendiente = datos.identidadProvisional || !contacto?.email?.trim() ||
    ((menor || datos.esDependiente) && !principal?.email?.trim());
  if (datos.registroPendiente && !data.guardarPrerregistro) throw new PacienteError('Confirme guardar el prerregistro pendiente de completar');
  if (datos.contactoAlertas === 'tutor') { datos.email = null; datos.telefonoContacto = null; }
  else { datos.email = datos.email?.trim() || null; datos.telefonoContacto = datos.telefonoContacto.trim(); }
  const paciente=id ? await pacienteModel.update(id,datos,conn) : await pacienteModel.create(datos,conn);
  if(tutorId) {
    await conn.query('UPDATE paciente_tutor SET es_principal=0 WHERE paciente_id=?',[paciente.id]);
    await conn.query("INSERT INTO paciente_tutor (paciente_id,tutor_id,es_principal) VALUES (?,?,1) ON DUPLICATE KEY UPDATE es_principal=1, estado='activo'",[paciente.id,tutorId]);
  }
  const tutores = await pacienteModel.findTutoresByPacienteId(paciente.id,conn);
  await conn.commit();
  const edad = calcularEdadExacta(paciente.fecha_nacimiento);
  return {...paciente,tutores,edad,edad_formateada:formatearEdad(edad),contacto_principal:resolverContactoPaciente(paciente,tutores)};
 } catch(error) {
   await conn.rollback();
   if(error.code==='ER_DUP_ENTRY') throw new PacienteError('Ya existe un paciente o tutor con ese documento. Busque el registro existente.',409);
   throw error;
 }
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

function validarContacto(telefono,email,prerregistro) {
  if (!telefono || !esTelefonoBoliviano(String(telefono).trim())) throw new PacienteError('El teléfono del contacto principal es obligatorio y debe ser válido');
  if (!email?.trim()) {
    if (!prerregistro) throw new PacienteError('El correo del contacto principal es obligatorio. Si no dispone de correo, guarde un prerregistro.');
  } else if (email.trim().length>120 || !isEmail(email.trim())) throw new PacienteError('Ingrese un correo válido para el contacto principal');
}

async function desactivar(id) {
  return pacienteModel.desactivar(id);
}

module.exports = { listar, obtener, obtenerEsquema, crear, actualizar, desactivar, PacienteError };
