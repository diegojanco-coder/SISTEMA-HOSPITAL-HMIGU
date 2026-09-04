# Especificacion de validaciones de datos

**Sistema Web Responsive para el Control y Seguimiento Inteligente del Esquema de Vacunacion**  
**Hospital Materno Infantil German Urquidi - Bolivia**

## 1. Alcance y criterios

Este documento define las validaciones obligatorias para React/Tailwind, Node.js/Express y MySQL. La validacion debe existir en ambos extremos: el frontend mejora la experiencia de usuario, pero el backend es la autoridad y nunca debe confiar en datos provenientes del navegador.

Las reglas se alinean con la calidad de datos necesaria para el PAI y con la identificacion boliviana del SEGIP. La validacion local de CI, correo y telefono **no sustituye** una consulta o convenio de verificacion con SEGIP, operador telefonico o SIN. No se debe inventar un algoritmo de verificacion de identidad ni consultar servicios externos sin autorizacion, credenciales, base legal y auditoria.

Reglas generales:

- Recibir JSON con `Content-Type: application/json` y limitar el tamano del body.
 Normalizar texto no sensible con `trim().replace(/\s+/g, ' ')` antes de validar.
      : valor.trim().replace(/\s+/g, ' ');
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/)
const nombreBolivia = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/u;
  .matches(/^\d{4}-\d{2}-\d{2}$/)
const fechaFiltro = (campo) => body(campo)
  .matches(/^\d{4}-\d{2}-\d{2}$/)

## 2. Catalogo de limites

| Campo funcional | Nombre de API habitual | Maximo | Regla adicional |
|---|---|---:|---|
| Nombre de paciente | `nombres` | 50 | Letras, vocales acentuadas, `N/n`, espacios simples |
| Apellido de paciente | `apellidos` | 50 | Letras, vocales acentuadas, `N/n`, espacios simples |
| CI | `carnetIdentidad` | 10 | `^[0-9]{6,8}(-[A-Z]{2})?$` |
| Telefono | `telefonoContacto` / `telefono` | 15 | Movil: 8 digitos e inicia en 6 o 7; fija: 7 digitos con area valida |
| Nombre de tutor | `nombres`, `apellidos` | 100 | Letras y espacios simples |
| Parentesco | `parentesco` | 30 | Enumeracion PAI del sistema |
| Nombre de usuario | `username` | 30 | 3 a 30; caracteres de identificador |
| Correo | `email` | 100 | Formato email; unicidad en MySQL |
| Contrasena sin hash | `password` | 20 | Minimo 6; recomendada politica fuerte de 8 o mas |
| Nombre de vacuna | `nombre` | 100 | Obligatorio y unico |
| Descripcion | `descripcion` | 255 | Opcional |
| Fabricante | `fabricante` | 100 | Opcional; requiere campo en modelo si se incorpora |
| Numero de lote | `numeroLote` | 50 | Alfanumerico, unico por vacuna |
| Profesion | `profesion` | 50 | Requiere campo en usuario si se incorpora |
| Numero de colegiatura | `numeroColegiatura` | 20 | Requiere campo en usuario si se incorpora |
| Observaciones | `observaciones` | 255 | Texto libre; no duplicar espacios si la politica institucional lo exige |

Los nombres internos que no aparecen en la tabla, como `direccion`, `nombreCorto` o `nombreDosis`, deben tener limites definidos en el contrato antes de exponerse a produccion. Una longitud de columna MySQL no reemplaza la validacion del endpoint.

## 3. Middleware Express obligatorio

```js
const { validationResult } = require('express-validator');

function validar(req, res, next) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(422).json({
      message: 'Los datos enviados no son validos',
      errors: errores.array().map(({ path, msg }) => ({ campo: path, mensaje: msg })),
    });
  }
  return next();
}

module.exports = validar;
```

El middleware de sanitizacion debe ejecutarse antes de las reglas, sin modificar contrasenas:

```js
const CAMPOS_SENSIBLES = new Set(['password', 'confirmar', 'confirmarPassword']);

function limpiar(valor, clave = '') {
  if (typeof valor === 'string') {
    return CAMPOS_SENSIBLES.has(clave)
      ? valor
      : valor.trim().replace(/\\s+/g, ' ');
  }
  if (Array.isArray(valor)) return valor.map((item) => limpiar(item));
  if (valor && typeof valor === 'object') {
    for (const [key, item] of Object.entries(valor)) valor[key] = limpiar(item, key);
  }
  return valor;
}
```

## 4. Autenticacion y usuarios

### Frontend

- `login`: obligatorio, trim, maximo 100 caracteres.
- `password`: obligatorio, minimo 6 y maximo 20; no mostrar la contrasena en mensajes, logs o auditoria.
- Usuario nuevo: `nombreCompleto` maximo 100, `username` de 3 a 30 y `email` maximo 100.
- Mostrar el mensaje junto al input y borde rojo cuando falle.
- Usar `maxLength` como ayuda de interfaz, pero repetir la regla en Express.

