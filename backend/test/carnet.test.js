const { test, mock, after } = require('node:test');
const assert = require('node:assert/strict');
const paciente = require('../src/models/paciente.model');
const dosis = require('../src/models/dosis.model');
const historial = require('../src/models/historial.model');
const pdf = require('../src/utils/pdf.util');
const { pool } = require('../src/config/db');
after(() => pool.end());

test('el carnet conserva aplicaciones aunque la vacuna ya no esté en el catálogo activo', async () => {
  const tablas = [];
  mock.method(pdf, 'dibujarTablaSimple', (_doc, options) => { tablas.push(options); return options.startY + 30; });
  mock.method(paciente, 'findById', async () => ({ id: 1, codigo_paciente: 'TEST', nombres: 'Paciente', apellidos: 'Prueba', fecha_nacimiento: '2000-01-01', sexo: 'M' }));
  mock.method(paciente, 'findTutoresByPacienteId', async () => []);
  mock.method(dosis, 'findAllConVacuna', async () => []);
  mock.method(historial, 'findByPacienteId', async () => [{ dosis_id: 9, vacuna_nombre: 'Vacuna retirada', nombre_dosis: 'Primera dosis', fecha_aplicacion: '2020-01-01', lote: 'HISTORICO' }]);
  try {
    const { generarCarnetPDF } = require('../src/services/carnet.service');
    const doc = await generarCarnetPDF(1);
    doc.resume();
    doc.end();
    assert.equal(tablas.length, 1);
    assert.deepEqual(tablas[0].rows, [['Vacuna retirada', 'Primera dosis', '2020-01-01', 'HISTORICO']]);
  } finally { mock.restoreAll(); }
});

test('el carnet identifica el antecedente externo y su documento, sin atribuir lote ni aplicación local', async () => {
  const tablas = [];
  mock.method(pdf, 'dibujarTablaSimple', (_doc, options) => { tablas.push(options); return options.startY + 50; });
  mock.method(paciente, 'findById', async () => ({ id: 2, codigo_paciente: 'TEST-EXT', nombres: 'Paciente', apellidos: 'Ensayo', fecha_nacimiento: '2020-01-01', sexo: 'F' }));
  mock.method(paciente, 'findTutoresByPacienteId', async () => []);
  mock.method(dosis, 'findAllConVacuna', async () => []);
  mock.method(historial, 'findByPacienteId', async () => [{ dosis_id: 12, vacuna_nombre: 'Vacuna histórica', nombre_dosis: 'Primera', fecha_aplicacion: '2021-01-01', origen: 'externo', lote: null, establecimiento: 'Centro de origen', documento_referencia: 'Carnet 123', registrado_por: 'Operador de registro' }]);
  try {
    delete require.cache[require.resolve('../src/services/carnet.service')];
    const doc = await require('../src/services/carnet.service').generarCarnetPDF(2);
    doc.resume(); doc.end();
    assert.equal(tablas.length, 1);
    assert.deepEqual(tablas[0].headers, ['Vacuna / dosis', 'Fecha', 'Procedencia y documento']);
    assert.deepEqual(tablas[0].rows, [['Vacuna histórica - Primera', '2021-01-01', 'Establecimiento: Centro de origen\nDocumento: Carnet 123\nRegistrado por: Operador de registro']]);
  } finally { mock.restoreAll(); }
});
