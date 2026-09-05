# Pruebas del backend

Ejecutar desde backend con Node.js 22 o 24:

```sh
npm test
npm run test:coverage
```

La suite usa node:test y node:assert, sin dependencias adicionales, base de datos ni credenciales.
GitHub Actions ejecuta las pruebas y muestra cobertura en Node 22 y 24.

## Alcance inicial

En la revisión de main (f12b7a90486880206d357490d9b43942f7edeb20) no se encontraron archivos de pruebas
automatizadas ni scripts de test en backend, frontend o frontend-app.
No existía una medición de cobertura; esto no equivale a un porcentaje medido.

Se priorizan:
- Autenticación: credenciales inválidas, usuario inactivo, respuesta sin password_hash,
  errores de persistencia, encabezados y tokens rechazados, identidad y permisos por rol.
- Pacientes: creación y actualización, fechas inválidas/futuras y tutor obligatorio
  antes de los 18 años, incluido el límite exacto del cumpleaños.
- Citas de vacunación: persistencia de aplicaciones, datos por dosis, validación de fecha,
  lotes activos y compatibles, stock, duplicados, rollback y liberación de conexiones.

Los servicios se cargan desde los archivos reales mediante un pequeño cargador CommonJS
aislado. Solo se sustituyen dependencias explícitas (modelos, conexión, firma/verificación
JWT y alertas); las utilidades de fecha y respuesta conservan su implementación real.
El reloj se fija al 15 de junio de 2026 para evitar pruebas que cambien con el tiempo.
No se modifica la caché global de módulos.

## Límites y siguientes pasos

La cobertura emitida por Node corresponde a los archivos ejecutados: no representa por
sí sola la cobertura global del repositorio. Los dobles SQL comprueban consultas,
parámetros y control de transacciones; no demuestran atomicidad o concurrencia real de MySQL.
Faltan pruebas HTTP de rutas/validadores, JWT real, integración con MySQL,
motor de vacunación, alertas y los dos frontends.

Observación de revisión: registrarCita confirma la transacción antes de generar alertas.
Si generarAlertasPaciente falla, el catch intenta rollback y devuelve error aunque los datos
ya se confirmaron. Conviene definir el contrato de este fallo y añadir una regresión junto
con su corrección; esta propuesta no modifica comportamiento productivo.

La terminal local no pudo iniciar por un error de preparación del entorno
(helper_unknown_error). La validación reproducible se realiza mediante GitHub Actions;
consultar el resultado de sus jobs antes de integrar.
