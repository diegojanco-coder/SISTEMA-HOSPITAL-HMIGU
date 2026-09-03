-- =====================================================================
-- Sistema Web Móvil para el Control y Seguimiento del Esquema de
-- Vacunación Inteligente de Pacientes
-- Hospital Materno Germán Urquidi - Cochabamba, Bolivia
-- Script SQL completo (MySQL 8.0+, InnoDB, utf8mb4)
-- =====================================================================

DROP DATABASE IF EXISTS vacunacion_hmgu;
CREATE DATABASE vacunacion_hmgu
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE vacunacion_hmgu;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Tabla: usuarios
-- Personal del hospital que usa el sistema (administrador / enfermero)
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre_completo     VARCHAR(150)        NOT NULL,
    email               VARCHAR(150)        NOT NULL,
    username            VARCHAR(50)         NOT NULL,
    password_hash       VARCHAR(255)        NOT NULL,
    rol                 ENUM('administrador','enfermero') NOT NULL DEFAULT 'enfermero',
    estado              ENUM('activo','inactivo')         NOT NULL DEFAULT 'activo',
    ultimo_login        DATETIME            NULL,
    created_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuarios_email UNIQUE (email),
    CONSTRAINT uq_usuarios_username UNIQUE (username)
) ENGINE=InnoDB;

CREATE INDEX idx_usuarios_estado ON usuarios (estado);
CREATE INDEX idx_usuarios_rol ON usuarios (rol);

