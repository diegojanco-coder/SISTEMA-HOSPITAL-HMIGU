export const LIMITES_TEXTO = {
  nombre: 50,
  apellido: 50,
  ci: 12,
  telefono: 8,
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
  return valor.replace(/\s+/g, ' ').trim();
}

export function errorNumerico(valor: unknown, etiqueta: string, obligatorio = false) {
  const texto = String(valor ?? '');
  if (!texto) return obligatorio ? `El campo ${etiqueta} es obligatorio` : '';
  return /^\d+$/.test(texto) ? '' : `El campo ${etiqueta} solo puede contener números`;
}

const CI_REGEX = /^(\d{6,8})(?:-(CB|LP|SC|OR|PT|TJ|BE|PA|CH))?$/;
const NOMBRE_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/u;

export function errorNombre(valor: unknown, etiqueta: string) {
  const texto = normalizarEspacios(String(valor ?? ''));
  return texto && !NOMBRE_REGEX.test(texto)
    ? `El ${etiqueta} solo puede contener letras, espacios, tildes y ñ`
    : '';
}

export function errorCI(valor: unknown, obligatorio = false) {
  const texto = normalizarEspacios(String(valor ?? ''));
  if (!texto) return obligatorio ? 'La cédula de identidad es obligatoria' : '';
  return CI_REGEX.test(texto) ? '' : 'La cédula debe tener 6 a 8 dígitos y una extensión válida opcional (ej. 1234567-CB)';
}

export function errorTelefono(valor: unknown, obligatorio = false) {
  const texto = normalizarEspacios(String(valor ?? ''));
  if (!texto) return obligatorio ? 'El teléfono es obligatorio' : '';
  return /^[67]\d{7}$|^[234]\d{6,7}$/.test(texto)
    ? ''
    : 'El teléfono debe ser celular de 8 dígitos iniciado en 6 o 7, o línea fija regional válida';
}

export function errorEmail(valor: unknown, obligatorio = false) {
  const texto = normalizarEspacios(String(valor ?? ''));
  if (!texto) return obligatorio ? 'El correo electrónico es obligatorio' : '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto) ? '' : 'El correo electrónico no tiene un formato válido';
}

export function errorFechaNacimiento(valor: unknown) {
  const texto = String(valor ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return 'La fecha de nacimiento es obligatoria y debe ser válida';
  const fecha = new Date(`${texto}T00:00:00`);
  return Number.isNaN(fecha.getTime()) || fecha > new Date() ? 'La fecha de nacimiento no puede ser futura' : '';
}