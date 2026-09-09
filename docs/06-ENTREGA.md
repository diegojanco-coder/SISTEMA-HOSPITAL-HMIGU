# Estado de entrega — 9 de septiembre de 2026

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

Última suite completa registrada: 64 pruebas backend aprobadas, incluidas API real, permisos, exportaciones y nueva instalación. Ocho pruebas frontend aprobadas y compilación Vite correcta. Navegador: seis escenarios de vacunación, historial/permisos en ambos roles y editor de campaña/contacto con recuperación de conflicto. Vista móvil oscura del editor revisada.

La prueba HTTP crea datos ficticios, ejecuta el flujo y revierte sus cambios. La prueba de navegador usa respuestas interceptadas: no equivale por sí sola a probar la base real. El respaldo real no fue restaurado sobre la base de trabajo.

## Pendientes concretos

1. **Validación clínica completa del PAI.** Las fuentes oficiales permitieron corregir pentavalente, SRP (12 y 18 meses) y neumococo (2, 4 y 6 meses). El resto del catálogo original y las pautas adultas, recuperación, grupos de riesgo y excepciones aún requieren contraste completo. El editor permite administrar estas reglas, pero no sustituye la validación clínica. No se activaron campañas a partir de fechas de cierre supuestas.
2. **Activación automática de Gmail, aplazada por el usuario.** Remitente y configuración privada instalados; Gmail aceptó el correo de prueba autorizado. SMTP_ENABLED=false se mantiene hasta que el usuario solicite activarlo. No se certifica recepción en la bandeja de entrada.
3. **Commits.** El sistema rechaza `.git/index.lock` por permisos pese al acceso solicitado. No se hicieron commits ni se publicó el repositorio.
4. **Puesta en producción.** No se desplegó en un servidor público ni se verificó acceso remoto nacional. La aplicación se prueba localmente; el envío por correo no tiene restricción por departamento.

Estos puntos impiden presentar el sistema como aprobado para operación clínica real. La versión funcional está disponible para revisión de la interfaz y flujos.

## Referencias contrastadas

- Pentavalente: https://minsalud.gob.bo/9237-bolivia-dona-255-000-dosis-de-vacuna-pentavalente-para-venezuela-y-haiti
- SRP regular: https://www.minsalud.gob.bo/8713-ministerio-de-salud-y-alcaldia-de-la-paz-lanzan-la-ruta-srp-protegiendo-a-nuestras-ninas-y-ninos-contra-el-sarampion-en-cinco-redes-de-salud
- Neumococo: https://www.minsalud.gob.bo/8555-dos-tipos-de-vacunas-previenen-la-meningitis-en-ninos-menores-de-cinco-anos-completar-el-esquema-de-todas-las-dosis-permite-proteccion-eficaz

Las migraciones solo convierten valores originales reconocidos; conservan identidades e historial y no sobreescriben reglas administradas. Los márgenes de seguimiento originales no se presentan como límites clínicos universales.

## Comprobación de la instalación local del 9 de septiembre

La base real tenía una vacuna y ninguna dosis. Se añadieron tres vacunas y diez dosis (pentavalente, SRP y neumococo) mediante `npm run catalogo:base`, sin tocar pacientes ni reemplazar registros existentes. La importación es repetible y audita las dosis incorporadas. Se añadió el formulario de ingreso de lotes en Configuración. No se inventaron existencias: deben registrarse a partir del inventario real.

Se actualizaron los comandos normales de Vite y se añadió `npm run verificar`. Arranque local y login HTTP 200 comprobados. Gmail permanece desactivado y el commit sigue bloqueado por `.git/index.lock`.

El formulario de lotes fue probado en navegador con API interceptada: rechazo 409 conserva campos; guardado actualiza la lista de stock. No se crearon lotes ficticios en la base real.

## Corrección del carnet

El PDF consulta las aplicaciones históricas independientemente del catálogo activo. Desactivar una vacuna o dosis no elimina su aplicación del carnet. Se añadió una prueba de regresión con catálogo vacío e historial previo.

Verificación final de esta revisión: 64/64 pruebas backend, compilación frontend correcta y `npm run verificar` aprobado (MySQL, estructura, administrador y diez dosis activas). El nuevo intento de preparar el commit fue rechazado al crear `.git/index.lock`; no se creó ningún commit.
