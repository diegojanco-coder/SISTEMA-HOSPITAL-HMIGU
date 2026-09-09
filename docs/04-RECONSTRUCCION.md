# Reconstrucción acordada — 7 de septiembre de 2026

## Decisiones del usuario
- Única interfaz: frontend-app, aspecto sobrio y modos claro/oscuro.
- Pacientes de todas las edades, incluidos adultos dependientes.
- Tutor obligatorio para menores de 18 años y pacientes dependientes.
- Visitas presenciales con varias dosis; sin agenda de turnos futuros.
- Envío real por Gmail SMTP a direcciones de cualquier departamento de Bolivia.
- El alcance geográfico no impone filtros de dominio ni de departamento al correo.

## Implementado en esta etapa
- Diseño anterior de acceso y fotografía conservados, paleta sobria y selector de tema persistente.
- Sustitución de gradientes decorativos en componentes existentes.
- Plantilla de configuración Gmail sin credenciales.

## Fuentes oficiales consultadas
Consulta: 2026-09-07.
- Ministerio de Salud, 26/07/2026, alcance de recién nacidos a adultos mayores:
  https://www.minsalud.gob.bo/9319-el-rol-vital-de-las-vacunas-como-primera-linea-de-proteccion
- Ministerio de Salud, Semana de Vacunación 2026 (campaña y grupos objetivo):
  https://www.minsalud.gob.bo/9123-bolivia-se-une-a-la-semana-de-vacunacion-en-las-americas
- Instructivo del carnet de salud infantil, anexo de esquema PAI (documento anterior):
  https://www.minsalud.gob.bo/images/Libros/DGPS/PDS/p396_indt_dgps_uan_INSTRUCTIVO_DE_LLENADO_DE_CARNET_DE_SALUD_INFANTIL.pdf
- Gmail SMTP:
  https://support.google.com/mail/answer/7104828
- Contraseñas de aplicación Google:
  https://support.google.com/accounts/answer/185833?hl=es

## Estado de la investigación PAI
Las publicaciones actuales confirman alcance y campañas, pero no constituyen una norma
consolidada con todas las edades, intervalos y excepciones. El instructivo infantil es
antiguo. No se han modificado los datos de dosis con estas fuentes incompletas.
Falta localizar la norma técnica vigente completa y distinguir esquema regular,
recuperación, campañas y condiciones especiales. No extrapolar vacunas infantiles
como pendientes automáticamente a todos los adultos.

## Pendientes funcionales
- Extender la revisión de tutores a desvinculación y desactivación para proteger los vínculos obligatorios.
- Homogeneizar los límites restantes entre base, API y formularios; el middleware ya aplica validación real.
- Permisos de enfermería para visitas y aplicaciones múltiples.
- Motor PAI versionado y sustentado en normativa vigente.
- Correos HTML, registro de intentos, reintentos y prueba SMTP real.
- Para la prueba real faltan cuenta remitente, contraseña de aplicación ingresada
  localmente y destinatario de prueba autorizado. No enviar a pacientes al probar.
- Revisar cada módulo y probarlo con datos ficticios; esta etapa no certifica todo el sistema.

## Registro de pacientes corregido
- Adultos independientes sin tutor; menores y dependientes con tutor obligatorio.
- Alta de paciente, tutor nuevo o vínculo existente en una misma transacción.
- Edición conserva los vínculos activos y el correo del paciente.
- Formulario permite indicar dependencia y elegir tutores existentes.
- Administrador y enfermería pueden registrar y editar pacientes.
- Fechas de nacimiento interpretadas como fechas locales para calcular la edad.
- Errores en generación posterior de alertas se registran sin presentar el paciente como no guardado. Reintentos de alertas siguen pendientes.

### Instalación sin borrar datos
Desde backend: `node src/database/addPatientDependency.js` (idempotente).
Reiniciar el backend después de actualizar código.
Desde frontend-app: `npm run build -- --configLoader runner`.

### Verificación de esta etapa
`node --test test/pacientes.integration.test.js` desde backend: diez pruebas exitosas,
con escrituras de prueba revertidas en MySQL. Compilación Vite exitosa.
Login HTTP 200 y rechazos HTTP 422 para nombre inválido, menor sin tutor,
dependiente sin tutor y tutor incompleto.
Durante la detección de la instancia antigua, esta aceptó dos registros ficticios
(ids 4 y 5, apellido Temporal): se desactivaron y sus alertas se marcaron leídas.
No se certifica todavía el flujo completo de vacunación, PAI ni correo.


