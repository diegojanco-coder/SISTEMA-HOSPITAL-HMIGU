# Antecedentes externos documentados

Actualizado el 14 de septiembre de 2026.

## Registro desde la pantalla

1. Abra **Historial** y seleccione al paciente.
2. Pulse **Registrar antecedente externo**.
3. Seleccione la vacuna y dosis que figuran en el documento, la fecha de aplicación, el establecimiento de origen y una referencia del carnet o certificado (número, folio o página).
4. Guarde. El antecedente aparecerá en el historial y en la ficha del paciente con su procedencia y el usuario que lo registró.

Administración y enfermería pueden registrar antecedentes. Solo administración puede corregirlos. No se adjunta ni almacena una imagen del documento: se registra su referencia. El personal debe cotejar el documento y seleccionar la identidad correcta de la dosis.

El formulario ofrece dosis activas aún no registradas para ese paciente. Rechaza fechas futuras, anteriores al nacimiento o incompatibles con las reglas configuradas. Conserva los campos ante un error y permite reintentar la carga del catálogo. Una vacuna ausente de esta pantalla requiere revisar el catálogo; no se debe sustituir por otra ni inventar una fecha.

## Historial, seguimiento e inventario

El antecedente se guarda con `origen=externo`, documento obligatorio y sin cita ni lote del hospital. La transcripción y la auditoría son una sola transacción. La fecha permite calcular el seguimiento de dosis posteriores y evita recordar una dosis ya documentada. Un fallo al recalcular alertas se informa como advertencia después del guardado.

No se descuentan existencias ni se atribuye la aplicación al usuario que transcribe. La corrección conserva la procedencia y comprueba las fechas posteriores, incluso cuando se trata de otra formulación. No puede quedar una segunda identidad paciente/dosis por un envío repetido; la aplicación local y el antecedente externo comparten esa restricción.

Los reportes **Vacunas aplicadas** y **Vacunas por fecha** cuentan la producción local del hospital. El historial, el seguimiento y la cobertura dentro del calendario configurado reconocen los antecedentes externos. El carnet PDF los presenta en una sección que identifica establecimiento, documento y responsable del registro.

## Instalaciones existentes

Desde `backend`, ejecute `npm run migrate:upgrade`, y después `npm run verificar`. La migración es repetible: conserva todos los registros anteriores como locales, sus citas y sus lotes. No reconstruye ni vacía la base. La carga base del PAI no agrega registros externos ni modifica existencias.

Las claves foráneas y la unicidad paciente/dosis se conservan. MySQL comprueba la obligatoriedad documental. El servicio mantiene los campos de cita/lote vacíos para externos; la verificación de respaldos detecta combinaciones incompatibles, además de comprobar que las restricciones SQL se conservaron y siguen activas.

## Límites clínicos

Este flujo registra antecedentes documentados de dosis presentes en el catálogo y compatibles con sus reglas actuales. No deduce equivalencias entre vacunas, no valida por sí solo un esquema antiguo y no genera una pauta de recuperación individual. Un conflicto con la fecha o con la identidad de la dosis requiere revisión del personal de salud; no se corrige cambiando el dato del documento.

La búsqueda de fuentes del 14 de septiembre no resolvió el límite de inicio tardío de rotavirus ni cómo descontar todos los antecedentes infantiles para dT. Esos criterios continúan separados del registro documental. La ausencia de un registro no prueba que el paciente nunca haya recibido la vacuna.
