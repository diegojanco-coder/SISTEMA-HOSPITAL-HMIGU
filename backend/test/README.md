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
parámetros y control de transacciones. La suite adicional de integración sí ejecuta MySQL 8
con las tablas reales y comprueba rollback, stock concurrente y dosis duplicadas.
Falta ampliar la validación al motor de vacunación, alertas reales, auditoría y otros flujos.

registrarCita libera la conexión después del commit y luego genera las alertas.
Si las alertas fallan, conserva la respuesta de creación y añade data.advertencias
con el código ALERTAS_NO_ACTUALIZADAS. No intenta rollback ni repite las dosis.
El caso exitoso mantiene su respuesta habitual. Se incluyen regresiones para este fallo
y para un error al confirmar la transacción. frontend-app muestra estas advertencias hasta pulsar Entendido y retira el formulario
para evitar repetir el envío. No se añade un mecanismo de reintento de alertas.

La terminal local no pudo iniciar por un error de preparación del entorno
(helper_unknown_error). La validación reproducible se realiza mediante GitHub Actions;
consultar el resultado de sus jobs antes de integrar.

## Integración HTTP y MySQL

El workflow vaccination-integration.yml crea MySQL 8 desechable con datos ficticios.
Ejecuta node --test test/integration/*.test.cjs después de npm ci.
La suite exige NODE_ENV=test y DB_NAME=vacunacion_hmgu_test; la base debe estar vacía.
Carga las definiciones reales de tablas sin ejecutar DROP/CREATE DATABASE del esquema.
No usar esta base para datos que se quieran conservar: las fixtures borran sus tablas.

Comprueba HTTP 201 con advertencia y datos persistidos, JWT real y permisos,
rollback de varias dosis, competencia por la última unidad y solicitudes duplicadas.
Solo se sustituyen las alertas y auditoría; se usan controlador, ruta, servicio y MySQL reales.

## Interfaz

El mismo workflow compila frontend y frontend-app. En frontend-app ejecuta tres
pruebas de componentes con Vitest y jsdom: aviso hasta reconocimiento, éxito normal
y error que conserva el formulario. Las llamadas API se simulan en estas pruebas;
no equivalen a una prueba integral de navegador contra MySQL.
Las herramientas de prueba se instalan con versiones explícitas desde el workflow.

La interfaz frontend conserva su flujo anterior por /historial y no recibe esta mejora.
No se ha validado aquí su registro de aplicaciones. Tampoco se certifica el sistema
completo ni un despliegue de producción.
