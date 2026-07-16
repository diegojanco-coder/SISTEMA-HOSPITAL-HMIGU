const bcrypt = require('bcryptjs');
const { bcryptSaltRounds } = require('../config/env');

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, bcryptSaltRounds);
}

async function compararPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

module.exports = { hashPassword, compararPassword };
