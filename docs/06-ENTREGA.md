# Estado de entrega — actualizado el 21 de septiembre de 2026

## Nuevo registro de pacientes — 21 de septiembre

Implementado el flujo Menor/recién nacido o Adulto, con tres pasos: Datos, Contacto y Revisión. Se reutilizan tutores mediante búsqueda por nombre/CI; el menor no tiene campos de contacto propios. Los adultos dependientes pueden usar el contacto del responsable. Se permiten prerregistros sin correo e identidades provisionales, que se completan conservando el mismo código e historial. Procedimiento: `12-REGISTRO-PACIENTES.md`.

La actualización de la instalación conserva registros y vínculos. La cola respeta el contacto principal y no envía a prerregistros ni a identidades provisionales. Gmail continúa apagado. Se probó además que quitar el correo o cambiar a un responsable incompleto vuelva a marcar el registro como pendiente. Validación final: 116 pruebas backend y 10 frontend aprobadas; compilación correcta.

El E2E real `hmgu-e2e-evidencia-opml5z` aprobó los flujos anteriores y añadió: prerregistro móvil sin correo, edición para completarlo, recién nacido sin nombre/documento, recuperación tras un CI duplicado (409) sin perder campos, confirmación de identidad y accesos directos a ficha/vacunación. Base, servidor y compilación temporales eliminados; capturas móvil/escritorio inspeccionadas.

El respaldo `backup_vacunacion_hmgu_2026-09-21T22-50-43-529Z.sql` se restauró en una base aislada: 13 tablas y 18 relaciones, sin recursos temporales pendientes. Compilación e instalación local verificadas; interfaz y API responden en el puerto 4000.

El commit sigue pendiente: el intento del 21 de septiembre, tras conceder acceso específico a `.git`, recibió permiso denegado al crear `.git/index.lock`. `GUARDAR-CAMBIOS.cmd` incluye los archivos nuevos y solo realiza commits locales. No se intentó push ni se cambiaron permisos de Windows.

## Implementado y comprobado

- Gestión de pacientes y tutores, incluidos adultos dependientes; departamento para campañas y límites de nombres/correos consistentes.
- Registro múltiple transaccional: stock, fechas, duplicados e intervalos configurados. Lotes que vencen hoy se admiten.
- Programación desde nacimiento o dosis anterior y registro al contacto; revisión cuando faltan antecedentes.
- Editor administrativo de reglas/campañas con fuente, edades, fechas, territorio, versión y auditoría atómica. Se rechazan ciclos y ediciones obsoletas.
- Sesiones consultan el estado y rol actual del usuario. Se conserva al menos un administrador activo. Contraseñas normales con dígitos admitidas; login fallido conserva la pantalla.
- Cola de correo con controles de vigencia y antecedentes. Las pruebas automatizadas no envían correos reales. Una prueba SMTP independiente, autorizada por el usuario, fue aceptada por Gmail.
- Respaldo SQL real generado con mysqldump instalado; escritura completa antes de publicar el archivo.
- Instalación desde cero y actualización repetida verificadas en una base temporal eliminada al finalizar; seed protegido contra reinicio accidental de una base existente.

## Evidencia de validación

Verificación actual: 100 pruebas backend y ocho frontend aprobadas en la suite completa. Compilación Vite correcta. La prueba integral usa interfaz y API en un solo servidor con MySQL temporal; pasó también el cambio de contraseña, el seguimiento entre vacunas y los antecedentes externos. Evidencia más reciente: `hmgu-e2e-evidencia-b5b1E9`, con base temporal eliminada y sin limpieza pendiente. Tras ajustar la paginación del carnet se repitieron sus dos pruebas y se inspeccionaron las dos páginas del PDF ficticio final.

La prueba HTTP crea datos ficticios, ejecuta el flujo y revierte sus cambios. Hay pruebas específicas de formularios con respuestas interceptadas y una prueba integral aparte con API/MySQL reales en una base temporal. El 11 de septiembre se verificó un respaldo nuevo mediante restauración aislada, sin sustituir la base de trabajo (13 tablas y 18 relaciones).

## Pendientes concretos

