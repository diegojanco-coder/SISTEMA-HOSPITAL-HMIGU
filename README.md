# Sistema de Vacunación — Hospital Materno Germán Urquidi

Aplicación React en `frontend-app`, API Express en `backend` y MySQL 8. El directorio `frontend` anterior fue retirado.

## Inicio sencillo en esta instalación

Desde la carpeta principal:

```powershell
npm run build
npm start
```

Abra http://localhost:4000. La interfaz y la API funcionan en un único proceso. Después de compilar, también puede iniciar con doble clic en `INICIAR-SISTEMA.cmd`. Mantenga MySQL y la terminal abiertos. No ejecute simultáneamente otra API en el puerto 4000.

Las comprobaciones se ejecutan desde la raíz con `npm test` y `npm run verificar`. El procedimiento, las limitaciones del funcionamiento continuo y el guardado manual de commits están en `docs/10-INSTALACION-LOCAL.md`.

## Instalación existente

Desde la carpeta del proyecto, abra dos terminales.

Terminal del backend:

```powershell
cd backend
npm install
npm run migrate:upgrade
npm run verificar
npm run dev
```

Terminal de la interfaz:

```powershell
cd frontend-app
npm install
npm run dev
```

Abra http://localhost:5173. La API usa http://localhost:4000/api/v1.

`npm run catalogo:base`, desde backend, agrega pentavalente, SRP, neumococo, fiebre amarilla infantil, VPH, BCG, IPV y bOPV sin reemplazar dosis existentes. Es un catálogo parcial de ocho vacunas y dieciocho dosis; no actualiza automáticamente esquemas antiguos de la misma vacuna. Polio enlaza antecedentes entre IPV y bOPV manteniendo sus lotes separados. Consulte `docs/09-CATALOGO-PAI.md`. Para registrar existencias reales use **Configuración → Ingreso de lotes y stock**.

`migrate:upgrade` agrega los cambios y conserva los registros. No ejecute `migrate:reset` ni los archivos `schema.sql` sobre una instalación con datos: recrean la base.

## Instalación nueva de demostración

Requiere Node.js 24 (versión probada), MySQL 8 y npm. Copie `backend/.env.example` a `backend/.env` y configure DB_HOST, DB_USER, DB_PASSWORD, DB_NAME y un JWT_SECRET aleatorio. Copie `frontend-app/.env.example` a `frontend-app/.env` si necesita cambiar la URL de la API.

Desde `backend`, con una base que todavía no exista:

```powershell
npm install
npm run seed
npm run migrate:upgrade
npm run verificar
npm run dev
```

El seed contiene usuarios y pacientes ficticios para demostración. Usuarios iniciales: `admin` y `enfermeria`, contraseña `Admin123!`. Cambie esas contraseñas antes de utilizar datos reales. No use el seed para recuperar un usuario perdido en una base existente.

## Funciones

- Pacientes de distintas edades, dependientes y vínculos con tutores.
- Registro de varias dosis por visita, validación de stock, fechas e intervalos configurados.
- Historial y correcciones administrativas auditadas.
- Antecedentes externos documentados, con establecimiento y referencia de carnet, sin descontar existencias locales. Consulte `docs/11-ANTECEDENTES-EXTERNOS.md`.
- Reglas por edad y sexo registrado, seguimiento desde dosis anteriores y campañas por vigencia y departamento.
- Alertas y cola de correo con reintentos; carnet PDF y reportes PDF/Excel.
- Administración de usuarios, calendario y respaldos.

En **Configuración → Reglas del calendario y campañas**, seleccione una dosis, indique fuente, población y programación y guarde. Cada edición se versiona y audita. Una regla deshabilitada no genera recordatorios. Las temporadas deben usar dosis distintas, conservando las identidades históricas.

El software aplica las reglas configuradas; no se declara validado todo el PAI. Las dosis sin reglas verificadas para adultos requieren revisión. Hay información clínica y pautas pendientes de contrastar: consulte `docs/05-CALENDARIO-ADULTOS.md` y `docs/06-ENTREGA.md`.

## Gmail y respaldos

Configure SMTP_* localmente siguiendo `backend/.env.gmail.example`. Use contraseña de aplicación cuando la cuenta lo requiera; no comparta claves en el chat ni las guarde en Git. SMTP_ENABLED=false conserva la cola sin enviar. En esta instalación se configuró el remitente y Gmail aceptó una prueba autorizada. El envío automático permanece desactivado por decisión del usuario; la aceptación SMTP no certifica recepción en la bandeja de entrada.

