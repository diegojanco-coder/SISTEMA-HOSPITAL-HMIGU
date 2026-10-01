const reporteModel = require('../models/reporte.model');

class ReporteAvanzadoError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function normalizarDias(value, nombre, { min = 0, max = 3650 } = {}) {
  const numero = Number(value);
  if (!Number.isInteger(numero) || numero < min || numero > max) {
    throw new ReporteAvanzadoError(`${nombre} debe ser un entero entre ${min} y ${max}`);
  }
  return numero;
}

function normalizarFecha(value, nombre) {
  if (!value) return undefined;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(value)) {
    throw new ReporteAvanzadoError(`${nombre} debe tener formato YYYY-MM-DD`);
  }
  return value;
}

async function obtenerInventarioLotes(filtros = {}) {
  const query = {
    vacunaId: filtros.vacunaId ? Number(filtros.vacunaId) : undefined,
    estado: filtros.estado || undefined,
    stockMin: filtros.stockMin !== undefined ? Number(filtros.stockMin) : 0,
    diasMax: filtros.diasMax !== undefined ? Number(filtros.diasMax) : 30,
    page: filtros.page ? Number(filtros.page) : 1,
    limit: filtros.limit ? Number(filtros.limit) : 50
  };

  if (query.page < 1) throw new ReporteAvanzadoError('page debe ser mayor o igual a 1');
  if (query.limit < 1) throw new ReporteAvanzadoError('limit debe ser mayor o igual a 1');

  const { rows, total, page, limit } = await reporteModel.findInventarioLotes(query);

  return {
    titulo: 'Inventario de vacunas y lotes',
    filtros: {
      vacunaId: query.vacunaId || null,
      estado: query.estado || null,
      stockMin: query.stockMin,
      diasMax: query.diasMax
    },
    total,
    page,
    limit,
    rows: rows.map((row) => ({
      ...row,
      nivel_riesgo: row.nivel_riesgo || 'verde',
      estado_stock: row.estado_stock || 'disponible'
    }))
  };
}

async function obtenerLotesProximosVencer(filtros = {}) {
  const dias = normalizarDias(filtros.dias ?? 30, 'dias', { min: 1, max: 365 });

  const query = {
    dias,
    vacunaId: filtros.vacunaId ? Number(filtros.vacunaId) : undefined,
    page: filtros.page ? Number(filtros.page) : 1,
    limit: filtros.limit ? Number(filtros.limit) : 50
  };

  const rows = await reporteModel.findLotesProximosVencer(query);

  return {
    titulo: 'Lotes próximos a vencer',
    filtros: {
      dias,
      vacunaId: query.vacunaId || null,
      umbral: {
        amarillo: 30,
        rojo: 15
      }
    },
    total: rows.length,
    rows: rows.map((row) => ({
      ...row,
      semaforo: row.dias_restantes <= 15 ? 'rojo' : row.dias_restantes <= 30 ? 'amarillo' : 'verde',
      riesgo: row.dias_restantes <= 15 ? 'crítico' : row.dias_restantes <= 30 ? 'próximo' : 'normal'
    }))
  };
}

async function obtenerAuditoriaVacunacion(filtros = {}) {
  const query = {
    usuarioId: filtros.usuarioId ? Number(filtros.usuarioId) : undefined,
    pacienteId: filtros.pacienteId ? Number(filtros.pacienteId) : undefined,
    desde: normalizarFecha(filtros.desde, 'desde'),
    hasta: normalizarFecha(filtros.hasta, 'hasta'),
    page: filtros.page ? Number(filtros.page) : 1,
    limit: filtros.limit ? Number(filtros.limit) : 50
  };

  if (query.desde && query.hasta && query.desde > query.hasta) {
    throw new ReporteAvanzadoError('La fecha desde no puede ser mayor que la fecha hasta');
  }

  const { rows, total, page, limit } = await reporteModel.findAuditoriaVacunacion(query);

  return {
    titulo: 'Auditoría de vacunación',
    filtros: {
      usuarioId: query.usuarioId || null,
      pacienteId: query.pacienteId || null,
      desde: query.desde || null,
      hasta: query.hasta || null
    },
    total,
    page,
    limit,
    rows
  };
}

async function obtenerResumenVacunaciones(filtros = {}) {
  const query = {
    desde: normalizarFecha(filtros.desde, 'desde'),
    hasta: normalizarFecha(filtros.hasta, 'hasta'),
    vacunaId: filtros.vacunaId ? Number(filtros.vacunaId) : undefined,
    usuarioId: filtros.usuarioId ? Number(filtros.usuarioId) : undefined,
    page: filtros.page ? Number(filtros.page) : 1,
    limit: filtros.limit ? Number(filtros.limit) : 50
  };

  if (query.desde && query.hasta && query.desde > query.hasta) {
    throw new ReporteAvanzadoError('La fecha desde no puede ser mayor que la fecha hasta');
  }

  const result = await reporteModel.findResumenVacunaciones(query);

  return {
    titulo: 'Resumen ejecutivo de vacunaciones realizadas',
    filtros: {
      desde: query.desde || null,
      hasta: query.hasta || null,
      vacunaId: query.vacunaId || null,
      usuarioId: query.usuarioId || null
    },
    total: result.total,
    totalRegistros: result.totalRegistros,
    page: result.page,
    limit: result.limit,
    rows: result.rows
  };
}

module.exports = {
  ReporteAvanzadoError,
  obtenerInventarioLotes,
  obtenerLotesProximosVencer,
  obtenerAuditoriaVacunacion,
  obtenerResumenVacunaciones
};
