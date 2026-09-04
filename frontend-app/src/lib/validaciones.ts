export const LIMITES_TEXTO = {
  nombre: 50,
  apellido: 50,
  ci: 10,
  telefono: 15,
  tutor: 100,
  parentesco: 30,
  nombreUsuario: 30,
  email: 100,
  password: 20,
  nombreVacuna: 100,
  descripcionVacuna: 255,
  fabricante: 100,
  numeroLote: 50,
  profesion: 50,
  numeroColegiatura: 20,
} as const;

export function validateForm(form: Record<string, unknown>, limites: Record<string, number>, etiquetas: Record<string, string> = {}) {
  for (const [campo, limite] of Object.entries(limites)) {
    const valor = form[campo];
    if (typeof valor === 'string' && valor.length > limite) {
      return `El campo ${etiquetas[campo] || campo} no puede exceder los ${limite} caracteres`;
    }
  }
  return '';
}

export function errorLongitud(valor: unknown, limite: number, etiqueta: string) {
  return typeof valor === 'string' && valor.length > limite
    ? `El campo ${etiqueta} no puede exceder los ${limite} caracteres`
    : '';
}

export function normalizarEspacios(valor: string) {
  return valor.replace(/\s{2,}/g, ' ');
}

export function errorNumerico(valor: unknown, etiqueta: string, obligatorio = false) {
  const texto = String(valor ?? '');
  if (!texto) return obligatorio ? `El campo ${etiqueta} es obligatorio` : '';
  return /^\d+$/.test(texto) ? '' : `El campo ${etiqueta} solo puede contener números`;
}