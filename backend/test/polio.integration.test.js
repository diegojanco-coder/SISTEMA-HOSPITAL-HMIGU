const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { pool } = require('../src/config/db');
const calendario = require('../src/services/calendario.service');
const historialService = require('../src/services/historial.service');
const { registrarCita } = require('../src/services/cita.service');
const { validarAplicacion } = require('../src/services/validarAplicacion.service');
const { programarDosis } = require('../src/utils/programacion.util');
const { isoCivil } = require('../src/utils/calendario.util');
const alerts = require('../src/services/alerta.service');
const getConnection = pool.getConnection.bind(pool);
after(() => pool.end());
const parse = value => typeof value === 'string' ? JSON.parse(value) : value;

// Datos propios dentro de una transacción exterior que siempre se revierte.
async function isolated(run) {
  const db = await getConnection(), originalAlerts = alerts.generarAlertasPaciente;
  try {
    await db.beginTransaction();
    const tag = randomBytes(5).toString('hex');
    const [[user]] = await db.query("SELECT id FROM usuarios WHERE estado='activo' LIMIT 1");
    assert.ok(user, 'Se necesita un usuario activo para la prueba');
    const [p] = await db.query("INSERT INTO pacientes(codigo_paciente,nombres,apellidos,fecha_nacimiento,sexo) VALUES (?,'Ensayo','Polio','2022-01-31','F')", ['TEST-' + tag]);
    const vacunas = [], lotes = [], dosis = [];
    for (const codigo of ['IPV', 'bOPV']) {
      const [v] = await db.query('INSERT INTO vacunas(nombre,nombre_corto) VALUES (?,?)', ['Ensayo ' + codigo + tag, codigo + tag]);
      vacunas.push(v.insertId);
      const [l] = await db.query('INSERT INTO lotes_vacuna(vacuna_id,numero_lote,fecha_vencimiento,cantidad_disponible) VALUES (?,?,CURDATE()+INTERVAL 1 YEAR,5)', [v.insertId, codigo + tag]);
      lotes.push(l.insertId);
    }
    const meses = [2, 4, 6, 18, 48], intervalos = [0, 2, 2, 12, 30];
    for (let i = 0; i < 5; i++) {
      const vacunaId = vacunas[i === 0 || i === 2 ? 0 : 1];
      const programacion = i === 0 ? { base: 'nacimiento' } : { base: 'dosis_previa', dosisId: dosis[i - 1].id, valor: intervalos[i], unidad: 'meses', permitirOtraVacuna: true };
      const regla = { tipo: 'regular', fuente: 'https://example.invalid/polio', habilitada: true, version: 0, minMeses: 0, maxMesesExclusivo: 60, programacion };
      const [d] = await db.query("INSERT INTO dosis(vacuna_id,numero_dosis,nombre_dosis,edad_recomendada_dias,edad_recomendada_valor,edad_recomendada_unidad,regla_calendario) VALUES (?,?,?,?,?,'meses',?)", [vacunaId, i + 1, 'Dosis ' + (i + 1), meses[i] * 30, meses[i], JSON.stringify(regla)]);
      const [[row]] = await db.query('SELECT * FROM dosis WHERE id=?', [d.insertId]);
      dosis.push(row);
    }
    const [[paciente]] = await db.query('SELECT * FROM pacientes WHERE id=?', [p.insertId]);
    pool.getConnection = async () => ({ query: db.query.bind(db), beginTransaction: () => db.query('SAVEPOINT polio'), commit: async () => {}, rollback: () => db.query('ROLLBACK TO SAVEPOINT polio'), release: () => {} });
    alerts.generarAlertasPaciente = async () => {};
    const item = (index, fechaAplicacion) => ({ dosisId: dosis[index].id, loteVacunaId: lotes[index === 0 || index === 2 ? 0 : 1], fechaAplicacion });
    const visita = dosisAplicadas => ({ pacienteId: paciente.id, usuarioId: user.id, dosisAplicadas });
    await run({ db, paciente, dosis, lotes, vacunas, item, visita, user });
  } finally {
    pool.getConnection = getConnection;
    alerts.generarAlertasPaciente = originalAlerts;
    await db.rollback();
    db.release();
  }
}
const payload = dosis => ({ version: 0, edadValor: dosis.edad_recomendada_valor, edadUnidad: 'meses', toleranciaDias: 30, regla: parse(dosis.regla_calendario) });

test('referencias entre formulaciones requieren selección explícita; persisten con auditoría y rechazan ciclos', () => isolated(async ({ db, dosis }) => {
  const p = payload(dosis[1]);
  delete p.regla.programacion.permitirOtraVacuna;
  await assert.rejects(calendario.guardar(dosis[1].id, p), e => e.status === 422);
  p.regla.programacion.permitirOtraVacuna = false;
  await assert.rejects(calendario.guardar(dosis[1].id, p), e => e.status === 422);
  p.regla.programacion.permitirOtraVacuna = 'true';
  await assert.rejects(calendario.guardar(dosis[1].id, p), e => e.status === 422);
  p.regla.programacion.permitirOtraVacuna = true;
  const guardada = await calendario.guardar(dosis[1].id, p);
  assert.deepEqual(parse(guardada.regla_calendario).programacion, p.regla.programacion);
  const [[audit]] = await db.query("SELECT datos_nuevos FROM auditoria WHERE entidad='calendario' AND entidad_id=?", [dosis[1].id]);
  assert.equal(parse(parse(audit.datos_nuevos).regla_calendario).programacion.permitirOtraVacuna, true);
  // La última arista es de bOPV a bOPV, aunque sus antecesores cruzan formulaciones.
  const ultima = payload(dosis[4]); delete ultima.regla.programacion.permitirOtraVacuna;
  await calendario.guardar(dosis[4].id, ultima);
  const ciclo = payload(dosis[0]);
  ciclo.regla.programacion = { base: 'dosis_previa', dosisId: dosis[4].id, valor: 1, unidad: 'meses', permitirOtraVacuna: true };
  await assert.rejects(calendario.guardar(dosis[0].id, ciclo), /ciclo/);
}));