1. **Validación clínica completa del PAI.** Las fuentes oficiales permitieron configurar pentavalente, SRP (12 y 18 meses), neumococo (2, 4 y 6 meses), fiebre amarilla infantil, VPH por edad y sexo registrado, BCG y la secuencia IPV/bOPV. Rotavirus, influenza, dT, pautas adultas, recuperación, grupos de riesgo y excepciones aún requieren completar criterios y validación clínica. El editor permite administrar estas reglas, pero no sustituye esa validación. No se activaron campañas a partir de fechas de cierre supuestas.
2. **Activación automática de Gmail, aplazada por el usuario.** Remitente y configuración privada instalados; Gmail aceptó el correo de prueba autorizado. SMTP_ENABLED=false se mantiene hasta que el usuario solicite activarlo. No se certifica recepción en la bandeja de entrada.
3. **Inventario real.** El formulario de lotes está disponible; falta ingresar vacuna, lote, vencimiento y cantidades del hospital.
4. **Puesta en producción.** No se desplegó en un servidor público ni se verificó acceso remoto nacional. La aplicación se prueba localmente; el envío por correo no tiene restricción por departamento.

Estos puntos impiden presentar el sistema como aprobado para operación clínica real. La versión funcional está disponible para revisión de la interfaz y flujos. El procedimiento de instalación local ya está preparado en `10-INSTALACION-LOCAL.md`; el servidor público, el inventario y la validación clínica no se han sustituido por datos supuestos.

## Referencias contrastadas

- Pentavalente: https://minsalud.gob.bo/9237-bolivia-dona-255-000-dosis-de-vacuna-pentavalente-para-venezuela-y-haiti
- SRP regular: https://www.minsalud.gob.bo/8713-ministerio-de-salud-y-alcaldia-de-la-paz-lanzan-la-ruta-srp-protegiendo-a-nuestras-ninas-y-ninos-contra-el-sarampion-en-cinco-redes-de-salud
- Neumococo: https://www.minsalud.gob.bo/8555-dos-tipos-de-vacunas-previenen-la-meningitis-en-ninos-menores-de-cinco-anos-completar-el-esquema-de-todas-las-dosis-permite-proteccion-eficaz

Las migraciones solo convierten valores originales reconocidos; conservan identidades e historial y no sobreescriben reglas administradas. Los márgenes de seguimiento originales no se presentan como límites clínicos universales.

## Comprobación de la instalación local del 9 de septiembre

La base real tenía una vacuna y ninguna dosis. Se añadieron tres vacunas y diez dosis (pentavalente, SRP y neumococo) mediante `npm run catalogo:base`, sin tocar pacientes ni reemplazar registros existentes. La importación es repetible y audita las dosis incorporadas. Se añadió el formulario de ingreso de lotes en Configuración. No se inventaron existencias: deben registrarse a partir del inventario real.

Se actualizaron los comandos normales de Vite y se añadió `npm run verificar`. Arranque local y login HTTP 200 comprobados. Gmail permanece desactivado. El bloqueo de Git observado ese día se resolvió posteriormente.

El formulario de lotes fue probado en navegador con API interceptada: rechazo 409 conserva campos; guardado actualiza la lista de stock. No se crearon lotes ficticios en la base real.

## Corrección del carnet

El PDF consulta las aplicaciones históricas independientemente del catálogo activo. Desactivar una vacuna o dosis no elimina su aplicación del carnet. Se añadió una prueba de regresión con catálogo vacío e historial previo.

Verificación final de esta revisión: 64/64 pruebas backend, compilación frontend correcta y `npm run verificar` aprobado (MySQL, estructura, administrador y diez dosis activas). Los cambios se guardaron después en `e5f93b5` y `229318c`; su presencia en GitHub se confirmó el 10 de septiembre.

## Recuperación comprobada el 11 de septiembre

Se agregó `npm run backup:verificar`. Crea una copia nueva, importa con una cuenta limitada exclusivamente a una base temporal, compara estructura e índices y detecta referencias huérfanas. Tanto la base como la cuenta se eliminan antes de informar éxito. No se ejecutan correos.

Respaldo comprobado: `backup_vacunacion_hmgu_2026-09-11T18-16-03-205Z.sql` (excluido de Git). Resultado: 13 tablas, 18 relaciones y eliminación de recursos temporales confirmada. La verificación técnica no equivale a validar el contenido clínico.

Se añadieron seis pruebas automatizadas: recuperación, archivo incompleto/partial, intento de escritura fuera del esquema permitido, referencias huérfanas, timeout y pérdida de clave única/cambio referencial. Detalles operativos en `07-RESPALDOS.md`.

Validación de este avance: 70/70 pruebas backend aprobadas y `npm run backup:verificar` completado sobre un respaldo nuevo de la instalación local. No hubo cambios en la interfaz en esta revisión.

## Prueba integral de interfaz del 12 de septiembre

