# Respaldo y comprobación de recuperación

Desde `backend`:

```powershell
npm run backup
npm run backup:verificar
```

El primer comando genera un SQL. El segundo genera otro SQL y verifica ese archivo en una base temporal independiente. No admite escoger como destino una base existente. Las copias quedan en BACKUP_DIR; nunca se suben a Git. Si no encuentra las herramientas, configure MYSQLDUMP_PATH y MYSQL_PATH con las rutas a `mysqldump` y `mysql`.

## Permisos de mantenimiento

La comprobación necesita crear y eliminar una cuenta temporal y una base temporal, y conceder permisos sobre esa base. Use una cuenta de mantenimiento suministrada mediante DB_USER/DB_PASSWORD en el entorno de ese comando, si el usuario habitual de la API carece de esos permisos. Las claves no van en argumentos del proceso ni en el repositorio. Un fallo de permisos cancela la verificación; no se reinicia la base de trabajo.

El SQL se importa con credenciales aleatorias que solo tienen permisos de tablas en el esquema temporal. No reciben privilegios globales, FILE, rutinas, eventos, triggers ni GRANT OPTION. La cuenta y la base se eliminan al terminar, también ante errores. Si hay un corte de energía o se termina Node de forma abrupta, la limpieza automática podría no ejecutarse: un administrador debe revisar los recursos `hmguverify...` y retirar únicamente los que correspondan a una ejecución terminada. No se deben borrar por prefijo durante una prueba activa.

El cliente ejecuta SQL por entrada estándar en modo no interactivo, con comandos locales y carga de archivos desactivados. Referencias: [opciones del cliente MySQL](https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html) y [privilegios por base](https://dev.mysql.com/doc/refman/8.0/en/grant.html).

## Qué se comprueba

- Archivo SQL finalizado por mysqldump, dentro del directorio permitido; se rechazan archivos parciales y enlaces simbólicos.
- Restauración sin errores con un plazo máximo de dos minutos para la importación.
- Tablas, columnas, tipos, valores predeterminados, collation, índices y claves únicas iguales a la estructura capturada antes del respaldo.
- Claves foráneas, sus reglas y ausencia de registros huérfanos.
- Condiciones CHECK y su estado de aplicación; un respaldo que elimina, cambia o desactiva una restricción se rechaza al comparar la estructura.
- Coherencia de antecedentes externos: documento y establecimiento presentes, sin cita ni lote local. Las aplicaciones locales conservan ambos vínculos y no admiten documento de origen externo.
- Eliminación de base y cuenta temporales antes de devolver éxito.

La salida contiene nombre de archivo, SHA-256, fecha y conteos; no imprime pacientes ni sentencias. Esta comprobación soporta el esquema de tablas de la aplicación. No admite vistas, procedimientos, funciones, eventos ni triggers. No compara cantidades con una base activa que pudo cambiar ni certifica que cada dato clínico sea correcto. Evite aplicar migraciones mientras se realiza la prueba.

El respaldo nuevo usa `--set-gtid-purged=OFF` para evitar órdenes GTID globales en el archivo: [documentación de mysqldump](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html).

## Resultado del 11 de septiembre de 2026

Se verificó `backup_vacunacion_hmgu_2026-09-11T18-16-03-205Z.sql`: 13 tablas y 18 relaciones, con eliminación de recursos temporales confirmada. La base habitual y el envío de correos no se modificaron. Las pruebas automatizadas adicionales usan exclusivamente datos ficticios.

Este comando es una comprobación de recuperación; una restauración operativa que reemplace una instalación deberá planificarse con su destino, interrupción de escrituras y copia previa. No ejecute `migrate:reset` ni el seed como procedimiento de recuperación.

## Repetición del 14 de septiembre de 2026 (hora de Bolivia)

Tras incorporar los antecedentes externos se verificó `backup_vacunacion_hmgu_2026-09-15T01-41-42-541Z.sql` (el nombre usa UTC). Resultado: 13 tablas, 18 relaciones, estructura y restricciones conservadas; base y cuenta temporales eliminadas. SHA-256: `3880533103ba9ec6f8c68c5194d440b88a5102c24a8e3a72673ad59581d633e5`. El archivo privado permanece excluido de Git.

Las nueve pruebas de respaldo incluyen pérdida, desactivación y cambio de CHECK, contradicciones de procedencia, documento vacío y migración parcial. Mantienen compatibilidad de lectura con respaldos anteriores que aún no contenían los campos de antecedentes externos.
# Comprobación del 21 de septiembre de 2026

Tras actualizar el registro de pacientes se creó y restauró en aislamiento `backup_vacunacion_hmgu_2026-09-21T22-50-43-529Z.sql`. Resultado: 13 tablas, 18 relaciones y 72 filas en total; base y cuenta temporales eliminadas. SHA-256: `7310a89bd9ee4062305ea75a0d62a6d0cfd447f381b92273573221a49720539d`. El SQL permanece excluido de Git.
