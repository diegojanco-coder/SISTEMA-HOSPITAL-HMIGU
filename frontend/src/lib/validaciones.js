export const MENSAJES = {
  nombre: 'El campo Nombre solo debe contener letras y tener entre 2 y 100 caracteres.',
  apellido: 'El campo Apellido solo debe contener letras y tener entre 2 y 100 caracteres.',
  fecha: 'La fecha de nacimiento no puede ser una fecha futura.',
  telefono: 'El número de teléfono debe ser válido y contener entre 7 y 15 dígitos.',
  email: 'Por favor, ingrese un correo electrónico válido.',
  password: 'La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula y un número.'
};

const letras = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/u;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const telefonoRegex = /^\d{7,15}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const limpiar = (valor) => typeof valor === 'string' ? valor.trim() : valor;

export const reglasNombre = (mensaje) => ({
  setValueAs: limpiar,
  required: mensaje,
  validate: (valor) => {
    const texto = String(valor ?? '').trim();
    return (texto.length >= 2 && texto.length <= 100 && letras.test(texto)) || mensaje;
  }
});

export const reglasEmail = {
  setValueAs: limpiar,
  validate: (valor) => {
    const texto = String(valor ?? '').trim();
    return texto === '' || emailRegex.test(texto) || MENSAJES.email;
  }
};

export const reglasTelefono = {
  setValueAs: limpiar,
  validate: (valor) => {
    const texto = String(valor ?? '').trim();
    return texto === '' || telefonoRegex.test(texto) || MENSAJES.telefono;
  }
};

export const reglasPassword = {
  setValueAs: limpiar,
  required: MENSAJES.password,
  validate: (valor) => {
    const texto = String(valor ?? '');
    return passwordRegex.test(texto) || MENSAJES.password;
  }
};

export const reglasFechaNacimiento = {
  required: MENSAJES.fecha,
  validate: (valor) => {
    if (!valor) return MENSAJES.fecha;
    const fecha = new Date(`${valor}T00:00:00`);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fecha <= hoy || MENSAJES.fecha;
  }
};

export const fechaMaxima = new Date().toISOString().slice(0, 10);
