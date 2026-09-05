const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, FixedDate } = require('./helpers/load.cjs');

const input = {
  pacienteId: 9, usuarioId: 7, fechaHora: '2026-06-15 10:00:00', observaciones: 'Control',
  dosisAplicadas: [{ dosisId: 2, loteVacunaId: 3, fechaAplicacion: '2026-06-14' }],
};
const activeLot = {
  id: 3, vacuna_id: 1, dosis_vacuna_id: 1, dosis_estado: 'activo',
  vacuna_estado: 'activo', estado: 'activo', fecha_vencimiento: '2027-01-01',
  cantidad_disponible: 5,
};

function fixture(options = {}) {
  const events = [];
  const queries = [];
  let applied = 0;
  let checked = 0;
  const connection = {
    async beginTransaction() { events.push('begin'); },
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.startsWith('SELECT id FROM pacientes')) {
        events.push('patient');
        assert.match(sql, /FOR UPDATE/);
        assert.deepEqual(params, [9]);
        return [options.missingPatient ? [] : [{ id: 9 }]];
      }
      if (sql.startsWith('INSERT INTO citas')) {
        events.push('appointment');
        return [{ insertId: 20 }];
      }
      if (sql.includes('FROM lotes_vacuna l')) {
        events.push('lot');
        assert.match(sql, /FOR UPDATE/);
        return [options.missingLot ? [] : [{ ...activeLot, ...options.lot }]];
      }
      if (sql.startsWith('SELECT id FROM historial_vacunacion')) {
        events.push('duplicate');
        checked++;
        return [options.duplicate || options.duplicateSecond && checked === 2 ? [{ id: 30 }] : []];
      }
      if (sql.startsWith('INSERT INTO historial_vacunacion')) {
        events.push('history');
        if (options.insertError) throw options.insertError;
        applied++;
        return [{ insertId: 30 + applied }];
      }
      if (sql.startsWith('UPDATE lotes_vacuna')) {
        events.push('stock');
        assert.match(sql, /cantidad_disponible > 0/);
        return [{ affectedRows: options.noStockUpdate ? 0 : 1 }];
      }
      throw new Error('Unexpected SQL: ' + sql);
    },
    async commit() { events.push('commit'); },
    async rollback() { events.push('rollback'); },
    release() { events.push('release'); },
  };
  const service = load('services/cita.service.js', {
    '../config/db': { pool: { async getConnection() { events.push('connect'); return connection; } } },
    './alerta.service': { async generarAlertasPaciente(id) { assert.equal(id, 9); events.push('alerts'); } },
  }, { Date: FixedDate });
  return { ...service, events, queries };
}

test('registers a dose, reserves stock and generates alerts after commit', async () => {
  const f = fixture();
  assert.deepEqual(await f.registrarCita(input), {
    id: 20, pacienteId: 9, dosisAplicadas: [{ id: 31, dosisId: 2, loteVacunaId: 3 }],
  });
  assert.deepEqual(f.events, ['connect', 'begin', 'patient', 'appointment', 'lot', 'duplicate', 'history', 'stock', 'commit', 'alerts', 'release']);
  assert.deepEqual(f.queries.find((q) => q.sql.startsWith('INSERT INTO citas')).params, [9, 7, input.fechaHora, 'Control']);
  assert.deepEqual(f.queries.find((q) => q.sql.includes('FROM lotes_vacuna l')).params, [2, 3]);
  assert.deepEqual(f.queries.find((q) => q.sql.startsWith('SELECT id FROM historial')).params, [9, 2]);
  assert.deepEqual(f.queries.find((q) => q.sql.startsWith('INSERT INTO historial')).params,
    [9, 2, 7, 20, 3, '2026-06-14', 'Hospital Materno Germán Urquidi', null]);
  assert.deepEqual(f.queries.find((q) => q.sql.startsWith('UPDATE lotes')).params, [3]);
});

