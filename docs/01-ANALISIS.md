# Fase 1 — Análisis del Sistema

**Proyecto:** Sistema Web Móvil para el Control y Seguimiento del Esquema de Vacunación Inteligente de Pacientes
**Institución:** Hospital Materno Germán Urquidi — Cochabamba, Bolivia

## 1. Actores del sistema

| Actor | Descripción |
|---|---|
| Administrador | Gestiona usuarios, tiene acceso total al sistema, configura catálogo de vacunas y visualiza auditoría y respaldos. |
| Enfermero(a) | Registra pacientes, tutores, aplicaciones de vacunas, consulta historiales, alertas y genera carnets/reportes. |
| Sistema (motor inteligente) | Actor no humano: calcula edades, compara con el calendario PAI Bolivia, genera alertas automáticas y actualiza estados de vacunación. |

No existe un rol "paciente/tutor" con acceso directo al sistema en el alcance actual; la consulta pública queda fuera de alcance (posible trabajo futuro vía QR de solo lectura del carnet).

## 2. Requerimientos funcionales

**Autenticación y usuarios**

- RF01. El sistema debe permitir el inicio de sesión mediante correo/usuario y contraseña.
- RF02. El sistema debe emitir un token JWT válido tras una autenticación exitosa y rechazar credenciales inválidas.
- RF03. El sistema debe permitir cerrar sesión invalidando el token del lado del cliente.
- RF04. El administrador debe poder crear, editar, desactivar y listar usuarios, asignando el rol (administrador o enfermero).
- RF05. Las contraseñas deben almacenarse cifradas (bcrypt), nunca en texto plano.

**Pacientes**

- RF06. El sistema debe permitir registrar un paciente con datos personales, fecha de nacimiento y datos de contacto.
- RF07. El sistema debe permitir editar y eliminar (baja lógica) pacientes.
- RF08. El sistema debe permitir buscar pacientes por nombre, carnet de identidad o código de paciente.
- RF09. El sistema debe listar pacientes con paginación y filtros.

**Tutores**

- RF10. El sistema debe permitir el CRUD completo de tutores (padre, madre o responsable legal).
- RF11. El sistema debe permitir asociar uno o más tutores a un paciente, y un tutor a uno o más pacientes (relación N:M mediante `paciente_tutor`).

**Vacunas y dosis**

- RF12. El sistema debe permitir el CRUD completo del catálogo de vacunas (BCG, Hepatitis B, Pentavalente, Rotavirus, OPV, Neumocócica, SRP, Fiebre Amarilla, Influenza, etc.).
- RF13. Cada vacuna debe tener definido su esquema de dosis (edad recomendada, orden de dosis, intervalo mínimo entre dosis) según el Calendario Nacional de Inmunización de Bolivia (PAI).

**Historial de vacunación**

- RF14. El sistema debe permitir registrar la aplicación de una dosis a un paciente (vacuna, dosis, fecha, lote, responsable).
- RF15. El sistema debe permitir consultar el historial completo de un paciente.
- RF16. El sistema debe permitir editar/corregir un registro de historial, dejando rastro en auditoría.

**Módulo inteligente**

- RF17. El sistema debe calcular la edad exacta del paciente (años, meses, días) a partir de su fecha de nacimiento.
- RF18. El sistema debe comparar la edad del paciente contra el esquema PAI Bolivia y determinar, por cada dosis: aplicada, pendiente, próxima o atrasada/vencida.
- RF19. El sistema debe generar alertas automáticas (verde/amarillo/rojo) por paciente y dosis.

**Reportes y carnet**

- RF20. El sistema debe generar un carnet digital en PDF con logo del hospital, datos del paciente, historial completo, próximas vacunas y código QR de verificación.
- RF21. El sistema debe generar reportes de: pacientes registrados, vacunas aplicadas, vacunas pendientes, cobertura de vacunación, pacientes por rango de edad y vacunas por fecha.
- RF22. Los reportes deben poder exportarse en PDF y Excel.

**Auditoría y respaldo**

- RF23. El sistema debe registrar en bitácora de auditoría toda acción de creación, edición o eliminación (usuario, acción, entidad, fecha/hora, IP).
- RF24. El sistema debe contar con un módulo de respaldo automático (programado) de la base de datos.

## 3. Requerimientos no funcionales

- RNF01. **Usabilidad:** interfaz responsive (escritorio, tablet, móvil), navegación clara tipo sistema hospitalario, feedback visual inmediato (SweetAlert2).
- RNF02. **Seguridad:** JWT con expiración, contraseñas con bcrypt (salt ≥ 10), control de acceso por rol en cada endpoint, sanitización de entradas, prevención de inyección SQL (consultas parametrizadas), cabeceras HTTP seguras (helmet), CORS restringido.
- RNF03. **Rendimiento:** respuestas de API ≤ 500 ms en operaciones CRUD estándar bajo carga normal; consultas indexadas.
- RNF04. **Disponibilidad:** arquitectura preparada para despliegue 24/7 con reinicio automático (PM2/Docker) y respaldos periódicos.
- RNF05. **Escalabilidad:** arquitectura modular (MVC + servicios) que permita agregar nuevos módulos (p. ej. citas, notificaciones SMS) sin reescribir el núcleo.
- RNF06. **Mantenibilidad:** código comentado, separación de capas (controller/service/model), convenciones de nombres consistentes.
- RNF07. **Portabilidad:** despliegue mediante Node.js estándar y MySQL, contenerizable con Docker.
- RNF08. **Compatibilidad:** funcional en los navegadores modernos (Chrome, Edge, Firefox) y en dispositivos móviles Android/iOS vía navegador.
- RNF09. **Auditabilidad:** trazabilidad completa de cambios sensibles (pacientes, historial, usuarios).
- RNF10. **Integridad de datos:** restricciones a nivel de base de datos (FK, UNIQUE, CHECK) además de validación en backend y frontend.

