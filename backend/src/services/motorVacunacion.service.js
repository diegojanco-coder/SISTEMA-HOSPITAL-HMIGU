const { calcularEdadExacta } = require('../utils/edad.util');

/**
 * MÓDULO INTELIGENTE DE VACUNACIÓN
 * ---------------------------------
 * Motor de reglas que compara la edad exacta de un paciente contra el
 * esquema de dosis del Calendario Nacional de Inmunización de Bolivia
 * (PAI) y determina, dosis por dosis, uno de los siguientes estados:
 *
 *   - 'aplicada' : ya existe un registro en historial_vacunacion.
 *   - 'futura'   : aún falta más de 30 días para la edad recomendada.
 *   - 'proxima'  : faltan 30 días o menos para la edad recomendada (amarillo).
 *   - 'pendiente': la edad recomendada ya se alcanzó y sigue dentro del
 *                  margen de tolerancia (amarillo/pendiente de aplicar).
 *   - 'atrasada' : se superó la edad recomendada + tolerancia sin aplicar (rojo).
 *
 * Este servicio es puro (no accede a la base de datos): recibe los datos
 * ya cargados y retorna el resultado calculado, lo que facilita las
 * pruebas unitarias.
 */

const VENTANA_PROXIMA_DIAS = 30;

function evaluarDosis(edadEnDias, dosis, aplicada) {
  if (aplicada) {
    return { estado: 'aplicada' };
  }

  const edadMinima = dosis.edad_recomendada_dias;
  const edadLimite = dosis.edad_recomendada_dias + dosis.tolerancia_dias;

  if (edadEnDias < edadMinima - VENTANA_PROXIMA_DIAS) {
    return { estado: 'futura' };
  }
  if (edadEnDias < edadMinima) {
    return { estado: 'proxima' };
  }
  if (edadEnDias <= edadLimite) {
    return { estado: 'pendiente' };
  }
  return { estado: 'atrasada' };
}

/**
 * @param {object} paciente - fila de la tabla pacientes (requiere fecha_nacimiento)
 * @param {Array} catalogoDosis - todas las dosis activas con su vacuna (dosis.model.findAllConVacuna)
 * @param {Array} historial - historial_vacunacion del paciente (historial.model.findByPacienteId)
 * @param {Date} [fechaReferencia] - fecha de referencia para el cálculo (hoy por defecto)
 */
function evaluarEsquema(paciente, catalogoDosis, historial, fechaReferencia = new Date()) {
  const edad = calcularEdadExacta(paciente.fecha_nacimiento, fechaReferencia);
  const aplicadasPorDosisId = new Map(historial.map((h) => [h.dosis_id, h]));

  const detalle = catalogoDosis.map((dosis) => {
    const registroAplicado = aplicadasPorDosisId.get(dosis.id);
    const { estado } = evaluarDosis(edad.edadEnDias, dosis, Boolean(registroAplicado));

    const fechaNacimiento = new Date(paciente.fecha_nacimiento);
    const fechaRecomendada = new Date(fechaNacimiento);
    fechaRecomendada.setDate(fechaRecomendada.getDate() + dosis.edad_recomendada_dias);
    const fechaLimite = new Date(fechaNacimiento);
    fechaLimite.setDate(fechaLimite.getDate() + dosis.edad_recomendada_dias + dosis.tolerancia_dias);

    return {
      dosisId: dosis.id,
      vacunaId: dosis.vacuna_id,
      vacunaNombre: dosis.vacuna_nombre,
      vacunaNombreCorto: dosis.vacuna_nombre_corto,
      numeroDosis: dosis.numero_dosis,
      nombreDosis: dosis.nombre_dosis,
      estado,
      fechaRecomendada: fechaRecomendada.toISOString().slice(0, 10),
      fechaLimite: fechaLimite.toISOString().slice(0, 10),
      fechaAplicacion: registroAplicado ? registroAplicado.fecha_aplicacion : null,
      lote: registroAplicado ? registroAplicado.lote : null
    };
  });

  const resumen = {
    aplicadas: detalle.filter((d) => d.estado === 'aplicada').length,
    proximas: detalle.filter((d) => d.estado === 'proxima').length,
    pendientes: detalle.filter((d) => d.estado === 'pendiente').length,
    atrasadas: detalle.filter((d) => d.estado === 'atrasada').length,
    futuras: detalle.filter((d) => d.estado === 'futura').length
  };

  const estadoGeneral = resumen.atrasadas > 0 ? 'rojo' : (resumen.proximas + resumen.pendientes) > 0 ? 'amarillo' : 'verde';

  return { edad, detalle, resumen, estadoGeneral };
}

module.exports = { evaluarEsquema, evaluarDosis, VENTANA_PROXIMA_DIAS };