`npm run backup`, desde backend, genera un SQL completo. Configure MYSQLDUMP_PATH si la herramienta no está en PATH. Solo se publican respaldos cuyo proceso y escritura finalizaron correctamente; los archivos parciales no se listan. Los respaldos contienen datos de la base y están excluidos de Git.

`npm run backup:verificar` crea un respaldo nuevo y comprueba su restauración en una base temporal. Requiere `mysqldump`, el cliente `mysql` (configure MYSQL_PATH si no está disponible) y una cuenta de mantenimiento con permisos para crear/eliminar la base y cuenta temporales y conceder privilegios sobre esa base. No conceda esos permisos al usuario habitual del servidor web solo para ejecutar esta comprobación: puede suministrar DB_USER y DB_PASSWORD mediante el entorno del comando de mantenimiento.

La importación utiliza una cuenta aleatoria limitada al esquema temporal. Se comprueban tablas, columnas, índices y claves únicas, reglas de claves foráneas y referencias huérfanas; se muestra el SHA-256 del archivo y conteos agregados. Al finalizar se eliminan la base y cuenta temporales. No se sustituye la base del sistema ni se ejecutan recordatorios. Un archivo incompleto, un objeto no admitido o una limpieza fallida devuelven error. La comprobación está preparada para el esquema de tablas de esta aplicación: rutinas, eventos, triggers o vistas requieren un procedimiento separado. Si cambia la estructura de la aplicación durante el respaldo, la comparación puede fallar y debe repetirse sin migraciones concurrentes.

La comprobación verifica recuperación técnica y relaciones; no certifica exactitud clínica de los datos ni reemplaza una política de copias externas. Consulte `docs/07-RESPALDOS.md`.

## Verificación

```powershell
# backend
npm test
npm run verificar

# frontend-app
npm test
npm run build
```

Las pruebas de backend usan transacciones revertidas. Las pruebas de instalación y respaldo crean y eliminan exclusivamente bases y cuentas temporales propias (`hmgu_test_install_`, `hmguverifyfixture` y `hmguverify`). Requieren los permisos MySQL correspondientes. No envían correos reales.

Pruebas de navegador: con `npm run preview -- --host 127.0.0.1 --port 5173 --strictPort` activo y Playwright/Edge disponibles, ejecute los archivos `frontend-app/test/*-browser.cjs`. PLAYWRIGHT_MODULE admite la ruta de una instalación externa de Playwright. Estas pruebas interceptan la API con datos ficticios; la prueba `backend/test/flujo-http.integration.test.js` verifica la API real contra MySQL y revierte sus datos.

## Prueba completa en navegador

Desde `backend`, ejecute `npm run test:e2e`. Requiere MySQL con permisos para crear/eliminar una base temporal propia, dependencias de ambos proyectos, Playwright y Edge. Si Playwright está instalado fuera del proyecto, defina PLAYWRIGHT_MODULE con su ruta; TEST_BROWSER permite escoger otro canal de navegador instalado.

Esta prueba compila una interfaz separada y usa API y MySQL reales en puertos locales dinámicos. Crea solamente datos ficticios en una base `hmgu_e2e_...`; no modifica `.env`, no carga los jobs y fuerza SMTP_ENABLED=false. Comprueba ambos roles, pacientes/tutor, catálogo/lotes, aplicación múltiple, stock, historial, reportes, alertas, auditoría y pantalla móvil. El resultado JSON y las capturas quedan en la carpeta temporal de evidencias indicada al terminar. La base, servidores y compilación temporales se eliminan. Si un proceso se termina abruptamente, consulte el identificador en `recurso.json` antes de revisar una limpieza manual; nunca borre bases por prefijo sin identificar la ejecución.

Esta prueba de flujos no certifica el PAI clínico completo, recepción real de correos, concurrencia con muchos usuarios ni despliegue público. Consulte `docs/08-PRUEBA-INTEGRAL.md`.

## Git

La preferencia actual es crear commits locales sin hacer push. `GUARDAR-CAMBIOS.cmd` agrupa los archivos revisados, excluye configuración privada y respaldos, y no cambia permisos ni publica en remoto. Si Windows impide escribir en `.git`, los archivos permanecen en el árbol de trabajo; eso no equivale a un commit.

## Registro de pacientes

Nuevo Paciente permite elegir menor/recién nacido o adulto y completar Datos, Contacto y Revisión. Admite tutor existente, adulto dependiente, identificación provisional y prerregistro sin correo. La ficha identifica el contacto principal y los datos pendientes. Procedimiento y actualización: [Registro de pacientes](docs/12-REGISTRO-PACIENTES.md).
