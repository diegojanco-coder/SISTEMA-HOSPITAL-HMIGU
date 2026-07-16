# Sistema Web Móvil para el Control y Seguimiento del Esquema de Vacunación Inteligente de Pacientes

**Hospital Materno Germán Urquidi — Cochabamba, Bolivia**

Plataforma web responsive (arquitectura cliente-servidor, API REST, MVC) que digitaliza el registro y seguimiento del esquema de vacunación de pacientes, con un motor inteligente que compara la edad exacta de cada paciente contra el Calendario Nacional de Inmunización de Bolivia (PAI) y genera alertas automáticas (verde / amarillo / rojo), carnets digitales en PDF con código QR, y reportes exportables a PDF y Excel.

## Estructura del repositorio

```
vacunas-hospital/
├── docs/
│   ├── 01-ANALISIS.md        # Fase 1: requerimientos, actores, casos de uso, reglas de negocio, flujos
│   └── 02-DISENO.md          # Fase 2: arquitectura, MER, diagrama relacional, UML, módulos, diseño de API
├── database/
│   ├── schema.sql            # Fase 3: script SQL completo (9 tablas, PK/FK/índices/restricciones)
│   └── seed.sql               # Datos semilla: usuario admin, catálogo PAI Bolivia, pacientes de ejemplo
├── backend/                  # Fase 4: API REST en Node.js + Express (MVC + servicios)
└── frontend/                 # Fase 5: SPA en React + Vite + Tailwind CSS
```

## Stack tecnológico

- **Frontend:** React 18, Vite, React Router DOM, Axios, Tailwind CSS, React Hook Form, SweetAlert2.
- **Backend:** Node.js, Express.js, arquitectura MVC + capa de servicios.
- **Base de datos:** MySQL 8 (InnoDB, utf8mb4).
- **Seguridad:** JWT, bcrypt, middlewares de autorización por rol, Helmet, CORS restringido, rate limiting, sanitización de entradas, consultas parametrizadas (mysql2).
- **Módulo inteligente:** cálculo de edad exacta + comparación contra el esquema PAI Bolivia (`backend/src/services/motorVacunacion.service.js`).
- **Documentos:** generación de PDF (pdfkit), QR (qrcode), Excel (exceljs).
- **Automatización:** `node-cron` para recálculo diario de alertas y respaldo automático de la base de datos (`mysqldump`).

## Puesta en marcha

### 1. Base de datos

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

O bien, desde el backend (usa las credenciales de `.env`):

```bash
cd backend
npm run migrate      # crea el esquema
npm run seed         # crea el esquema + carga datos semilla
```

**Usuario administrador por defecto:** `admin` / `Admin123!` (cambiar tras el primer inicio de sesión).
**Usuario de enfermería de prueba:** `enfermeria` / `Admin123!`.

### 2. Backend

```bash
cd backend
cp .env.example .env      # ajustar credenciales de MySQL, JWT_SECRET, etc.
npm install
npm run dev                # http://localhost:4000/api/v1
```

Verificación rápida: `GET http://localhost:4000/api/v1/health`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env       # VITE_API_URL=http://localhost:4000/api/v1
npm install
npm run dev                 # http://localhost:5173
```

### 4. Producción

- Backend: `npm start` (o gestionarlo con PM2/Docker); configurar `NODE_ENV=production`, `JWT_SECRET` robusto y `FRONTEND_URL` con el dominio real.
- Frontend: `npm run build` genera `dist/`, servible con Nginx/Apache o cualquier hosting estático.
- Base de datos: aplicar `schema.sql` + `seed.sql` (o solo el esquema en producción real, sin datos de ejemplo).
- Respaldo automático: configurado por defecto a las 02:00 am (`BACKUP_CRON` en `.env`); requiere que `mysqldump` esté disponible en el `PATH` del servidor.

## Módulo inteligente de vacunación (resumen)

Por cada dosis del calendario PAI Bolivia, el sistema calcula la edad exacta del paciente y determina su estado:

| Estado | Semáforo | Condición |
|---|---|---|
| Aplicada | — | Existe registro en `historial_vacunacion` |
| Próxima | Amarillo | Faltan ≤ 30 días para la edad recomendada |
| Pendiente | Amarillo | La edad recomendada ya se alcanzó, dentro del margen de tolerancia |
| Atrasada | Rojo | Se superó la edad recomendada + tolerancia sin aplicar |
| Al día | Verde | El paciente no tiene dosis próximas, pendientes ni atrasadas |

La lógica es pura y está aislada en `backend/src/services/motorVacunacion.service.js`, reutilizada por el historial, las alertas, el carnet digital y los reportes de cobertura/pendientes.

## Entregables cubiertos

1. Arquitectura completa — `docs/02-DISENO.md`
2. Modelo relacional — `docs/02-DISENO.md` (MER + tabla de claves)
3. Script SQL — `database/schema.sql`, `database/seed.sql`
4. Backend Express completo — `backend/`
5. Frontend React completo — `frontend/`
6. APIs REST — `docs/02-DISENO.md` (tabla de endpoints) + `backend/src/routes`
7. Sistema JWT — `backend/src/middlewares/auth.middleware.js`, `backend/src/utils/jwt.util.js`
8. Dashboards (administrador / enfermero) — `frontend/src/pages/DashboardAdmin.jsx`, `DashboardEnfermero.jsx`
9. CRUDs (usuarios, pacientes, tutores, vacunas/dosis, historial) — controllers/services/models + páginas correspondientes
10. Reportes PDF/Excel — `backend/src/services/reporte.service.js`, `frontend/src/pages/Reportes.jsx`
11. Carnet digital PDF con QR — `backend/src/services/carnet.service.js`
12. Alertas automáticas — `backend/src/services/alerta.service.js` + job programado
13. Auditoría — `backend/src/middlewares/audit.middleware.js`, tabla `auditoria`
14. Código comentado — comentarios JSDoc/inline en servicios y utilidades clave
15. Estructura profesional lista para producción — separación por capas, variables de entorno, scripts de migración y respaldo

## Notas de verificación

- Todos los archivos `.js` del backend pasaron `node --check` (sin errores de sintaxis).
- Todas las rutas de importación relativas del frontend fueron verificadas (resuelven a un archivo existente) y se validó el balance de llaves/paréntesis en cada archivo.
- La instalación de dependencias (`npm install`) y el build (`npm run build` / `npm run dev`) deben ejecutarse en el entorno real del desarrollador (requieren acceso completo al registro de npm, no disponible en el entorno de generación de este proyecto).
