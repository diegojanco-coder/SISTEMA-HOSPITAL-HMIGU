const { Router } = require('express');

const authRoutes = require('./auth.routes');
const usuarioRoutes = require('./usuario.routes');
const pacienteRoutes = require('./paciente.routes');
const tutorRoutes = require('./tutor.routes');
const vacunaRoutes = require('./vacuna.routes');
const historialRoutes = require('./historial.routes');
const alertaRoutes = require('./alerta.routes');
const carnetRoutes = require('./carnet.routes'); // define rutas anidadas /pacientes/:id/carnet
const reporteRoutes = require('./reporte.routes');
const auditoriaRoutes = require('./auditoria.routes');
const backupRoutes = require('./backup.routes');
const citaRoutes = require('./cita.routes');
const router = Router();

router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/pacientes', pacienteRoutes);
router.use('/', carnetRoutes); // GET /pacientes/:id/carnet
router.use('/tutores', tutorRoutes);
router.use('/vacunas', vacunaRoutes);
router.use('/historial', historialRoutes);
router.use('/alertas', alertaRoutes);
router.use('/reportes', reporteRoutes);
router.use('/auditoria', auditoriaRoutes);
router.use('/backup', backupRoutes);
router.use('/citas', citaRoutes);
module.exports = router;
