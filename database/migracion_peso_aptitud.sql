-- =====================================================================
-- Migración: agrega peso/talla al historial de vacunación, y
-- aptitud/discapacidad al perfil del paciente.
-- =====================================================================

USE vacunacion_hmgu;

ALTER TABLE pacientes
  ADD COLUMN discapacidad VARCHAR(150) NULL AFTER sexo,
  ADD COLUMN observaciones_generales TEXT NULL AFTER discapacidad;

ALTER TABLE historial_vacunacion
  ADD COLUMN peso_kg DECIMAL(5,2) NULL AFTER lote,
  ADD COLUMN talla_cm DECIMAL(5,2) NULL AFTER peso_kg;