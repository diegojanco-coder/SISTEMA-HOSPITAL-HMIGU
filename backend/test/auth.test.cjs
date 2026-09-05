const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, response } = require('./helpers/load.cjs');

function loginFixture({ user = { id: 7, rol: 'enfermero', estado: 'activo', password_hash: 'hash' }, valid = true, failure } = {}) {
  const calls = [];
  const service = load('services/auth.service.js', {
    '../models/usuario.model': {
      async findByLogin(value) { calls.push(['find', value]); return user; },
      async marcarLogin(id) { calls.push(['mark', id]); if (failure) throw failure; },
    },
    '../utils/password.util': {
      async compararPassword(password, hash) { calls.push(['compare', password, hash]); return valid; },
    },
    '../utils/jwt.util': { generarToken(value) { calls.push(['token', value.id]); return 'signed-token'; } },
  });
  return { ...service, calls };
}

test('login returns the token and never exposes the password hash', async () => {
  const f = loginFixture();
  assert.deepEqual(await f.login('ana', 'secret'), {
    token: 'signed-token', usuario: { id: 7, rol: 'enfermero', estado: 'activo' },
  });
  assert.deepEqual(f.calls, [['find', 'ana'], ['compare', 'secret', 'hash'], ['mark', 7], ['token', 7]]);
});

for (const [name, options, status, steps] of [
  ['unknown user', { user: null }, 401, ['find']],
  ['incorrect password', { valid: false }, 401, ['find', 'compare']],
  ['inactive user', { user: { id: 7, estado: 'inactivo' } }, 403, ['find']],
]) {
  test('login rejects ' + name + ' without issuing a token', async () => {
    const f = loginFixture(options);
    await assert.rejects(f.login('ana', 'wrong'), (error) => error instanceof f.AuthError && error.status === status);
    assert.deepEqual(f.calls.map(([step]) => step), steps);
  });
}

test('login propagates persistence errors without issuing a token', async () => {
  const failure = new Error('database unavailable');
  const f = loginFixture({ failure });
  await assert.rejects(f.login('ana', 'secret'), (error) => error === failure);
  assert.equal(f.calls.some(([step]) => step === 'token'), false);
});

for (const authorization of [undefined, '', 'Basic abc', 'Bearer', 'Bearer ']) {
  test('authentication rejects missing or malformed header: ' + String(authorization), () => {
    let verified = false;
    let continued = false;
    const auth = load('middlewares/auth.middleware.js', {
      '../utils/jwt.util': { verificarToken() { verified = true; } },
    });
    const res = response();
    auth({ headers: { authorization } }, res, () => { continued = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(verified, false);
    assert.equal(continued, false);
  });
}

for (const [name, message] of [
  ['TokenExpiredError', 'La sesión ha expirado, vuelva a iniciar sesión'],
  ['JsonWebTokenError', 'Token inválido'],
]) {
  test('authentication handles ' + name, () => {
    const auth = load('middlewares/auth.middleware.js', {
      '../utils/jwt.util': { verificarToken() { throw Object.assign(new Error('invalid'), { name }); } },
    });
    const res = response();
    let continued = false;
    auth({ headers: { authorization: 'Bearer bad' } }, res, () => { continued = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, message);
    assert.equal(continued, false);
  });
}

test('authentication attaches the verified identity', () => {
  const payload = { id: 7, rol: 'enfermero' };
  const auth = load('middlewares/auth.middleware.js', {
    '../utils/jwt.util': { verificarToken(token) { assert.equal(token, 'valid'); return payload; } },
  });
  const req = { headers: { authorization: 'Bearer valid' } };
  let calls = 0;
  auth(req, response(), () => { calls++; });
  assert.equal(req.usuario, payload);
  assert.equal(calls, 1);
});

for (const [usuario, status] of [
  [undefined, 401], [{ rol: 'enfermero' }, 403], [{ rol: 'desconocido' }, 403],
]) {
  test('restricted role rejects ' + JSON.stringify(usuario), () => {
    const permitirRoles = load('middlewares/role.middleware.js');
    const res = response();
    let continued = false;
    permitirRoles('administrador')({ usuario }, res, () => { continued = true; });
    assert.equal(res.statusCode, status);
    assert.equal(res.body.success, false);
    assert.equal(continued, false);
  });
}

for (const rol of ['administrador', 'enfermero']) {
  test('allows an explicitly permitted role: ' + rol, () => {
    const permitirRoles = load('middlewares/role.middleware.js');
    let calls = 0;
    permitirRoles('administrador', 'enfermero')({ usuario: { rol } }, response(), () => { calls++; });
    assert.equal(calls, 1);
  });
}