Ejemplo de regla React:

```tsx
const errorPassword = password.length > 20
  ? 'La contrasena no puede exceder los 20 caracteres'
  : password.length < 6
    ? 'La contrasena debe tener al menos 6 caracteres'
    : '';

<input type="password" minLength={6} maxLength={20} aria-invalid={Boolean(errorPassword)} />
{errorPassword && <p className="text-red-600 text-xs">{errorPassword}</p>}
```

### Backend

```js
const passwordFuerte = body('password')
  .isString().withMessage('La contrasena debe ser texto')
  .isLength({ min: 6, max: 20 })
  .withMessage('La contrasena debe tener entre 6 y 20 caracteres')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/)
  .withMessage('La contrasena debe incluir mayuscula, minuscula, numero y simbolo');

body('email')
  .isEmail().withMessage('El correo no tiene un formato valido')
  .isLength({ max: 100 }).withMessage('El correo no puede exceder los 100 caracteres');
```

- Aplicar `bcrypt.hash(password, costo)` unicamente despues de validar.
- Comparar con `bcrypt.compare`; nunca buscar por `password_hash` recibido del cliente.
- Verificar unicidad de `email` y `username` con indice `UNIQUE` y manejar el error de carrera de MySQL como `409 Conflict`.
- Mantener el rol en una enumeracion backend (`administrador`, `enfermero`); no aceptar roles arbitrarios.
- Login con rate limit, JWT con expiracion, HTTPS en produccion, Helmet, CORS restringido y cookies seguras si se usa cookie.

## 5. Pacientes y tutores

### CI boliviana

La forma local aceptada es de 6 a 8 digitos, opcionalmente seguida de una extension departamental en mayusculas:

```js
const ciBolivia = /^(?:[0-9]{6,8})(?:-(?:CH|LP|CB|OR|PT|TJ|SC|BE|PD))?$/;
```

La extension debe normalizarse a mayusculas. No aceptar letras, puntos, barras ni espacios internos. La unicidad se garantiza con `UNIQUE(carnet_identidad)` cuando el CI esta presente. La verificacion de que el documento pertenece a una persona es externa y no debe simularse con una expresion regular.

### Nombres y apellidos

```js
const nombreBolivia = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/u;

body('nombres')
  .isLength({ min: 2, max: 50 })
  .withMessage('El nombre debe tener entre 2 y 50 caracteres')
  .matches(nombreBolivia)
  .withMessage('El nombre solo puede contener letras y espacios');
```

Para tutores, el mismo patrón permite hasta 100 caracteres. En React, normalizar espacios en `onChange` y mostrar `aria-invalid`, mensaje contextual y `border-red-500` cuando exista error.

### Fechas

- Aceptar internamente solo `YYYY-MM-DD` para evitar ambiguedad.
- Si se permite `DD/MM/YYYY` en importaciones, convertirlo a `YYYY-MM-DD` antes de guardar y rechazar fechas imposibles, como `31/02/2024`.
- Validar que la fecha sea real y no futura.
- Calcular edad con calendario, no dividiendo dias por 365; los meses y dias deben respetar ano bisiesto.

```js
body('fechaNacimiento')
  .matches(/^\d{4}-\d{2}-\d{2}$/)
  .withMessage('La fecha debe tener formato AAAA-MM-DD')
  .isISO8601({ strict: true })
  .withMessage('La fecha no es valida')
  .custom((valor) => new Date(`${valor}T00:00:00Z`) <= new Date())
  .withMessage('La fecha de nacimiento no puede ser futura');
```

### Telefonos

- Movil boliviano: exactamente 8 digitos y primer digito `6` o `7`: `^[67][0-9]{7}$`.
- Linea fija: 7 digitos incluyendo el codigo regional validado contra el catalogo institucional: `^[2-5][0-9]{6}$` como regla general local; si se requiere validar departamento, usar una tabla de prefijos aprobada, no una lista informal.
- No guardar parentesis, guiones ni espacios; si se aceptan en UI, normalizarlos antes de validar.
- El maximo de almacenamiento de `telefono` debe cubrir la representacion normalizada, no permitir texto arbitrario.

## 6. Vacunas, lotes y dosis

### Vacunas y lotes

```js
body('nombre').isLength({ max: 100 }).withMessage('El nombre no puede exceder los 100 caracteres');
body('descripcion').optional({ checkFalsy: true })
  .isLength({ max: 255 }).withMessage('La descripcion no puede exceder los 255 caracteres');
body('numeroLote').isLength({ min: 1, max: 50 })
  .withMessage('El numero de lote debe tener entre 1 y 50 caracteres')
  .matches(/^[A-Za-z0-9]+$/)
  .withMessage('El numero de lote solo puede contener letras y numeros');
```

