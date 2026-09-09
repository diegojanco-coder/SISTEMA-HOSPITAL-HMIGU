# Sistema de Vacunación — Hospital Materno Germán Urquidi

Aplicación React en `frontend-app`, API Express en `backend` y MySQL 8. El directorio `frontend` anterior fue retirado.

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

`npm run catalogo:base`, desde backend, agrega pentavalente, SRP y neumococo con las edades contrastadas sin reemplazar dosis existentes. Para registrar existencias reales use **Configuración → Ingreso de lotes y stock**.

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
- Reglas por edad, seguimiento desde dosis anteriores y campañas por vigencia y departamento.
- Alertas y cola de correo con reintentos; carnet PDF y reportes PDF/Excel.
- Administración de usuarios, calendario y respaldos.

En **Configuración → Reglas del calendario y campañas**, seleccione una dosis, indique fuente, población y programación y guarde. Cada edición se versiona y audita. Una regla deshabilitada no genera recordatorios. Las temporadas deben usar dosis distintas, conservando las identidades históricas.

El software aplica las reglas configuradas; no se declara validado todo el PAI. Las dosis sin reglas verificadas para adultos requieren revisión. Hay información clínica y pautas pendientes de contrastar: consulte `docs/05-CALENDARIO-ADULTOS.md` y `docs/06-ENTREGA.md`.

## Gmail y respaldos

Configure SMTP_* localmente siguiendo `backend/.env.gmail.example`. Use contraseña de aplicación cuando la cuenta lo requiera; no comparta claves en el chat ni las guarde en Git. SMTP_ENABLED=false conserva la cola sin enviar. En esta instalación se configuró el remitente y Gmail aceptó una prueba autorizada. El envío automático permanece desactivado por decisión del usuario; la aceptación SMTP no certifica recepción en la bandeja de entrada.

`npm run backup`, desde backend, genera un SQL completo. Configure MYSQLDUMP_PATH si la herramienta no está en PATH. Solo se publican respaldos cuyo proceso y escritura finalizaron correctamente; los archivos parciales no se listan. Los respaldos contienen datos de la base y están excluidos de Git.

## Verificación

```powershell
# backend
npm test
npm run verificar

# frontend-app
npm test
npm run build
```

Las pruebas de backend usan transacciones revertidas; la prueba de instalación crea y elimina exclusivamente una base temporal propia con prefijo `hmgu_test_install_`. Requieren permisos MySQL para esa base. No envían correos reales.

Pruebas de navegador: con `npm run preview -- --host 127.0.0.1 --port 5173 --strictPort` activo y Playwright/Edge disponibles, ejecute los archivos `frontend-app/test/*-browser.cjs`. PLAYWRIGHT_MODULE admite la ruta de una instalación externa de Playwright. Estas pruebas interceptan la API con datos ficticios; la prueba `backend/test/flujo-http.integration.test.js` verifica la API real contra MySQL y revierte sus datos.

## Git

Se solicitó un commit por cambio terminado. En esta sesión Git rechaza la escritura de `.git/index.lock`; no se han creado commits del avance acumulado. Los cambios permanecen en los archivos. No se debe afirmar que existe un commit sin comprobar su identificador.
