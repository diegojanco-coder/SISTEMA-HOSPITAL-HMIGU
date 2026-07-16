-- =====================================================================
-- Datos semilla: usuario administrador, catálogo de vacunas y esquema
-- de dosis según el Calendario Nacional de Inmunización de Bolivia (PAI).
-- Las edades están expresadas en días desde el nacimiento
-- (aproximación: 1 mes = 30 días, 1 año = 365 días).
-- =====================================================================

USE vacunacion_hmgu;

-- ---------------------------------------------------------------------
-- Usuario administrador inicial
-- Usuario: admin   Password: Admin123!  (cambiar tras el primer login)
-- ---------------------------------------------------------------------
INSERT INTO usuarios (nombre_completo, email, username, password_hash, rol, estado)
VALUES (
    'Administrador del Sistema',
    'admin@hmgu.gob.bo',
    'admin',
    '$2b$10$Walt7FlNhhgEMzzWoGQltuJIty.QwMrlRi5qRsTJQzqnPs.ZlCQVm',
    'administrador',
    'activo'
);

INSERT INTO usuarios (nombre_completo, email, username, password_hash, rol, estado)
VALUES (
    'Enfermera de Prueba',
    'enfermeria@hmgu.gob.bo',
    'enfermeria',
    '$2b$10$Walt7FlNhhgEMzzWoGQltuJIty.QwMrlRi5qRsTJQzqnPs.ZlCQVm',
    'enfermero',
    'activo'
);

-- ---------------------------------------------------------------------
-- Catálogo de vacunas (PAI Bolivia)
-- ---------------------------------------------------------------------
INSERT INTO vacunas (nombre, nombre_corto, descripcion, enfermedad_previene, via_administracion) VALUES
('BCG', 'BCG', 'Vacuna contra la tuberculosis, dosis única al nacer.', 'Tuberculosis (formas graves)', 'intradermica'),
('Hepatitis B', 'HB', 'Vacuna contra la hepatitis B, dosis al nacer.', 'Hepatitis B', 'intramuscular'),
('Pentavalente', 'PENTA', 'Difteria, Tos ferina, Tétanos, Hepatitis B y Haemophilus influenzae tipo b.', 'Difteria, Tos ferina, Tétanos, Hepatitis B, Hib', 'intramuscular'),
('Antipoliomielítica (OPV)', 'OPV', 'Vacuna oral contra la poliomielitis.', 'Poliomielitis', 'oral'),
('Rotavirus', 'ROTA', 'Vacuna oral contra el rotavirus.', 'Diarrea por rotavirus', 'oral'),
('Neumocócica conjugada', 'NEUMO', 'Vacuna contra el neumococo.', 'Neumonía, meningitis, otitis por neumococo', 'intramuscular'),
('SRP (Triple Viral)', 'SRP', 'Sarampión, Rubéola y Paperas.', 'Sarampión, Rubéola, Parotiditis', 'subcutanea'),
('Fiebre Amarilla', 'FA', 'Vacuna contra la fiebre amarilla.', 'Fiebre Amarilla', 'subcutanea'),
('Influenza', 'FLU', 'Vacuna estacional contra la influenza.', 'Influenza estacional', 'intramuscular');

-- ---------------------------------------------------------------------
-- Esquema de dosis por vacuna (edad_recomendada_dias, tolerancia, intervalo)
-- ---------------------------------------------------------------------

-- BCG (id 1): dosis única al nacer
INSERT INTO dosis (vacuna_id, numero_dosis, nombre_dosis, edad_recomendada_dias, tolerancia_dias, intervalo_minimo_dias) VALUES
(1, 1, 'Dosis única (RN)', 0, 60, 0);

-- Hepatitis B (id 2): dosis única al nacer (primeras 24h)
INSERT INTO dosis (vacuna_id, numero_dosis, nombre_dosis, edad_recomendada_dias, tolerancia_dias, intervalo_minimo_dias) VALUES
(2, 1, 'Dosis única (RN)', 1, 60, 0);

