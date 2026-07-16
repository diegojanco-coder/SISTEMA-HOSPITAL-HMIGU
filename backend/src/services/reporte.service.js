const { pool } = require('../config/db');
const pacienteModel = require('../models/paciente.model');
const dosisModel = require('../models/dosis.model');
const historialModel = require('../models/historial.model');
const motor = require('./motorVacunacion.service');
const { crearDocumentoConEncabezado, dibujarTablaSimple } = require('../utils/pdf.util');
const { construirExcel } = require('../utils/excel.util');

class ReporteError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** RF21.a - Pacientes registrados */
async function pacientesRegistrados() {
  const [rows] = await pool.query(
    `SELECT codigo_paciente, nombres, apellidos, sexo, fecha_nacimiento, telefono_contacto, created_at
     FROM pacientes WHERE estado = 'activo' ORDER BY created_at DESC`
  );
  return {
    titulo: 'Pacientes registrados',
    columnas: [
      { key: 'codigo_paciente', header: 'Código', width: 15 },
      { key: 'nombres', header: 'Nombres', width: 20 },
      { key: 'apellidos', header: 'Apellidos', width: 20 },
      { key: 'sexo', header: 'Sexo', width: 8 },
      { key: 'fecha_nacimiento', header: 'F. Nacimiento', width: 14 },
      { key: 'telefono_contacto', header: 'Teléfono', width: 15 }
    ],
    filas: rows
  };
}

/** RF21.b - Vacunas aplicadas (rango de fechas) */
async function vacunasAplicadas({ desde, hasta }) {
  if (!desde || !hasta) throw new ReporteError('Debe indicar el rango de fechas (desde, hasta)');
  const [rows] = await pool.query(
    `SELECT p.codigo_paciente, p.nombres, p.apellidos, v.nombre AS vacuna, d.nombre_dosis,
            h.fecha_aplicacion, h.lote, u.nombre_completo AS aplicado_por
     FROM historial_vacunacion h
     INNER JOIN pacientes p ON p.id = h.paciente_id
     INNER JOIN dosis d ON d.id = h.dosis_id
     INNER JOIN vacunas v ON v.id = d.vacuna_id
     LEFT JOIN usuarios u ON u.id = h.usuario_id
     WHERE h.fecha_aplicacion BETWEEN ? AND ?
     ORDER BY h.fecha_aplicacion DESC`,
    [desde, hasta]
  );
  return {
    titulo: `Vacunas aplicadas (${desde} a ${hasta})`,
    columnas: [
      { key: 'codigo_paciente', header: 'Código', width: 14 },
      { key: 'nombres', header: 'Nombres', width: 16 },
      { key: 'apellidos', header: 'Apellidos', width: 16 },
      { key: 'vacuna', header: 'Vacuna', width: 20 },
      { key: 'nombre_dosis', header: 'Dosis', width: 18 },
      { key: 'fecha_aplicacion', header: 'Fecha', width: 12 },
      { key: 'aplicado_por', header: 'Aplicado por', width: 18 }
    ],
    filas: rows
  };
}

/** RF21.c - Vacunas pendientes (todas las categorías: proxima/pendiente/atrasada) */
async function vacunasPendientes() {
  const { rows: pacientes } = await pacienteModel.findAll({ page: 1, limit: 100000, q: '' });
  const catalogoDosis = await dosisModel.findAllConVacuna();
  const filas = [];
  for (const paciente of pacientes) {
    const historial = await historialModel.findByPacienteId(paciente.id);
    const { detalle } = motor.evaluarEsquema(paciente, catalogoDosis, historial);
    detalle
      .filter((d) => ['proxima', 'pendiente', 'atrasada'].includes(d.estado))
      .forEach((d) => filas.push({
        codigo_paciente: paciente.codigo_paciente,
        nombres: paciente.nombres,
        apellidos: paciente.apellidos,
        vacuna: d.vacunaNombre,
        nombre_dosis: d.nombreDosis,
        estado: d.estado,
        fecha_limite: d.fechaLimite
      }));
  }
  return {
    titulo: 'Vacunas pendientes / próximas / atrasadas',
    columnas: [
      { key: 'codigo_paciente', header: 'Código', width: 14 },
      { key: 'nombres', header: 'Nombres', width: 16 },
      { key: 'apellidos', header: 'Apellidos', width: 16 },
      { key: 'vacuna', header: 'Vacuna', width: 20 },
      { key: 'nombre_dosis', header: 'Dosis', width: 18 },
      { key: 'estado', header: 'Estado', width: 12 },
      { key: 'fecha_limite', header: 'Fecha límite', width: 14 }
    ],
    filas
  };
}

