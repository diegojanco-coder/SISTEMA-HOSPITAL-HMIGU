const { programarDosis } = require('../utils/programacion.util');
const { evaluarAlcance } = require('../utils/elegibilidad.util');
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
const { fechaCivil, sumarEdad, isoCivil, diferenciaDias } = require('../utils/calendario.util');

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


    const fechaNacimiento = fechaCivil(paciente.fecha_nacimiento);
    const programacion = programarDosis(paciente, dosis, historial);
    const fechaRecomendada = programacion.fecha || null;
    const fechaLimite = fechaRecomendada ? sumarEdad(fechaRecomendada, dosis.tolerancia_dias, 'dias') : null;
    let estado = registroAplicado ? 'aplicada' : 'revision';
    if (fechaRecomendada && !registroAplicado) {
      estado = evaluarDosis(diferenciaDias(fechaNacimiento, fechaCivil(fechaReferencia)), {
        edad_recomendada_dias: diferenciaDias(fechaNacimiento, fechaRecomendada),
        tolerancia_dias: Number(dosis.tolerancia_dias)
      }, false).estado;
    }
    let regla=null;
    try {regla=typeof dosis.regla_calendario==='string'?JSON.parse(dosis.regla_calendario):dosis.regla_calendario;} catch {}
    const alcance = evaluarAlcance(paciente, dosis, fechaReferencia);
    if (!registroAplicado) estado = alcance || estado;

    return {
      dosisId: dosis.id,
      registrable: !registroAplicado && alcance === null && regla?.programacion?.base === 'contacto',
      dentroAlcance: alcance === null && !programacion.revision,
      vacunaId: dosis.vacuna_id,
      vacunaNombre: dosis.vacuna_nombre,
      vacunaNombreCorto: dosis.vacuna_nombre_corto,
      numeroDosis: dosis.numero_dosis,
      nombreDosis: dosis.nombre_dosis,
      estado,
      fechaRecomendada: fechaRecomendada ? isoCivil(fechaRecomendada) : null,
      fechaLimite: fechaLimite ? isoCivil(fechaLimite) : null,
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

  const requiereRevision = detalle.some(d => !d.dentroAlcance) || detalle.length === 0;
  const advertencia = requiereRevision ? 'Evaluación parcial: las dosis fuera del alcance o sin reglas verificadas requieren revisión del personal de salud. La ausencia de alertas no confirma un esquema completo.' : null;
  const estadoGeneral = resumen.atrasadas > 0 ? 'rojo' : (resumen.proximas + resumen.pendientes) > 0 ? 'amarillo' : requiereRevision ? 'revision' : 'verde';

  return { edad, detalle, resumen, estadoGeneral, advertencia };
}

module.exports = { evaluarEsquema, evaluarDosis, VENTANA_PROXIMA_DIAS };
