const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { frontendUrl, env } = require('./config/env');
const apiRoutes = require('./routes');
const { errorMiddleware, notFoundMiddleware } = require('./middlewares/error.middleware');
const sanitizarEntrada = require('./middlewares/sanitize.middleware');

const app = express();

// Seguridad de cabeceras HTTP
app.use(helmet());

// CORS restringido al dominio del frontend
app.use(cors({
  origin: frontendUrl,
  credentials: true
}));

// Límite de tasa de peticiones (protección básica ante fuerza bruta / abuso)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes, intente nuevamente más tarde.' }
});
app.use('/api', limiter);

app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizarEntrada);

if (env !== 'test') {
  app.use(morgan(env === 'production' ? 'combined' : 'dev'));
}

app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'API del Sistema de Vacunación Inteligente - HMGU operativa', timestamp: new Date().toISOString() });
});

app.use('/api/v1', apiRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
