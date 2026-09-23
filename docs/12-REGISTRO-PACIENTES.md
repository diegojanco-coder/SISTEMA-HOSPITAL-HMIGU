# Registro de pacientes por tipo

El botón **Nuevo Paciente** ofrece **Menor o recién nacido** y **Adulto**. Después se completan tres pasos: Datos, Contacto y Revisión.

## Identidad

- La fecha de nacimiento determina la edad; el tipo debe coincidir con el límite de 18 años configurado en este flujo.
- El CI es opcional, tanto para el paciente como para un tutor nuevo. Un CI informado se valida y no puede duplicarse dentro de su entidad.
- Para un recién nacido sin nombre confirmado se puede marcar identidad provisional. El sistema muestra «Recién nacido», una referencia familiar opcional y el código interno único. No representa un nombre legal confirmado.
- La identidad se confirma posteriormente en **Editar Información**, desmarcando la opción y completando los nombres. Conserva el mismo paciente, código e historial.

## Contacto y tutor

- Un menor requiere tutor activo. No se solicita ni se guarda correo o teléfono propios del menor.
- Un adulto independiente utiliza su correo y teléfono.
- Un adulto dependiente requiere tutor; puede elegir contacto propio o del responsable.
- La búsqueda de tutores admite nombre, apellidos, nombre completo o CI, con paginación. Seleccionar uno reutiliza la identidad; no crea copias por cada hijo.
- Al seleccionar un responsable durante la edición se convierte en el principal. Se conservan los demás vínculos.
- Los teléfonos y correos compartidos no se usan para rechazar pacientes duplicados.
- Registrar un tutor nuevo y su paciente es una sola transacción: un fallo revierte ambos.

## Prerregistro

El teléfono es obligatorio. Si el contacto no dispone de correo, el personal debe marcarlo expresamente. La revisión muestra que se guardará un prerregistro pendiente, y la ficha/lista lo identifican.

Un nombre provisional también deja el registro pendiente. El prerregistro permite conservar la identidad y continuar hacia la ficha o vacunación; no es una autorización clínica ni una garantía de elegibilidad para una dosis.

Para completar un correo del tutor, editarlo en **Tutores** y después revisar/guardar el paciente desde **Editar Información**. Los datos del tutor se comparten con sus pacientes vinculados. Cambiar un contacto o responsable a uno incompleto deja pendiente al paciente; completar solo el tutor no finaliza automáticamente el prerregistro.

## Alertas

Las alertas internas siguen calculándose. Los prerregistros y las identidades provisionales no habilitan correo. La cola vuelve a comprobar el destinatario actual y cancela envíos que correspondan a un contacto anterior o a un tutor que ya no sea el principal.

Guardar un paciente no activa Gmail. El envío continúa deshabilitado mediante la configuración privada existente.

## Instalación y verificación

La actualización aditiva `addPatientRegistration.js` agrega preferencias de contacto y marcas de identidad/prerregistro; permite CI y correo nulos en tutores. Conserva identidades, vínculos e historial. Al repetirse no reemplaza las decisiones posteriores del personal.

Ejecutar `npm --prefix backend run migrate:upgrade` antes de iniciar una instalación anterior y después `npm run build`. No ejecutar una reinicialización de base para aplicar este cambio.

Validaciones: creación/actualización transaccional, reutilización de tutor, documentos duplicados, fecha y tipo incompatibles, finalización de prerregistro, fecha civil y cumpleaños bisiestos, cancelación de correos pendientes y actualización repetible. El recorrido de navegador se ejecuta con MySQL temporal y datos ficticios; no envía correos reales.
