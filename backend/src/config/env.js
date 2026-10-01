/**
 * Carga y expone las variables de entorno tipadas/normalizadas.
 * Centralizar el acceso a process.env evita errores de tipeo
 * dispersos por todo el proyecto.
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({path:path.resolve(__dirname,'../../.env')});
const mysqlWindows=[
  path.join(process.env.ProgramFiles || 'C:/Program Files','MySQL','MySQL Server 8.0','bin','mysql.exe'),
  path.join(process.env.ProgramFiles || 'C:/Program Files','MySQL','MySQL Workbench 8.0 CE','mysql.exe')
].find(fs.existsSync);
const dumpWindows=[
  path.join(process.env.ProgramFiles || 'C:/Program Files','MySQL','MySQL Server 8.0','bin','mysqldump.exe'),
  path.join(process.env.ProgramFiles || 'C:/Program Files','MySQL','MySQL Workbench 8.0 CE','mysqldump.exe')
].find(fs.existsSync);

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || !process.env.SECRET_KEY)) {
  throw new Error('JWT_SECRET y SECRET_KEY son obligatorios en producción');
}

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const frontendOrigins = (process.env.FRONTEND_ORIGINS || frontendUrl)
  .split(',').map((value) => value.trim()).filter(Boolean);

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  host: process.env.HOST || '127.0.0.1',
  serveFrontend: process.env.SERVE_FRONTEND === 'true',
  frontendDist: process.env.FRONTEND_DIST || path.resolve(__dirname,'../../../frontend-app/dist'),
  timezone: process.env.TZ || 'America/La_Paz',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vacunacion_hmgu',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'development-only-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  },

  authCookie: {
    name: process.env.AUTH_COOKIE_NAME || 'hmgu_session',
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    maxAgeMs: Number(process.env.AUTH_COOKIE_MAX_AGE_MS) || 8 * 60 * 60 * 1000
  },

  qrSecret: process.env.SECRET_KEY || process.env.JWT_SECRET || 'development-only-qr-secret',

  frontendUrl,
  frontendOrigins,

  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,

  backup: {
    cron: process.env.BACKUP_CRON || '0 2 * * *',
    dir: process.env.BACKUP_DIR || path.resolve(__dirname,'../../backups'),
    mysqlPath: process.env.MYSQL_PATH || (process.platform==='win32' && mysqlWindows ? mysqlWindows : 'mysql'),
    mysqldumpPath: process.env.MYSQLDUMP_PATH || (process.platform==='win32' && dumpWindows ? dumpWindows : 'mysqldump')
  },

  alertasCron: process.env.ALERTAS_CRON || '0 6 * * *',
  whatsapp: {
    provider: (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase(),
    apiKey: process.env.WHATSAPP_API_KEY || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0'
  },
  smtp: {
    enabled: process.env.SMTP_ENABLED === 'true',
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM
  }
};
