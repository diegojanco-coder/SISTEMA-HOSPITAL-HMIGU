# Frontend Integrado (shadcn/ui) — Sistema de Vacunación HMGU

Este es el frontend que subiste (React + TypeScript + Vite + Tailwind v4 + shadcn/ui),
**con el diseño visual intacto**, ahora conectado en su totalidad al backend real
(Node.js + Express + MySQL) del proyecto `vacunas-hospital`.

## Qué se hizo

- **Login real**: se eliminó `TEMP_USERS`. `App.tsx` ahora llama a `POST /api/v1/auth/login`,
  guarda el JWT y persiste la sesión en `localStorage` (`src/lib/auth-context.tsx`).
- **Roles**: el backend maneja 2 roles (`administrador`, `enfermero`). El mock original tenía 3
  (`admin`/`enfermera`/`enfermero`); se unificó a los 2 reales del backend, conservando las
  mismas etiquetas visuales ("Administrador" / "Enfermería").
- **Todas las pantallas conectadas a la API real** (sin datos simulados): Dashboard, Pacientes,
  Vacunación, Alertas, Reportes, Configuración (Usuarios, catálogo de vacunas, respaldo, auditoría).
- **Módulos nuevos** (mismo estilo visual, usando las mismas primitivas de diseño):
  Tutores (CRUD), Historial (búsqueda global), Carnet Digital (descarga de PDF con QR), Auditoría
  (dentro de Configuración, botón "Ver Logs del Sistema").
- **Protección de rutas por rol**: "Configuración" y sus acciones (usuarios, catálogo de vacunas,
  recalcular alertas) están disponibles solo para `administrador`, igual que en el backend.
- Se agregó `axios` como cliente HTTP, una capa de `services/` tipada en TypeScript, y un
  `tsconfig.json` mínimo (el proyecto original no tenía uno).
- Los archivos `AddVaccine.tsx`, `Alerts.tsx`, `PatientList.tsx`, `PatientProfile.tsx` y
  `Reports.tsx` eran código huérfano (no se usaban en ningún lado, de una iteración anterior del
  diseño) — pueden eliminarse manualmente, no se importan desde ningún lugar del proyecto.

## Puesta en marcha

Requiere que el backend (`../backend`) y la base de datos ya estén configurados y corriendo
(ver el `README.md` general del proyecto).

```bash
cd frontend-app
cp .env.example .env      # VITE_API_URL=http://localhost:4000/api/v1
npm install
npm run dev
```

## Credenciales (datos semilla del backend)

- Administrador: `admin@hmgu.gob.bo` / `Admin123!`
- Enfermería: `enfermeria@hmgu.gob.bo` / `Admin123!`

## Estructura agregada

```
src/
├── lib/
│   ├── api.ts              # cliente Axios + interceptores JWT
│   ├── auth-context.tsx    # Context de sesión (login/logout/persistencia)
│   └── types.ts            # tipos TypeScript que reflejan las respuestas del backend
├── services/                # un archivo por recurso (pacientes, tutores, vacunas, historial,
│                             #  alertas, reportes, usuarios, auditoria, backup)
└── app/components/
    ├── Dashboard.tsx         # shell: sidebar + header + enrutamiento por sección (sin router,
    │                         #  igual que el diseño original)
    └── dashboard/            # una sección por archivo: DashboardHome, Pacientes, Tutores,
                                #  Vacunacion, Historial, Alertas, CarnetDigital, Reportes,
                                #  Configuracion (usuarios + catálogo + respaldo + auditoría)
```

## Nota sobre verificación

No fue posible ejecutar `npm install` completo en el entorno donde se generó este proyecto
(la resolución de la red de dependencias —muchos paquetes Radix UI/MUI— no llegó a completarse
por limitaciones de red del sandbox). Se verificó en su lugar que todas las rutas de importación
relativas resuelven correctamente y que no hay llaves/paréntesis desbalanceados en ningún archivo.
Ejecuta `npm install && npm run dev` en tu máquina para la verificación funcional completa.
