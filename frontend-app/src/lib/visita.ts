export interface DosisEnVisita {
  dosisId: number;
  vacunaNombre: string;
  nombreDosis: string;
  loteVacunaId: number;
  numeroLote: string;
  stock: number;
}
export function fechaLocal(hoy = new Date()) {
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}
export function validarVisita(dosis: DosisEnVisita[], fecha: string, nacimiento: string, hoy = fechaLocal()) {
  const parsed = new Date(`${fecha}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== fecha) return 'Selecciona una fecha válida';
  if (fecha > hoy) return 'La fecha de aplicación no puede ser futura';
  if (fecha < nacimiento.slice(0, 10)) return 'La aplicación no puede ser anterior al nacimiento';
  if (!dosis.length) return 'Añade al menos una dosis a la visita';
  if (new Set(dosis.map(d => d.dosisId)).size !== dosis.length) return 'Una dosis no puede repetirse en la misma visita';
  for (const d of dosis) {
    if (dosis.filter(item => item.loteVacunaId === d.loteVacunaId).length > d.stock) return `No hay existencias suficientes en el lote ${d.numeroLote}`;
  }
  return '';
}
export function datosVisita(pacienteId: number, fecha: string, observaciones: string, dosis: DosisEnVisita[]) {
  return { pacienteId, observaciones, dosisAplicadas: dosis.map(d => ({ dosisId: d.dosisId, loteVacunaId: d.loteVacunaId, fechaAplicacion: fecha })) };
}
