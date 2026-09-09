/**
 * Carga y expone las variables de entorno tipadas/normalizadas.
 * Centralizar el acceso a process.env evita errores de tipeo
 * dispersos por todo el proyecto.
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({path:path.resolve(__dirname,'../../.env')});
const dumpWindows=path.join(process.env.ProgramFiles || 'C:/Program Files','MySQL','MySQL Server 8.0','bin','mysqldump.exe');

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET es obligatorio en producción');
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,

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

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,

  backup: {
    cron: process.env.BACKUP_CRON || '0 2 * * *',
    dir: process.env.BACKUP_DIR || path.resolve(__dirname,'../../backups'),
    mysqldumpPath: process.env.MYSQLDUMP_PATH || (process.platform==='win32' && fs.existsSync(dumpWindows) ? dumpWindows : 'mysqldump')
  },

  alertasCron: process.env.ALERTAS_CRON || '0 6 * * *'
  ,smtp: {
    enabled: process.env.SMTP_ENABLED === 'true',
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM
  }
};