test('cada enlace de una cadena comprueba su autorización y el estado de la dosis', () => isolated(async ({ db, dosis }) => {
  const corrupta = parse(dosis[1].regla_calendario); delete corrupta.programacion.permitirOtraVacuna;
  await db.query('UPDATE dosis SET regla_calendario=? WHERE id=?', [JSON.stringify(corrupta), dosis[1].id]);
  await assert.rejects(calendario.guardar(dosis[2].id, payload(dosis[2])), /misma vacuna/);
  await db.query('UPDATE dosis SET regla_calendario=? WHERE id=?', [JSON.stringify(parse(dosis[1].regla_calendario)), dosis[1].id]);
  await db.query("UPDATE dosis SET estado='inactivo' WHERE id=?", [dosis[0].id]);
  await assert.rejects(calendario.guardar(dosis[2].id, payload(dosis[2])), /activa/);
}));

test('polio programa meses civiles desde antecedentes, detecta ausencia o duplicidad y respeta el día exacto', () => isolated(async ({ db, paciente, dosis }) => {
  assert.equal(isoCivil(programarDosis(paciente, dosis[0], []).fecha), '2022-03-31');
  const fechas = ['2022-09-30', '2022-11-30', '2023-01-30', '2024-01-30', '2026-07-30'];
  const anteriores = [];
  for (let i = 0; i < dosis.length; i++) {
    if (i) {
      assert.equal(programarDosis(paciente, dosis[i], []).revision, true);
      const duplicado = [anteriores[i - 1], anteriores[i - 1]];
      assert.equal(programarDosis(paciente, dosis[i], duplicado).revision, true);
      assert.equal(isoCivil(programarDosis(paciente, dosis[i], anteriores).fecha), fechas[i]);
      await assert.rejects(validarAplicacion(db, paciente, dosis[i], fechas[i].slice(0, 8) + '29', anteriores), /intervalo/);
    }
    await validarAplicacion(db, paciente, dosis[i], fechas[i], anteriores);
    anteriores.push({ dosis_id: dosis[i].id, fecha_aplicacion: fechas[i] });
  }
  // Un intervalo mínimo legado también consulta el ID explícito de la otra formulación.
  await validarAplicacion(db, paciente, { ...dosis[1], intervalo_minimo_dias: 60 }, fechas[1], anteriores.slice(0, 1));
}));

test('visita antipolio mantiene lotes separados y revierte todo si la segunda aplicación falla', () => isolated(async ({ db, paciente, lotes, item, visita }) => {
  await assert.rejects(registrarCita(visita([{ ...item(0, '2022-03-31'), loteVacunaId: lotes[1] }])), /no corresponde/);
  await assert.rejects(registrarCita(visita([item(0, '2022-03-31'), item(1, '2022-05-30')])), /intervalo/);
  const [[hist]] = await db.query('SELECT COUNT(*) n FROM historial_vacunacion WHERE paciente_id=?', [paciente.id]);
  const [[citas]] = await db.query('SELECT COUNT(*) n FROM citas WHERE paciente_id=?', [paciente.id]);
  assert.equal(hist.n, 0); assert.equal(citas.n, 0);
  const [antes] = await db.query('SELECT cantidad_disponible FROM lotes_vacuna WHERE id IN (?,?)', lotes);
  assert.deepEqual(antes.map(l => l.cantidad_disponible), [5, 5]);
  await registrarCita(visita([item(0, '2022-03-31'), item(1, '2022-05-31')]));
  const [despues] = await db.query('SELECT cantidad_disponible FROM lotes_vacuna WHERE id IN (?,?)', lotes);
  assert.deepEqual(despues.map(l => l.cantidad_disponible), [4, 4]);
}));

test('corregir IPV revalida la bOPV dependiente: error revierte fecha y auditoría; éxito conserva stock', () => isolated(async ({ db, lotes, item, visita, user }) => {
  const v = await registrarCita(visita([item(0, '2022-04-01'), item(1, '2022-06-01')]));
  const id = v.dosisAplicadas[0].id;
  await assert.rejects(historialService.editarRegistro(id, { fechaAplicacion: '2022-04-02' }, { usuarioId: user.id }), /intervalo/);
  const [[sinCambios]] = await db.query('SELECT fecha_aplicacion FROM historial_vacunacion WHERE id=?', [id]);
  const [[sinAudit]] = await db.query("SELECT COUNT(*) n FROM auditoria WHERE entidad='historial_vacunacion' AND entidad_id=?", [id]);
  assert.equal(sinCambios.fecha_aplicacion, '2022-04-01'); assert.equal(sinAudit.n, 0);
  await historialService.editarRegistro(id, { fechaAplicacion: '2022-03-31', observaciones: 'Corrección de ensayo' }, { usuarioId: user.id });
  const [[audit]] = await db.query("SELECT datos_previos,datos_nuevos FROM auditoria WHERE entidad='historial_vacunacion' AND entidad_id=?", [id]);
  assert.equal(parse(audit.datos_previos).fecha_aplicacion, '2022-04-01');
  assert.equal(parse(audit.datos_nuevos).fecha_aplicacion, '2022-03-31');
  const [stock] = await db.query('SELECT cantidad_disponible FROM lotes_vacuna WHERE id IN (?,?)', lotes);
  assert.deepEqual(stock.map(l => l.cantidad_disponible), [4, 4]);
}));
