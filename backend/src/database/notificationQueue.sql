CREATE TABLE IF NOT EXISTS notificaciones_email (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 clave CHAR(64) NOT NULL UNIQUE,
 paciente_id INT UNSIGNED NOT NULL,
 dosis_id INT UNSIGNED NOT NULL,
 destinatario VARCHAR(150) NULL,
 paciente_nombre VARCHAR(220) NOT NULL,
 mensaje VARCHAR(255) NOT NULL,
 estado_dosis VARCHAR(20) NOT NULL,
 fecha_limite DATE NOT NULL,
 estado ENUM('pendiente','enviando','enviado','error','cancelado','sin_destinatario') NOT NULL DEFAULT 'pendiente',
 intentos INT UNSIGNED NOT NULL DEFAULT 0,
 proximo_intento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 enviado_at DATETIME NULL,
 ultimo_error VARCHAR(100) NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
 FOREIGN KEY (dosis_id) REFERENCES dosis(id),
 INDEX idx_correo_pendiente(estado,proximo_intento)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS notificacion_intentos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 notificacion_id BIGINT UNSIGNED NOT NULL,
 resultado ENUM('enviado','error') NOT NULL,
 codigo_error VARCHAR(100) NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (notificacion_id) REFERENCES notificaciones_email(id)
) ENGINE=InnoDB;