test('all doses share one transaction and preserve per-dose data', async () => {
  const f = fixture();
  const result = await f.registrarCita({ ...input, dosisAplicadas: [
    ...input.dosisAplicadas,
    { dosisId: 4, loteVacunaId: 5, fechaAplicacion: '2026-06-13', establecimiento: 'Centro', observaciones: 'Nota' },
  ] });
  assert.deepEqual(result.dosisAplicadas, [
    { id: 31, dosisId: 2, loteVacunaId: 3 }, { id: 32, dosisId: 4, loteVacunaId: 5 },
  ]);
  assert.equal(f.events.filter((x) => x === 'commit').length, 1);
  assert.equal(f.events.filter((x) => x === 'stock').length, 2);
  assert.deepEqual(f.queries.filter((q) => q.sql.startsWith('INSERT INTO historial'))[1].params,
    [9, 4, 7, 20, 5, '2026-06-13', 'Centro', 'Nota']);
});

for (const dosisAplicadas of [undefined, null, {}, []]) {
  test('rejects empty or non-array doses: ' + JSON.stringify(dosisAplicadas), async () => {
    const f = fixture();
    await assert.rejects(f.registrarCita({ ...input, dosisAplicadas }),
      (error) => error instanceof f.CitaError && error.status === 422);
    assert.deepEqual(f.events, []);
  });
}

for (const fechaAplicacion of ['invalid', '2026-02-30', '2026-06-16']) {
  test('rejects invalid or future application date: ' + fechaAplicacion, async () => {
    const f = fixture();
    await assert.rejects(f.registrarCita({ ...input, dosisAplicadas: [{ ...input.dosisAplicadas[0], fechaAplicacion }] }),
      (error) => error instanceof f.CitaError && error.status === 422);
    assert.deepEqual(f.events, []);
  });
}

for (const [name, options, status] of [
  ['missing or inactive patient', { missingPatient: true }, 404],
  ['missing lot/dose', { missingLot: true }, 422],
  ['lot belongs to another vaccine', { lot: { dosis_vacuna_id: 99 } }, 422],
  ['inactive dose', { lot: { dosis_estado: 'inactivo' } }, 422],
  ['inactive vaccine', { lot: { vacuna_estado: 'inactivo' } }, 422],
  ['inactive lot', { lot: { estado: 'inactivo' } }, 409],
  ['expired lot', { lot: { fecha_vencimiento: '2026-06-14' } }, 409],
  ['empty stock', { lot: { cantidad_disponible: 0 } }, 409],
  ['duplicate dose', { duplicate: true }, 409],
  ['stock reservation fails', { noStockUpdate: true }, 409],
]) {
  test('rolls back and releases connection when ' + name, async () => {
    const f = fixture(options);
    await assert.rejects(f.registrarCita(input),
      (error) => error instanceof f.CitaError && error.status === status);
    assert.deepEqual(f.events.slice(-2), ['rollback', 'release']);
    assert.equal(f.events.includes('commit'), false);
    assert.equal(f.events.includes('alerts'), false);
    if (!options.noStockUpdate) {
      assert.equal(f.events.includes('history'), false);
      assert.equal(f.events.includes('stock'), false);
    }
  });
}

test('rolls back earlier doses when a later dose is duplicated', async () => {
  const f = fixture({ duplicateSecond: true });
  await assert.rejects(f.registrarCita({ ...input, dosisAplicadas: [
    ...input.dosisAplicadas, { dosisId: 4, loteVacunaId: 5 },
  ] }), (error) => error.status === 409);
  assert.equal(f.events.filter((x) => x === 'stock').length, 1);
  assert.deepEqual(f.events.slice(-2), ['rollback', 'release']);
  assert.equal(f.events.includes('commit'), false);
  assert.equal(f.events.includes('alerts'), false);
});

test('propagates database failure and rolls back', async () => {
  const failure = new Error('insert failed');
  const f = fixture({ insertError: failure });
  await assert.rejects(f.registrarCita(input), (error) => error === failure);
  assert.deepEqual(f.events.slice(-2), ['rollback', 'release']);
  assert.equal(f.events.includes('stock'), false);
  assert.equal(f.events.includes('commit'), false);
  assert.equal(f.events.includes('alerts'), false);
});
