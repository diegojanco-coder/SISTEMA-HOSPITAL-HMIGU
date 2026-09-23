const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { frontendUrl, env, serveFrontend, frontendDist } = require('./config/env');
const apiRoutes = require('./routes');
const { errorMiddleware, notFoundMiddleware } = require('./middlewares/error.middleware');
const sanitizarEntrada = require('./middlewares/sanitize.middleware');

const app = express();

// Seguridad de cabeceras HTTP
app.use(helmet({contentSecurityPolicy:{directives:{
  "img-src":["'self'","data:","blob:","https://images.unsplash.com"],
  "style-src":["'self'","'unsafe-inline'","https://fonts.googleapis.com"],
  "font-src":["'self'","https://fonts.gstatic.com","data:"],
  "upgrade-insecure-requests":frontendUrl.startsWith('https://')?[]:null
}}}));

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

app.get('/api/v1/ready',async(_req,res)=>{
  try{await require('./config/db').pool.query({sql:'SELECT 1',timeout:3000});res.json({success:true});}
  catch{res.status(503).json({success:false,message:'La base de datos no está disponible.'});}
});

app.use('/api/v1', apiRoutes);
if(serveFrontend)require('./middlewares/frontend.middleware').montarFrontend(app,frontendDist);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
