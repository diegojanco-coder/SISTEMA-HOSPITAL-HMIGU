export const MENSAJES = {
  nombre: 'El campo Nombre solo debe contener letras y tener entre 2 y 100 caracteres.',
  apellido: 'El campo Apellido solo debe contener letras y tener entre 2 y 100 caracteres.',
  fecha: 'La fecha de nacimiento no puede ser una fecha futura.',
  telefono: 'El número de teléfono debe ser válido y contener entre 7 y 15 dígitos.',
  email: 'Por favor, ingrese un correo electrónico válido.',
  password: 'La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula y un número.'
};

const letras = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/u;
const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const limpiar = (valor) => typeof valor === 'string' ? valor.trim() : valor;
export const reglasNombre = (mensaje) => ({ required: mensaje, setValueAs: limpiar, minLength: { value: 2, message: mensaje }, maxLength: { value: 100, message: mensaje }, pattern: { value: letras, message: mensaje } });
export const reglasEmail = { required: MENSAJES.email, setValueAs: limpiar, pattern: { value: email, message: MENSAJES.email } };
export const reglasTelefono = { required: MENSAJES.telefono, setValueAs: limpiar, pattern: { value: /^\d{7,15}$/, message: MENSAJES.telefono } };
export const reglasPassword = { required: MENSAJES.password, pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, message: MENSAJES.password } };
export const fechaMaxima = new Date().toISOString().slice(0, 10);
