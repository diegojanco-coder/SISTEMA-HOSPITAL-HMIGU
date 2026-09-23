# Inicio y revisión local

Desde la carpeta principal del proyecto:

```powershell
npm run build
npm start
```

Abra http://localhost:4000. El primer comando prepara la interfaz para la misma dirección de la API. El segundo inicia un único proceso. Después de compilar puede abrir `INICIAR-SISTEMA.cmd` con doble clic. La terminal debe permanecer abierta; Ctrl+C detiene el servidor. MySQL debe estar iniciado.

Este inicio no cambia contraseñas, no modifica `.env`, no ejecuta migraciones, no carga datos ficticios y no activa correos. Ante un puerto ocupado informa el problema; no detiene otro programa. No combine esta modalidad con otra API del mismo proyecto en el puerto 4000.

## Comprobaciones

- `npm run verificar`: conexión, estructura, administrador, catálogo y estado de correo.
- `npm test`: pruebas backend y frontend.
- `npm --prefix backend run test:e2e`: navegador y API reales con MySQL temporal. Requiere Playwright y Edge; puede indicar PLAYWRIGHT_MODULE si está instalado fuera del proyecto.
- `/api/v1/health`: proceso disponible.
- `/api/v1/ready`: comprueba MySQL, devuelve 503 si no está disponible y no publica detalles de conexión.

La página inicial no se conserva en caché; los recursos compilados con nombre único pueden almacenarse. Las rutas desconocidas de API devuelven 404 y no reciben HTML. Solo se sirve la carpeta compilada, no la raíz del proyecto.

## Administración

En Configuración, cada usuario tiene un botón **Cambiar contraseña**. Solo administradores pueden hacerlo. Pide confirmación de la nueva clave y valida entre 8 y 20 caracteres con mayúscula, minúscula y número. El guardado y la auditoría ocurren en la misma transacción; la bitácora registra el cambio sin clave ni hash.

Si la API rechaza una nueva dosis, el formulario conserva los datos y muestra el motivo. Una respuesta de error no se presenta como un guardado correcto.

## Funcionamiento continuo y acceso remoto

El arranque escucha en 127.0.0.1: sirve para esta PC. Los trabajos usan America/La_Paz por defecto: alertas a las 06:00, respaldo a las 02:00 y procesamiento de correo cada cinco minutos. Solo funcionan mientras el proceso y MySQL estén activos. SMTP_ENABLED=false sigue impidiendo envíos.

Para una instalación permanente hacen falta un equipo o servidor que permanezca encendido y un mecanismo del administrador del equipo para reiniciar el proceso ante fallos. Para acceso por Internet también hacen falta dominio, HTTPS mediante proxy, restricciones de red y comprobaciones desde los dispositivos de destino. No se abrió el firewall ni se expuso MySQL.

FRONTEND_URL debe coincidir con la dirección pública HTTPS cuando se configure el proxy. HOST puede configurarse expresamente según el entorno; mantenga la API en loopback si el proxy está en el mismo equipo. VITE_API_URL se compila como /api/v1 en la modalidad integrada.

Los respaldos locales y su restauración ya tienen verificación. Falta elegir una ubicación externa del hospital para conservar otra copia; no se inventa una ruta ni una cuenta de almacenamiento.

## Commits

La escritura de .git sigue restringida en el entorno de Codex. `GUARDAR-CAMBIOS.cmd` permite al propietario ejecutar desde su sesión tres commits separados: calendario, administración e instalación/pruebas. Incluye una lista explícita de rutas, se detiene si ya hay cambios preparados y no modifica permisos ni hace push. Los archivos privados .env y los respaldos están excluidos.

Si también falla en la sesión del propietario, conserve el mensaje y revise la configuración del entorno con su administrador. No borre .git ni desactive las restricciones para continuar.
