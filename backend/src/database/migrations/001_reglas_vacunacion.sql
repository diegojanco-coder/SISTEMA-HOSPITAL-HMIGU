-- Migración para instalaciones existentes. Ejecutar una sola vez con MySQL 8.
ALTER TABLE pacientes ADD COLUMN email VARCHAR(150) NULL AFTER telefono_contacto;
ALTER TABLE tutores MODIFY telefono VARCHAR(20) NOT NULL, MODIFY email VARCHAR(150) NOT NULL;

CREATE TABLE IF NOT EXISTS lotes_vacuna (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vacuna_id INT UNSIGNED NOT NULL,
  numero_lote VARCHAR(50) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  cantidad_disponible INT UNSIGNED NOT NULL,
  estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lote_vacuna (vacuna_id, numero_lote),
  CONSTRAINT fk_lote_vacuna FOREIGN KEY (vacuna_id) REFERENCES vacunas(id)
);

CREATE TABLE IF NOT EXISTS citas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paciente_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observaciones TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cita_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  CONSTRAINT fk_cita_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

ALTER TABLE historial_vacunacion ADD COLUMN cita_id INT UNSIGNED NULL AFTER usuario_id;
ALTER TABLE historial_vacunacion ADD COLUMN lote_vacuna_id INT UNSIGNED NULL AFTER cita_id;
ALTER TABLE historial_vacunacion ADD CONSTRAINT fk_historial_cita FOREIGN KEY (cita_id) REFERENCES citas(id);
ALTER TABLE historial_vacunacion ADD CONSTRAINT fk_historial_lote FOREIGN KEY (lote_vacuna_id) REFERENCES lotes_vacuna(id);

-- Tras migrar los registros históricos, convertir ambas columnas a NOT NULL:
-- ALTER TABLE historial_vacunacion MODIFY cita_id INT UNSIGNED NOT NULL, MODIFY lote_vacuna_id INT UNSIGNED NOT NULL;
