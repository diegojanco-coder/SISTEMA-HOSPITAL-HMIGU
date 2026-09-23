# Prueba integral de interfaz — 12 de septiembre de 2026

Resultado: aprobado en Edge con interfaz compilada, Express y MySQL reales. No se interceptaron ni simularon respuestas HTTP de la API. Solo se usaron personas, correos, vacunas y reglas ficticias en una base temporal independiente.

## Casos comprobados

| Flujo | Comprobación |
| --- | --- |
| Login | Contraseña incorrecta devuelve 401; se entra después sin recargar el documento. |
| Usuarios | Administración crea una cuenta de enfermería por la interfaz. |
| Permisos | Enfermería no ve Configuración/Reportes ni correcciones; la API devuelve 403 al consultar usuarios/reportes e intentar corregir historial. |
| Pacientes | Menor sin tutor se rechaza; menor con tutor nuevo, adulto dependiente con tutor existente y adulto independiente se guardan. Se comprueban tres pacientes, un tutor y dos vínculos. |
| Tutores | Búsqueda por CI localiza al responsable; la desactivación del único tutor se rechaza con 409 y continúa activo. |
| Calendario/lotes | Se crean dos vacunas ficticias, sus dosis, reglas y lotes de cinco unidades desde la interfaz. Se consultan las reglas en Vacunación. |
| Revisión del esquema | El adulto fuera del alcance configurado muestra necesidad de revisión y no se anuncia «al día». |
| Visita | Dos aplicaciones comparten una sola cita; cada lote baja de cinco a cuatro unidades. |
| Historial | Administración corrige observaciones; auditoría identifica usuario admin, registro y valores anterior/nuevo. El stock sigue en cuatro unidades. |
| Reportes | Las seis consultas devuelven las cifras esperadas: tres pacientes, dos aplicaciones, cero pendientes y dos filas de cobertura al 100 % dentro del alcance ficticio. Se comprueba una fila visible. |
| Exportaciones | Carnet y reporte son PDF; reporte Excel es un archivo XLSX. Se verifican respuestas/descargas reales y cabeceras de archivo. |
| Alertas | Las dos alertas pendientes del menor desaparecen tras la aplicación/recalculo; no se envía ningún correo. |
| Auditoría | La bitácora se abre desde Configuración. |
| Presentación | Se inspeccionaron capturas de la visita y ficha móvil oscura; no hay desbordamiento horizontal ni errores JavaScript. |
| Limpieza | La base propia deja de existir, los servidores terminan y la compilación temporal se elimina antes de declarar éxito. |

## Repetición

Desde `backend`:

```powershell
npm run test:e2e
```

Necesita dependencias de `backend` y `frontend-app`, MySQL con permiso para crear/eliminar la base temporal de la prueba, Playwright y Edge. PLAYWRIGHT_MODULE admite una instalación externa de Playwright; TEST_BROWSER permite otro canal instalado. No instala herramientas automáticamente. La comprobación de respaldos sigue disponible con `npm run backup:verificar`.

Las capturas y `resultado.json` se conservan fuera de Git, en la ruta que imprime el comando. En esta ejecución: `hmgu-e2e-evidencia-dq3jX8`, dentro del directorio temporal de Windows. Las evidencias contienen solo datos ficticios. Ante una interrupción abrupta puede quedar el recurso temporal identificado por `recurso.json`; la limpieza normal se intenta incluso cuando un paso falla.

## Límites

La prueba verifica estos recorridos y sus datos; no equivale a probar cada combinación posible. No valida la norma clínica completa, campañas reales, entrega de Gmail, una restauración que reemplace la instalación habitual, accesibilidad exhaustiva, carga con múltiples usuarios ni acceso público. El catálogo real y el inventario del hospital mantienen sus pendientes documentados en `06-ENTREGA.md`. Los correos automáticos permanecen apagados por indicación del usuario.

## Repetición tras ampliar el calendario

El 12 de septiembre se repitió el flujo completo incorporando la edición real de rangos por sexo registrado y su consulta en Vacunación. Todos los escenarios pasaron, incluidos visita múltiple, stock, permisos, historial, informes, alertas y móvil. Evidencia: `hmgu-e2e-evidencia-5cK48O` en la carpeta temporal local; limpieza de la base, servidores y compilación confirmada.

## Servidor único y administración — 13 de septiembre

La prueba ahora usa el mismo servidor Express para los archivos compilados y la API, con VITE_API_URL=/api/v1. Comprueba disponibilidad de MySQL mediante /api/v1/ready y mantiene el aislamiento de la base de ensayo y SMTP desactivado. Se agregó el cambio de contraseña de la cuenta ficticia de enfermería desde la interfaz: la anterior deja de autenticar, la nueva autentica y la auditoría contiene solo la indicación del cambio. Resultado aprobado, evidencia hmgu-e2e-evidencia-ATuVaO.

## Referencias entre vacunas — 14 de septiembre

Después de comprobar los reportes anteriores, la prueba crea una dosis de seguimiento ficticia en Beta y la enlaza desde el editor a una aplicación de Alfa. Guarda una regla con intervalo de dos meses, recarga la pantalla y verifica la referencia persistida y su texto completo en Vacunación. La API rechaza con 422 el intento de aplicarla antes del intervalo; no se crea historial ni se descuenta stock. No se usa esta regla ficticia como pauta clínica.

Ejecución aprobada: `hmgu-e2e-evidencia-o4tNhX`. Incluye los recorridos previos, contraseña y nueva referencia, sin errores JavaScript; la base temporal, servidor y compilación se eliminaron. Se inspeccionaron las capturas de seguimiento y ficha móvil. Una ejecución anterior terminó de forma inesperada y sin informe: sus recursos se eliminaron tras comprobar el marcador y que la base ficticia no tenía conexiones activas.

## Antecedentes externos — 14 de septiembre

La prueba completa `hmgu-e2e-evidencia-b5b1E9` crea un catálogo ficticio sin lotes para el nuevo flujo. Enfermería registra un antecedente desde Historial; administración corrige la referencia documental y la auditoría registra ambas operaciones. Dos solicitudes concurrentes para otra dosis dan 201 y 409: se conserva una sola identidad paciente/dosis.

El stock continúa en cuatro unidades por lote y sigue existiendo una sola cita local. El reporte de producción conserva dos aplicaciones locales aunque el paciente tenga además dos antecedentes externos. El carnet responde con PDF y el historial identifica quién transcribió cada documento. La interfaz, el servidor y la base de esta prueba son temporales; la limpieza final se confirmó. No se enviaron correos.
# Ampliación del registro — 21 de septiembre de 2026

La evidencia `hmgu-e2e-evidencia-opml5z` aprobó el flujo con interfaz/API/MySQL reales y limpieza completa. Se adaptó el alta al formulario de tres pasos y se añadieron prerregistro adulto sin correo, confirmación posterior del contacto, recién nacido con identidad provisional y tutor existente, rechazo de CI duplicado sin pérdida del formulario y confirmación del nombre sobre el mismo código. Incluye capturas de revisión y vista móvil a 390 px. No se insertaron estos datos ficticios en la instalación habitual ni se enviaron mensajes.