## 4. Reglas de negocio

- RN01. Un paciente puede tener uno o más tutores; un tutor puede estar asociado a varios pacientes.
- RN02. No se puede registrar una dosis de una vacuna si el paciente ya tiene registrada esa misma dosis (evita duplicidad), salvo corrección explícita con auditoría.
- RN03. La edad del paciente al momento de la aplicación no puede ser negativa ni futura respecto a la fecha de nacimiento.
- RN04. El estado de una dosis se calcula así: **aplicada** si existe registro en `historial_vacunacion`; si no existe, se compara la edad actual con la ventana `edad_recomendada_dias` ± tolerancia definida en `dosis`: **pendiente** (edad ya alcanzada, dentro de ventana de gracia), **próxima** (faltan ≤ 30 días para la edad recomendada) o **atrasada** (edad recomendada + tolerancia superada sin aplicación).
- RN05. Solo usuarios con rol `administrador` pueden gestionar usuarios y el catálogo de vacunas/dosis.
- RN06. Todo usuario autenticado (`administrador` o `enfermero`) puede operar sobre pacientes, tutores, historial y reportes.
- RN07. Un usuario inactivo no puede iniciar sesión aunque sus credenciales sean correctas.
- RN08. Toda operación de creación, edición o eliminación sobre `usuarios`, `pacientes`, `tutores`, `historial_vacunacion` y `vacunas` genera un registro en `auditoria`.
- RN09. Las eliminaciones de pacientes, tutores y usuarios son lógicas (`estado = 'inactivo'`), nunca físicas, para preservar el historial clínico.
- RN10. El carnet digital solo puede generarse para pacientes con al menos un registro de historial o con esquema vigente calculado.

## 5. Casos de uso

1. **CU01 — Iniciar sesión:** el usuario ingresa credenciales; el sistema valida contra `usuarios`, compara hash bcrypt, y si es válido y el usuario está activo, emite JWT con `id`, `rol` y expiración.
2. **CU02 — Gestionar usuarios (admin):** crear/editar/desactivar/listar usuarios del personal de salud.
3. **CU03 — Registrar paciente:** capturar datos personales y fecha de nacimiento; el sistema calcula automáticamente la edad y el esquema de vacunación aplicable.
4. **CU04 — Registrar tutor y asociarlo a paciente:** capturar datos del tutor y vincularlo a uno o más pacientes.
5. **CU05 — Gestionar catálogo de vacunas y dosis (admin):** definir vacunas y su esquema de dosis según PAI Bolivia.
6. **CU06 — Registrar aplicación de vacuna:** el enfermero selecciona paciente, vacuna y dosis pendiente; registra fecha, lote y observaciones; el sistema actualiza el estado del esquema.
7. **CU07 — Consultar historial de vacunación:** ver línea de tiempo de dosis aplicadas, pendientes, próximas y atrasadas de un paciente.
8. **CU08 — Visualizar alertas:** panel con semáforo (verde/amarillo/rojo) por paciente, filtrable por estado y fecha.
9. **CU09 — Generar carnet digital (PDF):** exportar carnet con logo, datos, historial, próximas dosis y QR de verificación.
10. **CU10 — Generar reportes:** seleccionar tipo de reporte, rango de fechas/edad, y exportar a PDF/Excel.
11. **CU11 — Consultar auditoría (admin):** revisar bitácora de acciones del sistema.
12. **CU12 — Respaldo de base de datos (admin):** ejecutar o programar respaldo automático de la BD.

## 6. Flujos del sistema (resumen)

**Flujo — Registro y control de vacunación:**
Login → Registrar paciente (y tutor si es nuevo) → el motor inteligente calcula edad y esquema PAI → se listan dosis pendientes/próximas/atrasadas → enfermero registra aplicación de dosis → el sistema recalcula el estado → se generan/actualizan alertas → opcionalmente se emite el carnet digital en PDF.

**Flujo — Alertas automáticas:**
Job programado (o cálculo on-demand al consultar) recorre pacientes activos → calcula edad exacta → compara contra `dosis.edad_recomendada_dias` y tolerancia → inserta/actualiza registros en `alertas` con estado `verde`/`amarillo`/`rojo` → el dashboard muestra el resumen y notificaciones.

**Flujo — Auditoría:**
Cualquier operación de escritura (POST/PUT/DELETE) pasa por el middleware de auditoría → se registra usuario, acción, entidad, id afectado, datos previos/nuevos (JSON), IP y timestamp en `auditoria`.