## Vacunación: permisos, inventario y errores posteriores al guardado
- POST /citas admite administrador y enfermería; sigue rechazando otros roles.
- Un lote es válido durante su fecha de vencimiento; el listado y el guardado usan la fecha de MySQL.
- Las aplicaciones con fecha futura o inválida y las visitas futuras se rechazan.
- Se conserva la transacción de visita, historial y descuento de stock para varias dosis.
- La conexión se libera antes de actualizar alertas. Un fallo de alertas devuelve una advertencia sin intentar revertir una vacunación ya confirmada; el frontend muestra esa advertencia.
- `node --test test/vacunacion.integration.test.js`: siete pruebas exitosas contra MySQL, con datos ficticios revertidos y sin enviar correos.
- Comprobación HTTP de permisos: enfermería y administrador alcanzan validación (422 con lista vacía), otro rol recibe 403. Interfaz compilada con Vite.
- Pendiente: completar el formulario de varias dosis por visita, validar las reglas clínicas contra la norma PAI vigente y revisar edición de historial y reintentos de alertas.

## Formulario de varias dosis por visita
- Registrar vacunación permite añadir y quitar dosis, escoger un lote por dosis y revisar un resumen antes de confirmar.
- Duplicados, consumo acumulado por lote y fechas inválidas se comprueban antes del envío. El servidor vuelve a validar stock al guardar.
- Carga de esquema y lotes con errores visibles; las respuestas atrasadas no sustituyen la selección actual.
- Se envía una sola petición POST /citas con todas las dosis y fecha compartida; el botón evita envíos simultáneos.
- Modal extraído a AddVaccineModal.tsx para eliminar referencias incorrectas a estados del formulario de tutores.
- Advertencias conectadas a react-hot-toast, el componente de notificaciones instalado en la interfaz.
- Comprobación: ocho pruebas de validación, construcción del payload y render inicial con React; build Vite exitoso. No se ejecutó una visita real desde el navegador ni se enviaron correos.
- Comando desde frontend-app: `node --experimental-strip-types --test test/visita.test.ts test/visita-render.test.mjs`.
- Pendiente: validar reglas clínicas del esquema PAI y probar el recorrido completo en navegador con datos de prueba controlados.

## Verificación en navegador — 8 de septiembre de 2026
- Ficha e historial se vuelven a cargar al cerrar el registro de vacunación; el perfil no queda montado detrás del formulario.
- Los tutores se obtienen del detalle del paciente; se añadió error visible y reintento si falla la carga.
- Selectores de dosis y lote con nombres accesibles explícitos.
- Paneles de datos personales y tutores con contraste legible en la paleta sobria.
- Seis escenarios exitosos en Edge sin interfaz visible: dos dosis enviadas juntas e historial actualizado; quitar dosis y validar fecha futura; recuperación ante error de lotes; rechazo por stock conservando la selección; protección ante respuestas atrasadas; reintento de ficha y resumen móvil oscuro.
- Test: frontend-app/test/visita-browser.cjs. Todas las peticiones API están interceptadas con respuestas ficticias: no escribe en MySQL ni envía correos. Complementa las pruebas transaccionales de backend, no certifica una instalación de producción.
- Ejecutar con la vista previa en 5173 y Playwright disponible: `node test/visita-browser.cjs`. PLAYWRIGHT_MODULE permite indicar una instalación externa; TEST_URL y TEST_BROWSER son opcionales.
- Capturas revisadas de resumen, historial actualizado y móvil oscuro. Compilación Vite exitosa.
- Backend y vista previa iniciados; login real comprobado con HTTP 200.
- Pendientes del proyecto: normativa y reglas PAI, gestión de vínculos obligatorios de tutores, edición del historial, reintentos de alertas y configuración/prueba autorizada de correo real.