-- ---------------------------------------------------------------------
-- Tabla: pacientes
-- ---------------------------------------------------------------------
CREATE TABLE pacientes (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo_paciente     VARCHAR(20)         NOT NULL,
    nombres             VARCHAR(100)        NOT NULL,
    apellidos           VARCHAR(100)        NOT NULL,
    carnet_identidad    VARCHAR(20)         NULL,
    fecha_nacimiento    DATE                NOT NULL,
    sexo                ENUM('M','F')       NOT NULL,
    direccion           VARCHAR(255)        NULL,
    telefono_contacto   VARCHAR(20)         NULL,
    email               VARCHAR(150)        NULL,
    lugar_nacimiento    VARCHAR(150)        NULL,
    estado              ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    creado_por          INT UNSIGNED        NULL,
    created_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_pacientes_codigo UNIQUE (codigo_paciente),
    CONSTRAINT uq_pacientes_ci UNIQUE (carnet_identidad),
    CONSTRAINT fk_pacientes_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_pacientes_nombres ON pacientes (apellidos, nombres);
CREATE INDEX idx_pacientes_fecha_nac ON pacientes (fecha_nacimiento);
CREATE INDEX idx_pacientes_estado ON pacientes (estado);

-- ---------------------------------------------------------------------
-- Tabla: tutores
-- ---------------------------------------------------------------------
CREATE TABLE tutores (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombres             VARCHAR(100)        NOT NULL,
    apellidos           VARCHAR(100)        NOT NULL,
    carnet_identidad    VARCHAR(20)         NOT NULL,
    parentesco          ENUM('padre','madre','tutor_legal','otro') NOT NULL DEFAULT 'madre',
    telefono            VARCHAR(20)         NOT NULL,
    email               VARCHAR(150)        NOT NULL,
    direccion           VARCHAR(255)        NULL,
    estado              ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    created_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_tutores_ci UNIQUE (carnet_identidad)
) ENGINE=InnoDB;

CREATE INDEX idx_tutores_apellidos ON tutores (apellidos, nombres);

-- ---------------------------------------------------------------------
-- Tabla: paciente_tutor (relación N:M)
-- ---------------------------------------------------------------------
CREATE TABLE paciente_tutor (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    paciente_id         INT UNSIGNED        NOT NULL,
    tutor_id            INT UNSIGNED        NOT NULL,
    es_principal        TINYINT(1)          NOT NULL DEFAULT 0,
    created_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_paciente_tutor UNIQUE (paciente_id, tutor_id),
    CONSTRAINT fk_pt_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pt_tutor FOREIGN KEY (tutor_id) REFERENCES tutores(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_pt_tutor ON paciente_tutor (tutor_id);

-- ---------------------------------------------------------------------
-- Tabla: vacunas (catálogo maestro)
-- ---------------------------------------------------------------------
CREATE TABLE vacunas (
    id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre                VARCHAR(100)  NOT NULL,
    nombre_corto          VARCHAR(20)   NOT NULL,
    descripcion           TEXT          NULL,
    enfermedad_previene   VARCHAR(150)  NULL,
    via_administracion    ENUM('oral','intramuscular','subcutanea','intradermica') NOT NULL DEFAULT 'intramuscular',
    estado                ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_vacunas_nombre UNIQUE (nombre)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabla: dosis (esquema PAI Bolivia por vacuna)
-- ---------------------------------------------------------------------
CREATE TABLE dosis (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vacuna_id               INT UNSIGNED  NOT NULL,
    numero_dosis            TINYINT UNSIGNED NOT NULL,
    nombre_dosis            VARCHAR(60)   NOT NULL,
    edad_recomendada_dias   INT UNSIGNED  NOT NULL COMMENT 'Edad recomendada en días desde el nacimiento',
    tolerancia_dias         INT UNSIGNED  NOT NULL DEFAULT 30 COMMENT 'Días de gracia antes de marcar como atrasada',
    intervalo_minimo_dias   INT UNSIGNED  NOT NULL DEFAULT 0 COMMENT 'Intervalo mínimo respecto a la dosis anterior',
    estado                  ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    CONSTRAINT uq_dosis_vacuna_numero UNIQUE (vacuna_id, numero_dosis),
    CONSTRAINT fk_dosis_vacuna FOREIGN KEY (vacuna_id) REFERENCES vacunas(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_dosis_edad ON dosis (edad_recomendada_dias);

-- Inventario físico: cada lote pertenece a un biológico y controla vencimiento/stock.
CREATE TABLE lotes_vacuna (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vacuna_id INT UNSIGNED NOT NULL,
    numero_lote VARCHAR(50) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    cantidad_disponible INT UNSIGNED NOT NULL,
    estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_lote_vacuna UNIQUE (vacuna_id, numero_lote),
    CONSTRAINT fk_lote_vacuna FOREIGN KEY (vacuna_id) REFERENCES vacunas(id)
) ENGINE=InnoDB;

-- Una cita representa una atención y agrupa varias dosis aplicadas.
CREATE TABLE citas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT UNSIGNED NOT NULL,
    usuario_id INT UNSIGNED NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cita_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
    CONSTRAINT fk_cita_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabla: historial_vacunacion (aplicaciones reales)
-- ---------------------------------------------------------------------
CREATE TABLE historial_vacunacion (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    paciente_id         INT UNSIGNED  NOT NULL,
    dosis_id            INT UNSIGNED  NOT NULL,
    usuario_id          INT UNSIGNED  NULL,
    cita_id             INT UNSIGNED  NOT NULL,
    lote_vacuna_id      INT UNSIGNED  NOT NULL,
    fecha_aplicacion    DATE          NOT NULL,
    establecimiento     VARCHAR(150)  NOT NULL DEFAULT 'Hospital Materno Germán Urquidi',
    observaciones       TEXT          NULL,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_historial_paciente_dosis UNIQUE (paciente_id, dosis_id),
    CONSTRAINT fk_historial_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_historial_dosis FOREIGN KEY (dosis_id) REFERENCES dosis(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_historial_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE SET NULL ON UPDATE CASCADE
    ,CONSTRAINT fk_historial_cita FOREIGN KEY (cita_id) REFERENCES citas(id)
    ,CONSTRAINT fk_historial_lote FOREIGN KEY (lote_vacuna_id) REFERENCES lotes_vacuna(id)
) ENGINE=InnoDB;

CREATE INDEX idx_historial_fecha ON historial_vacunacion (fecha_aplicacion);
CREATE INDEX idx_historial_paciente ON historial_vacunacion (paciente_id);

-- ---------------------------------------------------------------------
-- Tabla: alertas (semáforo verde/amarillo/rojo)
-- ---------------------------------------------------------------------
CREATE TABLE alertas (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    paciente_id         INT UNSIGNED  NOT NULL,
    dosis_id            INT UNSIGNED  NOT NULL,
    estado_semaforo     ENUM('verde','amarillo','rojo') NOT NULL,
    fecha_limite        DATE          NOT NULL,
    mensaje             VARCHAR(255)  NOT NULL,
    leida               TINYINT(1)    NOT NULL DEFAULT 0,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_alertas_paciente_dosis UNIQUE (paciente_id, dosis_id),
    CONSTRAINT fk_alertas_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_alertas_dosis FOREIGN KEY (dosis_id) REFERENCES dosis(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_alertas_estado ON alertas (estado_semaforo);
CREATE INDEX idx_alertas_leida ON alertas (leida);

-- ---------------------------------------------------------------------
-- Tabla: auditoria (bitácora del sistema)
-- ---------------------------------------------------------------------
CREATE TABLE auditoria (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id          INT UNSIGNED  NULL,
    accion              ENUM('CREAR','EDITAR','ELIMINAR','LOGIN','LOGOUT','EXPORTAR','BACKUP') NOT NULL,
    entidad             VARCHAR(50)   NOT NULL,
    entidad_id          INT UNSIGNED  NULL,
    datos_previos       JSON          NULL,
    datos_nuevos        JSON          NULL,
    ip                  VARCHAR(45)   NULL,
    user_agent          VARCHAR(255)  NULL,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_auditoria_entidad ON auditoria (entidad, entidad_id);
CREATE INDEX idx_auditoria_fecha ON auditoria (created_at);
CREATE INDEX idx_auditoria_usuario ON auditoria (usuario_id);

SET FOREIGN_KEY_CHECKS = 1;