- Un lote es unico por vacuna: `UNIQUE(vacuna_id, numero_lote)`.
- La fecha de vencimiento debe ser una fecha real y posterior a la fecha de aplicacion; para crear inventario no debe ser anterior al dia actual.
- La cantidad disponible debe ser entero `> 0` al crear un lote. En operaciones de ajuste, impedir negativos y auditar el motivo.
- Usar transaccion y bloqueo de fila al descontar stock; rechazar si esta vencido, inactivo o sin existencias.

### Dosis aplicadas y calendario PAI

- Validar `pacienteId`, `dosisId` y `loteVacunaId` como enteros positivos.
- Confirmar que el lote pertenece a la vacuna de la dosis.
- Impedir duplicidad con `UNIQUE(paciente_id, dosis_id)` y una comprobacion de servicio dentro de la misma transaccion.
- El servicio debe comparar la edad calculada con `edad_recomendada_dias`, tolerancia e intervalo minimo del catalogo PAI.
- No permitir una aplicacion antes del intervalo minimo ni registrar una dosis ya aplicada, salvo un flujo administrativo expresamente autorizado, auditado y con motivo.
- La fecha de aplicacion no puede ser futura ni anterior al nacimiento.
- La cita debe contener al menos una dosis y cada dosis debe tener un lote valido.
- No aceptar `lote` libre si el modelo exige `loteVacunaId`; el enfermero debe seleccionar un lote disponible.

## 7. Reportes y carnet digital PDF

Antes de exportar:

- `desde` y `hasta` deben estar en `YYYY-MM-DD`, ser fechas reales y `desde <= hasta`.
- Aplicar un rango maximo operativo, por ejemplo 366 dias, para evitar consultas y PDFs descontrolados; documentar la politica institucional.
- Validar filtros enumerados (`estado`, `vacuna`, `sexo`, `rol`) contra listas permitidas.
- Limitar `page`, `limit` y ordenamiento a valores permitidos.
- Consultar con parametros; no concatenar filtros SQL.
- Generar PDF solo con datos autorizados por rol y registrar la exportacion en auditoria.
- Escapar o tratar como texto los valores provenientes de pacientes al construir PDF/CSV. Para CSV, prevenir formula injection ante valores que comiencen con `=`, `+`, `-` o `@`.
- Verificar que el paciente exista y este autorizado antes de crear su carnet; el QR debe contener un identificador o URL firmada, nunca CI, diagnosticos ni datos clinicos completos.

Ejemplo de regla backend:

```js
const fechaFiltro = (campo) => body(campo)
  .matches(/^\d{4}-\d{2}-\d{2}$/)
  .isISO8601({ strict: true })
  .withMessage(`La fecha ${campo} no es valida`);

const reglasReporte = [
  fechaFiltro('desde'),
  fechaFiltro('hasta'),
  body('hasta').custom((hasta, { req }) => hasta >= req.body.desde)
    .withMessage('La fecha hasta no puede ser anterior a desde'),
];
```

## 8. Integridad MySQL minima

- `utf8mb4` y una collation Unicode para conservar `Ñ` y vocales acentuadas.
- `NOT NULL` en campos obligatorios.
- `CHECK` para cantidades no negativas y enumeraciones.
- `UNIQUE` en `usuarios.email`, `usuarios.username`, `pacientes.carnet_identidad`, `tutores.carnet_identidad`, `vacunas.nombre` y `(vacuna_id, numero_lote)`.
- Indices para busqueda por CI, nombres, lote y fecha de aplicacion.
- Transacciones para registrar cita, historial y descuento de stock.
- Retencion y acceso a auditoria conforme a la politica institucional de proteccion de datos clinicos.

## 9. Pruebas de aceptacion

1. Un nombre de 50 caracteres se acepta; uno de 51 se rechaza con mensaje en frontend y `422` en backend.
2. `Juan  Perez` se convierte en `Juan Perez`; una contrasena con espacios conserva exactamente su valor.
3. CI `123456-CB` se acepta; `12345`, `123456-cb` y `123456-XX` se rechazan.
4. Movil `71234567` se acepta; `51234567` y `7123456` se rechazan.
5. Fecha `2024-02-30` y una fecha futura se rechazan.
6. Un email o username duplicado devuelve `409` aunque dos solicitudes lleguen simultaneamente.
7. Lote vencido, inexistente, duplicado o sin stock no permite registrar una dosis.
8. La segunda aplicacion de la misma dosis para el mismo paciente se rechaza dentro de una transaccion.
9. Un reporte con `desde > hasta` no genera PDF ni ejecuta una consulta de datos.
10. Los mensajes no contienen contrasenas, hashes, tokens ni diagnosticos no solicitados.