## Tutores, corrección de historial y correos — 8 de septiembre de 2026
### Cambios aplicados
- Desactivación/desvinculación verifica que cada menor o dependiente conserve otro tutor activo. Los vínculos retirados quedan inactivos; no se borran.
- Se normaliza el responsable principal, se rechazan tutores inactivos y el registro de tutor con vínculo es transaccional.
- El alta/edición de tutores y los nuevos vínculos admiten enfermería; las acciones de retiro conservan permisos de administrador.
- Correcciones del historial: fechas reales, no futuras, no anteriores al nacimiento ni posteriores al vencimiento del lote; no invertir el orden de dosis ya registradas. Estas validaciones de integridad no sustituyen la validación clínica PAI.
- Corrección y auditoría anterior/nueva se confirman juntas. Si falla la auditoría, se revierte la corrección. El stock, la dosis y el lote permanecen asociados al registro original.
- Pantalla Historial incorpora Corregir registro para administradores, muestra rechazos del servidor y actualiza la ficha después de guardar.
- Alertas encolan correos; el recálculo ya no realiza envíos SMTP. Se registra cada intento, se deduplican avisos equivalentes y se reintenta hasta cinco veces con espera creciente.
- El proceso cancela avisos desactualizados o de pacientes/tutores inactivos, y libera la conexión tras procesar. Un fallo entre la aceptación SMTP y su registro puede provocar repetición: no se promete entrega exactamente una vez ni recepción en bandeja de entrada.
- Correos HTML con texto alternativo y datos escapados. El resultado enviado significa aceptación por el servidor SMTP.
- Panel de alertas muestra estado/configuración del envío y totales de cola, errores y destinatarios faltantes.
- SMTP_ENABLED=false por defecto. Verificado localmente: envío desactivado y cuenta no configurada. No se enviaron correos reales.

### Instalación y validación
Desde backend: `npm run migrate:upgrade` agrega campos/tablas sin resetear la base. También se actualizaron ambos schema.sql para instalaciones nuevas.
`npm test`: 37 pruebas exitosas contra MySQL, usando transacciones revertidas y transporte de correo simulado.
Se corrigió el aislamiento de un fixture antiguo de pacientes que insertaba un tutor antes de abrir la transacción. Las pruebas actuales usan identificadores ficticios únicos y abren la transacción antes de cualquier escritura.
Desde frontend-app: compilación Vite exitosa y prueba `test/historial-browser.cjs` exitosa para administrador/enfermería, con API interceptada. Incluye rechazo y recuperación de corrección y panel de correo.

### Investigación PAI adicional
- Manual técnico alojado oficialmente por SEDES La Paz:
  https://www.sedeslapaz.gob.bo/wp-content/uploads/2024/10/MANUAL-TECNICO-PROGRAMA-AMPLIADO-DE-INMUNICACION-FAMILIAR-Y-COMUNITARIA.pdf
  La ficha editorial indica segunda edición 2015, RM 872 de 27/07/2015 y publicación 2016. La carpeta web 2024/10 no indica actualización de la norma. El visor web no pudo abrirlo completo por tamaño (22 MB).
- SEDES Cochabamba, comunicado de 10/02/2026:
  https://www.sedescochabamba.gob.bo/noticias.php?idp=544
  Describe medidas temporales y esquemas acelerados; su texto señala disponibilidad hasta abril. No se trasladó esa campaña al esquema regular de septiembre.
- Pendiente: validar la vigencia y todas las modificaciones posteriores antes de versionar el calendario clínico. Los datos semilla no se han reemplazado por estas fuentes incompletas.
- Para la prueba de Gmail faltan remitente, destinatario autorizado y contraseña de aplicación configurada localmente. Nunca guardar credenciales en este documento ni en Git.
- Verificación adicional de Tutores: el rechazo al retirar al último responsable se muestra en pantalla; enfermería no ve el botón de desactivar. Prueba de navegador incluida con respuestas simuladas.
- Smoke test real: login HTTP 200 y resumen administrativo de correos HTTP 200, habilitado=false/configurado=false/cola vacía.

### Calendario: primera corrección de fechas (2026-09-08)
- Se incorporaron unidades exactas días/semanas/meses/años, con ajuste al último día del mes y aritmética de fechas civiles sin desplazamiento de zona horaria.
- Migración aditiva `backend/src/database/addCalendarUnits.js`, incluida en `npm run migrate:upgrade`, aplicada localmente. Solo convierte las cinco dosis PENTA con los valores originales conocidos (60/120/180/540/1460); conserva IDs, historial y configuraciones diferentes.
- Fuente contrastada: Ministerio de Salud, 1 julio 2026, https://minsalud.gob.bo/9237-bolivia-dona-255-000-dosis-de-vacuna-pentavalente-para-venezuela-y-haiti : 2, 4, 6, 18 meses y 4 años. Esta fuente confirma edades; no confirma los márgenes de tolerancia existentes.
- Las dosis sin unidad explícita mantienen el cálculo anterior. Editar su edad en días elimina la unidad exacta anterior para no conservar reglas contradictorias.
- Pendiente: población elegible, recuperación de esquemas adultos, intervalos, vigencia y territorio de campañas, y contraste completo del resto del catálogo. El motor aún no debe considerarse un calendario PAI íntegramente validado.
- No se ha activado ninguna campaña temporal ni se han enviado correos reales.
