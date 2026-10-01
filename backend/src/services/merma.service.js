const { pool } = require('../config/db');
const auditoriaModel = require('../models/auditoria.model');

const MOTIVOS = ['frasco_abierto_vencido', 'rotura_accidental', 'falla_cadena_frio', 'otro'];

class MermaError extends Error {
  constructor(message, status = 422) { super(message); this.status = status; }
}

async function registrar(data, contexto) {
  const loteId = Number(data.loteId);
  const cantidad = Number(data.cantidadDosisPerdidas);
  if (!Number.isInteger(loteId) || loteId < 1 || !Number.isInteger(cantidad) || cantidad < 1 || !MOTIVOS.includes(data.motivo)) {
    throw new MermaError('Los datos de la merma no son válidos');
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [lotes] = await conn.query('SELECT * FROM lotes_vacuna WHERE id=? FOR UPDATE', [loteId]);
    const lote = lotes[0];
    if (!lote) throw new MermaError('Lote no encontrado', 404);
    if (lote.estado !== 'activo') throw new MermaError('No se pueden registrar mermas en un lote inactivo', 409);
    if (Number(lote.cantidad_disponible) < cantidad) throw new MermaError('La merma supera las dosis disponibles del lote', 409);

    const [resultado] = await conn.query(`UPDATE lotes_vacuna
      SET cantidad_disponible=cantidad_disponible-? WHERE id=? AND cantidad_disponible>=?`, [cantidad, loteId, cantidad]);
    if (resultado.affectedRows !== 1) throw new MermaError('El stock cambió durante la operación; vuelva a intentarlo', 409);
    const [insertado] = await conn.query(`INSERT INTO mermas_lote
      (lote_id,usuario_id,cantidad_dosis_perdidas,motivo,observaciones) VALUES (?,?,?,?,?)`,
      [loteId, contexto.usuarioId, cantidad, data.motivo, data.observaciones?.trim() || null]);
    await auditoriaModel.create({
      usuarioId: contexto.usuarioId, accion: 'EDITAR', entidad: 'mermas_lote', entidadId: insertado.insertId,
      datosPrevios: { loteId, cantidadDisponible: Number(lote.cantidad_disponible) },
      datosNuevos: { ...data, cantidadDisponible: Number(lote.cantidad_disponible) - cantidad },
      ip: contexto.ip, userAgent: contexto.userAgent
    }, conn);
    await conn.commit();
    return { id: insertado.insertId, loteId, cantidadDosisPerdidas: cantidad, motivo: data.motivo,
      observaciones: data.observaciones?.trim() || null, cantidadDisponible: Number(lote.cantidad_disponible) - cantidad };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}

module.exports = { registrar, MermaError, MOTIVOS };