Se ejecutó `npm run test:e2e` con Edge, interfaz compilada, API real y MySQL temporal, sin respuestas interceptadas. Pasaron los flujos de ambos roles, pacientes y tutor, catálogo/lotes, consulta de Tutores y Vacunación, una visita con dos aplicaciones, stock, corrección auditada, reportes con cifras esperadas, carnet PDF, exportaciones PDF/Excel, alertas y vista móvil oscura. Se eliminaron la base, servidores y compilación temporales.

Se corrigió la ficha que mostraba «al día» cuando el calendario requería revisión. La prueba incluye ese caso. Las ocho pruebas frontend también pasaron. Los 70 tests backend corresponden a la última suite completa del 11 de septiembre; la nueva prueba E2E se ejecuta aparte. Detalles y límites en `08-PRUEBA-INTEGRAL.md`.

El intento de commit de este avance volvió a fallar por permiso denegado al crear `.git/index.lock`, incluso con el permiso específico solicitado. Los cambios posteriores a `229318c` siguen pendientes de commit.

## Ampliación del PAI del 12 de septiembre

Se añadió `edadesPorSexo` como condición opcional de las reglas. El editor, el motor, la auditoría y la consulta del calendario conservan los rangos. Se validan edades generales y específicas simultáneamente, incluidos los cumpleaños exactos y nacimientos en 29 de febrero. Al retirar temporalmente un grupo, el editor conserva su rango para recuperarlo. Un grupo excluido no puede registrarse al contacto; los antecedentes aplicados siguen visibles.

La carga aditiva incorporó a la base local dos vacunas y dos dosis: fiebre amarilla infantil y VPH. Ahora hay doce dosis activas. No se modificaron pacientes ni se crearon existencias. Las referencias y los límites clínicos se detallan en `09-CATALOGO-PAI.md`. La vigencia de notificaciones ahora consulta también el sexo registrado, evitando cancelar recordatorios elegibles.

Verificación: suite backend de 76 pruebas aprobada; después de la corrección de notificaciones pasó su suite de 10 pruebas, incluida una nueva regresión con transporte simulado. Ocho pruebas frontend y compilación Vite aprobadas. Editor con API interceptada: persistencia de rangos, conflicto 409, exclusión de ambos grupos, consulta y vista móvil correctos. Se repitió la prueba completa Edge → React → Express → MySQL temporal, esta vez guardando y consultando rangos por sexo a través de la API real; completó todos los escenarios y eliminó sus recursos temporales.

Evidencia de esa ejecución: `hmgu-e2e-evidencia-5cK48O`, en la carpeta temporal local. `npm run verificar` confirmó MySQL, estructura, administrador y doce dosis; los correos automáticos permanecen desactivados. Interfaz y API respondieron HTTP 200 en los puertos 5173 y 4000 al terminar.

El intento de commit de esta ampliación volvió a recibir permiso denegado para `.git/index.lock`, también después de renovar el permiso específico de escritura en `.git`. No se cambió la seguridad de la carpeta ni se borraron archivos de Git. El código y la documentación están guardados en el árbol de trabajo; todavía no se creó el commit.

## Cierre de instalación local del 13 de septiembre

La raíz del proyecto ofrece npm run build, npm start, npm test y npm run verificar. INICIAR-SISTEMA.cmd abre el servidor integrado en http://localhost:4000 tras compilar. HOST respeta la configuración local y usa loopback por defecto. Se conservan imagen y diseño. El proceso comprueba MySQL, admite cierre ordenado, maneja el puerto ocupado y no deja trabajos huérfanos si falla su programación. Los trabajos reciben la zona horaria de Bolivia. No se habilitó SMTP ni se abrió el firewall.

Configuración ahora permite cambiar contraseñas de usuarios. El cambio y su auditoría son atómicos; la bitácora no incluye clave ni hash. La creación de dosis muestra errores del servidor y conserva campos. BCG se incorporó con una dosis y alcance anterior al primer cumpleaños, tras revisar visualmente la tabla oficial completa: seis vacunas del catálogo base y trece dosis activas en la instalación.

La prueba integral pasó con servidor único y bases ficticias, sin interceptar la API. Evidencia: hmgu-e2e-evidencia-ATuVaO en la carpeta temporal local; base, servidor y compilación de ensayo eliminados. También pasó la prueba específica de formularios de administración con respuestas interceptadas (rechazo, validación y reintento). Una primera ejecución de la prueba integral se corrigió para cerrar la ficha del paciente antes de navegar al cambio de contraseña.