/** RF21.d - Cobertura de vacunación (por vacuna: % de dosis aplicadas sobre esperadas) */
async function coberturaVacunacion() {
  const { rows: pacientes } = await pacienteModel.findAll({ page: 1, limit: 100000, q: '' });
  const catalogoDosis = await dosisModel.findAllConVacuna();
  const acumulado = new Map(); // vacuna -> { esperadas, aplicadas }

  for (const paciente of pacientes) {
    const historial = await historialModel.findByPacienteId(paciente.id);
    const { detalle } = motor.evaluarEsquema(paciente, catalogoDosis, historial);
    detalle
      .filter((d) => d.estado !== 'futura')
      .forEach((d) => {
        const actual = acumulado.get(d.vacunaNombre) || { esperadas: 0, aplicadas: 0 };
        actual.esperadas += 1;
        if (d.estado === 'aplicada') actual.aplicadas += 1;
        acumulado.set(d.vacunaNombre, actual);
      });
  }

  const filas = Array.from(acumulado.entries()).map(([vacuna, v]) => ({
    vacuna,
    esperadas: v.esperadas,
    aplicadas: v.aplicadas,
    cobertura: v.esperadas > 0 ? `${((v.aplicadas / v.esperadas) * 100).toFixed(1)}%` : '0%'
  }));

  return {
    titulo: 'Cobertura de vacunación por vacuna',
    columnas: [
      { key: 'vacuna', header: 'Vacuna', width: 25 },
      { key: 'esperadas', header: 'Dosis esperadas', width: 16 },
      { key: 'aplicadas', header: 'Dosis aplicadas', width: 16 },
      { key: 'cobertura', header: 'Cobertura', width: 14 }
    ],
    filas
  };
}

/** RF21.e - Pacientes por rango de edad (en años) */
async function pacientesPorRangoEdad({ edadMin = 0, edadMax = 18 } = {}) {
  const [rows] = await pool.query(
    `SELECT codigo_paciente, nombres, apellidos, fecha_nacimiento, sexo,
            TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) AS edad_anios
     FROM pacientes
     WHERE estado = 'activo'
       AND TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) BETWEEN ? AND ?
     ORDER BY edad_anios ASC`,
    [edadMin, edadMax]
  );
  return {
    titulo: `Pacientes entre ${edadMin} y ${edadMax} años`,
    columnas: [
      { key: 'codigo_paciente', header: 'Código', width: 14 },
      { key: 'nombres', header: 'Nombres', width: 18 },
      { key: 'apellidos', header: 'Apellidos', width: 18 },
      { key: 'sexo', header: 'Sexo', width: 8 },
      { key: 'edad_anios', header: 'Edad (años)', width: 14 }
    ],
    filas: rows
  };
}

/** RF21.f - Vacunas por fecha específica */
async function vacunasPorFecha({ fecha }) {
  if (!fecha) throw new ReporteError('Debe indicar la fecha');
  const [rows] = await pool.query(
    `SELECT p.codigo_paciente, p.nombres, p.apellidos, v.nombre AS vacuna, d.nombre_dosis, h.lote
     FROM historial_vacunacion h
     INNER JOIN pacientes p ON p.id = h.paciente_id
     INNER JOIN dosis d ON d.id = h.dosis_id
     INNER JOIN vacunas v ON v.id = d.vacuna_id
     WHERE h.fecha_aplicacion = ?`,
    [fecha]
  );
  return {
    titulo: `Vacunas aplicadas el ${fecha}`,
    columnas: [
      { key: 'codigo_paciente', header: 'Código', width: 14 },
      { key: 'nombres', header: 'Nombres', width: 18 },
      { key: 'apellidos', header: 'Apellidos', width: 18 },
      { key: 'vacuna', header: 'Vacuna', width: 20 },
      { key: 'nombre_dosis', header: 'Dosis', width: 18 },
      { key: 'lote', header: 'Lote', width: 12 }
    ],
    filas: rows
  };
}

const GENERADORES = {
  'pacientes-registrados': pacientesRegistrados,
  'vacunas-aplicadas': vacunasAplicadas,
  'vacunas-pendientes': vacunasPendientes,
  'cobertura-vacunacion': coberturaVacunacion,
  'pacientes-por-edad': pacientesPorRangoEdad,
  'vacunas-por-fecha': vacunasPorFecha
};

async function generarReporte(tipo, params) {
  const generador = GENERADORES[tipo];
  if (!generador) throw new ReporteError(`Tipo de reporte no soportado: ${tipo}`);
  return generador(params);
}

function generarPDF({ titulo, columnas, filas }) {
  const doc = crearDocumentoConEncabezado('Reporte del Sistema', titulo);
  const colWidths = columnas.map((c) => c.width * 5.2);
  dibujarTablaSimple(doc, {
    headers: columnas.map((c) => c.header),
    rows: filas.map((f) => columnas.map((c) => f[c.key])),
    startY: 115,
    colWidths
  });
  return doc; // El controlador hace pipe(res) y end()
}

async function generarExcel({ titulo, columnas, filas }) {
  return construirExcel({ nombreHoja: 'Reporte', columnas, filas, titulo });
}

module.exports = { generarReporte, generarPDF, generarExcel, ReporteError, GENERADORES };
