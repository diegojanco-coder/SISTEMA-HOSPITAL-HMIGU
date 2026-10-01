-- ---------------------------------------------------------------------
-- Vistas del módulo de reportes de vacunación
-- ---------------------------------------------------------------------
-- Objetivo: consolidar datos para reportes ejecutivos, inventario y trazabilidad.
-- Debe ejecutarse sobre la base de datos del sistema una vez creada.
-- ---------------------------------------------------------------------

USE vacunacion_hmgu;

DROP VIEW IF EXISTS vw_inventario_lotes;
CREATE VIEW vw_inventario_lotes AS
SELECT
    lv.id AS lote_id,
    lv.vacuna_id,
    v.nombre AS vacuna_nombre,
    lv.numero_lote,
    lv.fecha_vencimiento,
    lv.cantidad_disponible AS stock_disponible,
    lv.estado,
    DATEDIFF(lv.fecha_vencimiento, CURDATE()) AS dias_restantes,
    CASE
        WHEN lv.estado = 'activo' AND lv.cantidad_disponible = 0 THEN 'sin_stock'
        WHEN lv.estado = 'activo' AND lv.cantidad_disponible > 0 THEN 'disponible'
        ELSE 'inactivo'
    END AS disponibilidad,
    CASE
        WHEN lv.estado = 'activo' AND DATEDIFF(lv.fecha_vencimiento, CURDATE()) <= 15 THEN 'rojo'
        WHEN lv.estado = 'activo' AND DATEDIFF(lv.fecha_vencimiento, CURDATE()) <= 30 THEN 'amarillo'
        WHEN lv.estado = 'activo' THEN 'verde'
        ELSE 'inactivo'
    END AS riesgo_vencimiento
FROM lotes_vacuna lv
JOIN vacunas v ON v.id = lv.vacuna_id;

DROP VIEW IF EXISTS vw_lotes_proximos_vencer;
CREATE VIEW vw_lotes_proximos_vencer AS
SELECT
    ivl.lote_id,
    ivl.vacuna_id,
    ivl.vacuna_nombre,
    ivl.numero_lote,
    ivl.fecha_vencimiento,
    ivl.stock_disponible,
    ivl.estado,
    ivl.dias_restantes,
    ivl.riesgo_vencimiento
FROM vw_inventario_lotes ivl
WHERE ivl.estado = 'activo'
  AND ivl.dias_restantes <= 30
ORDER BY ivl.dias_restantes ASC, ivl.fecha_vencimiento ASC;

DROP VIEW IF EXISTS vw_auditoria_vacunacion;
CREATE VIEW vw_auditoria_vacunacion AS
SELECT
    a.id,
    a.usuario_id,
    u.nombre_completo AS usuario_nombre,
    a.accion,
    a.entidad,
    a.entidad_id,
    hv.id AS historial_id,
    hv.paciente_id,
    CONCAT(p.nombres, ' ', p.apellidos) AS paciente_nombre,
    p.codigo_paciente,
    a.ip,
    a.user_agent,
    a.created_at AS fecha_operacion,
    a.datos_previos,
    a.datos_nuevos
FROM auditoria a
LEFT JOIN usuarios u ON u.id = a.usuario_id
LEFT JOIN historial_vacunacion hv ON hv.id = a.entidad_id AND a.entidad = 'historial_vacunacion'
LEFT JOIN pacientes p ON p.id = hv.paciente_id
WHERE a.entidad = 'historial_vacunacion';

DROP VIEW IF EXISTS vw_resumen_vacunaciones;
CREATE VIEW vw_resumen_vacunaciones AS
SELECT
    DATE(h.fecha_aplicacion) AS fecha_aplicacion,
    v.id AS vacuna_id,
    v.nombre AS vacuna_nombre,
    u.id AS usuario_id,
    COALESCE(u.nombre_completo, 'Sin responsable') AS usuario_nombre,
    COUNT(*) AS total_dosis_aplicadas
FROM historial_vacunacion h
JOIN dosis d ON d.id = h.dosis_id
JOIN vacunas v ON v.id = d.vacuna_id
LEFT JOIN usuarios u ON u.id = h.usuario_id
GROUP BY DATE(h.fecha_aplicacion), v.id, v.nombre, u.id, u.nombre_completo;

-- ---------------------------------------------------------------------
-- Índices recomendados para reportes y trazabilidad
-- ---------------------------------------------------------------------
CREATE INDEX idx_lotes_estado_vencimiento
    ON lotes_vacuna (estado, fecha_vencimiento, cantidad_disponible);

CREATE INDEX idx_historial_fecha_usuario
    ON historial_vacunacion (fecha_aplicacion, usuario_id);

CREATE INDEX idx_auditoria_entidad_fecha
    ON auditoria (entidad, created_at);

CREATE INDEX idx_auditoria_usuario_fecha
    ON auditoria (usuario_id, created_at);
