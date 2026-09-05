const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, FixedDate } = require('./helpers/load.cjs');

function fixture() {
  const writes = [];
  // Use real age calculations with a fixed reference date.
  const edad = load('utils/edad.util.js', {}, { Date: FixedDate });
  const service = load('services/paciente.service.js', {
    '../models/paciente.model': {
      async create(data) { writes.push(['create', data]); return { id: 9, ...data }; },
      async update(id, data) { writes.push(['update', id, data]); return { id, ...data }; },
    },
    '../models/dosis.model': {},
    '../models/historial.model': {},
    './motorVacunacion.service': {},
    '../utils/edad.util': edad,
  }, { Date: FixedDate });
  return { ...service, writes };
}

for (const operation of ['crear', 'actualizar']) {
  for (const [name, data] of [
    ['future birth date', { fechaNacimiento: '2026-06-16', tutorId: 1 }],
    ['invalid birth date', { fechaNacimiento: 'invalid', tutorId: 1 }],
    ['missing birth date', { tutorId: 1 }],
    ['minor without tutor, one day before 18th birthday', { fechaNacimiento: '2008-06-16' }],
    ['newborn without tutor', { fechaNacimiento: '2026-06-15' }],
  ]) {
    test(operation + ' rejects ' + name + ' before persistence', async () => {
      const f = fixture();
      await assert.rejects(
        operation === 'crear' ? f.crear(data) : f.actualizar(9, data),
        (error) => error instanceof f.PacienteError && error.status === 422
      );
      assert.deepEqual(f.writes, []);
    });
  }
  for (const [name, data] of [
    ['minor with tutor', { fechaNacimiento: '2020-01-01', tutorId: 3 }],
    ['exactly 18 without tutor', { fechaNacimiento: '2008-06-15' }],
    ['adult without tutor', { fechaNacimiento: '1990-01-01' }],
  ]) {
    test(operation + ' accepts ' + name, async () => {
      const f = fixture();
      const result = await (operation === 'crear' ? f.crear(data) : f.actualizar(9, data));
      assert.deepEqual(result, { id: 9, ...data });
      assert.deepEqual(f.writes, operation === 'crear' ? [['create', data]] : [['update', 9, data]]);
    });
  }
}