-- Pentavalente (id 3): 3 dosis (2,4,6 meses) + refuerzos (18 meses, 4 años)
INSERT INTO dosis (vacuna_id, numero_dosis, nombre_dosis, edad_recomendada_dias, tolerancia_dias, intervalo_minimo_dias) VALUES
(3, 1, '1ra dosis (2 meses)', 60, 30, 0),
(3, 2, '2da dosis (4 meses)', 120, 30, 30),
(3, 3, '3ra dosis (6 meses)', 180, 30, 30),
(3, 4, 'Refuerzo (18 meses)', 540, 60, 60),
(3, 5, 'Refuerzo (4 años)', 1460, 90, 60);

-- OPV (id 4): 3 dosis + refuerzos
INSERT INTO dosis (vacuna_id, numero_dosis, nombre_dosis, edad_recomendada_dias, tolerancia_dias, intervalo_minimo_dias) VALUES
(4, 1, '1ra dosis (2 meses)', 60, 30, 0),
(4, 2, '2da dosis (4 meses)', 120, 30, 30),
(4, 3, '3ra dosis (6 meses)', 180, 30, 30),
(4, 4, 'Refuerzo (18 meses)', 540, 60, 60),
(4, 5, 'Refuerzo (4 años)', 1460, 90, 60);

-- Rotavirus (id 5): 2 dosis
INSERT INTO dosis (vacuna_id, numero_dosis, nombre_dosis, edad_recomendada_dias, tolerancia_dias, intervalo_minimo_dias) VALUES
(5, 1, '1ra dosis (2 meses)', 60, 15, 0),
(5, 2, '2da dosis (4 meses)', 120, 15, 30);

-- Neumocócica (id 6): 2 dosis + refuerzo
INSERT INTO dosis (vacuna_id, numero_dosis, nombre_dosis, edad_recomendada_dias, tolerancia_dias, intervalo_minimo_dias) VALUES
(6, 1, '1ra dosis (2 meses)', 60, 30, 0),
(6, 2, '2da dosis (4 meses)', 120, 30, 30),
(6, 3, 'Refuerzo (12 meses)', 365, 60, 60);

-- SRP (id 7): 1ra dosis (12 meses) + refuerzo (4 años)
INSERT INTO dosis (vacuna_id, numero_dosis, nombre_dosis, edad_recomendada_dias, tolerancia_dias, intervalo_minimo_dias) VALUES
(7, 1, '1ra dosis (12 meses)', 365, 60, 0),
(7, 2, 'Refuerzo (4 años)', 1460, 90, 90);

-- Fiebre Amarilla (id 8): dosis única a los 12 meses
INSERT INTO dosis (vacuna_id, numero_dosis, nombre_dosis, edad_recomendada_dias, tolerancia_dias, intervalo_minimo_dias) VALUES
(8, 1, 'Dosis única (12 meses)', 365, 60, 0);

-- Influenza (id 9): campaña anual desde los 6 meses
INSERT INTO dosis (vacuna_id, numero_dosis, nombre_dosis, edad_recomendada_dias, tolerancia_dias, intervalo_minimo_dias) VALUES
(9, 1, '1ra dosis (6 meses)', 180, 90, 0),
(9, 2, '2da dosis (7 meses)', 210, 90, 30);

-- ---------------------------------------------------------------------
-- Pacientes y tutores de ejemplo (datos ficticios para pruebas)
-- ---------------------------------------------------------------------
INSERT INTO tutores (nombres, apellidos, carnet_identidad, parentesco, telefono, email) VALUES
('María Elena', 'Rojas Quispe', '7845123 CBBA', 'madre', '70012345', 'maria.rojas@example.com'),
('Juan Carlos', 'Mamani Flores', '6521478 CBBA', 'padre', '70098765', 'juan.mamani@example.com');

INSERT INTO pacientes (codigo_paciente, nombres, apellidos, fecha_nacimiento, sexo, direccion, telefono_contacto, creado_por) VALUES
('PAC-2026-0001', 'Sofía Valentina', 'Rojas Quispe', DATE_SUB(CURDATE(), INTERVAL 3 MONTH), 'F', 'Av. Aniceto Arce #123, Cochabamba', '70012345', 1),
('PAC-2026-0002', 'Mateo', 'Mamani Flores', DATE_SUB(CURDATE(), INTERVAL 14 MONTH), 'M', 'Zona Sarco, Cochabamba', '70098765', 1);

INSERT INTO paciente_tutor (paciente_id, tutor_id, es_principal) VALUES
(1, 1, 1),
(2, 2, 1);