El commit automatizado continúa bloqueado por las restricciones de escritura de .git. Se dejó GUARDAR-CAMBIOS.cmd para ejecución manual desde la sesión del propietario: prepara tres commits por grupo y no hace push ni modifica permisos. No se ejecutó desde otra identidad para eludir el bloqueo. Los cambios posteriores a 229318c siguen sin commit.

## Seguimiento antipolio — 14 de septiembre

La instalación local incorporó dos vacunas y cinco dosis: IPV en posiciones 1 y 3; bOPV en 2, 4 y 5. `npm run verificar` confirmó 18 dosis activas, estructura actualizada, administrador disponible y correo apagado. La carga fue aditiva, sin modificar pacientes ni crear inventario.

Los antecedentes se enlazan por ID entre formulaciones con autorización explícita en la regla. La interfaz muestra vacuna, dosis anterior e intervalo. Al corregir un antecedente se revalida la dosis posterior aunque sea de otra vacuna. Un lote incompatible, un intervalo incumplido o un fallo en la segunda aplicación revierte la visita y sus descuentos. La carga impide fusionar formulaciones por coincidencias ambiguas de nombre/código y revierte si falla la resolución de referencias o la auditoría. Fuente, pauta ordinaria y límites en `09-CATALOGO-PAI.md`.

La suite completa aprobó 90 pruebas backend y ocho frontend. El editor se comprobó además con respuestas interceptadas: opción de otra vacuna, limpieza de selección, conflicto 409, reintento, recarga, numeración discontinua y móvil. El primer fallo del test era un selector exacto que no reconocía el texto de un select; se corrigió el test, sin cambiar el producto.

La prueba integral con API/MySQL reales aprobó todos los recorridos y la nueva referencia entre vacunas: una aplicación anticipada devuelve 422 y conserva el stock. Evidencia: `hmgu-e2e-evidencia-o4tNhX`. Una ejecución anterior se interrumpió sin resultado final; se comprobaron y eliminaron sus recursos ficticios antes de repetir. La ejecución aprobada confirmó su propia limpieza y se inspeccionaron las capturas de seguimiento y ficha móvil.

Interfaz y disponibilidad de MySQL respondieron HTTP 200 en http://localhost:4000. El código está guardado en el árbol de trabajo; la situación de Git se informa por separado y no se equipara guardar archivos a crear commits.

El intento de preparar el commit del 14 de septiembre recibió nuevamente `Permission denied` al crear `.git/index.lock`. No se creó commit ni push. `GUARDAR-CAMBIOS.cmd` incluye ahora los archivos del seguimiento antipolio para su ejecución manual desde la sesión del propietario.

## Antecedentes externos documentados — 14 de septiembre

Administración y enfermería pueden transcribir desde Historial una dosis recibida en otro establecimiento, indicando fecha y documento. Queda identificada como externa y auditada, sin crear cita ni descontar lotes locales. La corrección administrativa conserva su procedencia y comprueba el seguimiento posterior. No sustituye la evaluación clínica ni deduce equivalencias entre biológicos; procedimiento en `11-ANTECEDENTES-EXTERNOS.md`.

Los reportes de aplicaciones locales no suman los antecedentes externos; el historial, el motor y el carnet sí los reconocen. El PDF separa la procedencia externa, ajusta filas largas y repite encabezados al cambiar de página. Se corrigió un salto de página adicional del pie. La interfaz muestra «Calendario configurado» en lugar de afirmar que representa todo el PAI.

La migración conserva las aplicaciones anteriores como locales, con las mismas citas y lotes. Esto se probó con datos anteriores en una base temporal y dos actualizaciones consecutivas. MySQL protege la referencia documental; el verificador de respaldos compara CHECK y su estado y detecta combinaciones incompatibles de procedencia/cita/lote/documento. Se verificó un respaldo nuevo de la instalación, con 13 tablas y 18 relaciones; detalles en `07-RESPALDOS.md`.

Pruebas aprobadas: 100 backend, ocho frontend y formulario con API interceptada para ambos roles. El E2E real `hmgu-e2e-evidencia-b5b1E9` añadió alta desde enfermería, corrección desde administración, dos solicitudes simultáneas con resultados 201/409, auditoría, carnet y producción hospitalaria sin alteración del stock. Una primera ejecución se corrigió para usar el nuevo título de Historial; su base temporal también se eliminó.

Instalación local actualizada: 18 dosis activas, correo apagado y servidor integrado en el puerto 4000. No se agregaron antecedentes ficticios a la base habitual. El intento de commit de este avance volvió a fallar por permiso denegado en `.git/index.lock`; los archivos están guardados y el script de commits manuales incluye este cambio.
