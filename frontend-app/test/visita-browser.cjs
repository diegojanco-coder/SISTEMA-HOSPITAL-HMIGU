// Browser tests intercept every API call. They never write to MySQL or send emails.
const assert = require('node:assert/strict');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const patient = { id: 9001, nombres: 'Paciente', apellidos: 'de Prueba', codigo_paciente: 'TEST-UI', fecha_nacimiento: '2000-01-01', sexo: 'F', edad_formateada: '26 años' };
const doses = [1, 2].map(n => ({ dosisId: n, vacunaId: n, vacunaNombre: 'Vacuna de prueba ' + n, nombreDosis: 'Dosis única', estado: 'pendiente', fechaLimite: '2026-09-07' }));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const browser = await chromium.launch({ channel: process.env.TEST_BROWSER || 'msedge', headless: true });
  async function run(name, verify, config = {}) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [], requests = [];
    let saved = false, lotFailure = config.lotFailure, profileFailure = config.profileFailure;
    page.setDefaultTimeout(15000);
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('hmgu_token', 'test-local');
      localStorage.setItem('hmgu_usuario', JSON.stringify({ id: 9001, nombre: 'Enfermería de prueba', rol: 'enfermero' }));
    });
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const fulfill = (data, status = 200, message = '') => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: status < 400, data, message }) });
      if (path.endsWith('/citas')) {
        requests.push(route.request().postDataJSON());
        await wait(150);
        if (config.saveFailure) return fulfill(null, 409, 'El lote está vencido, inactivo o sin stock');
        saved = true;
        return fulfill({ id: 999, pacienteId: patient.id, dosisAplicadas: requests.at(-1).dosisAplicadas });
      }
      if (path.endsWith('/esquema')) return fulfill({ detalle: doses.map(d => ({ ...d, estado: saved ? 'aplicada' : 'pendiente' })), resumen: { aplicadas: saved ? 2 : 0, proximas: 0, pendientes: saved ? 0 : 2, atrasadas: 0 }, estadoGeneral: 'amarillo' });
      if (path.includes('/historial/')) return fulfill(saved ? doses.map(d => ({ id: d.dosisId, vacuna_nombre: d.vacunaNombre, nombre_dosis: d.nombreDosis, fecha_aplicacion: requests[0].dosisAplicadas[0].fechaAplicacion, lote: 'LOTE-' + d.vacunaId })) : []);
      if (path.includes('/lotes/')) {
        const id = Number(path.split('/')[5]);
        if (lotFailure) { lotFailure = false; return fulfill(null, 500, 'Error simulado'); }
        if (config.delayedLots && id === 1) await wait(500);
        return fulfill([{ id: 100 + id, vacuna_id: id, numero_lote: 'LOTE-' + id, fecha_vencimiento: '2099-01-01', cantidad_disponible: 5 }]);
      }
      if (path.endsWith('/pacientes')) return fulfill({ rows: [patient], total: 1, page: 1, limit: 10 });
      if (path.endsWith('/pacientes/9001')) {
        if (profileFailure) { profileFailure = false; return fulfill(null, 500, 'Error simulado'); }
        return fulfill({ ...patient, tutores: [{ id: 99, nombres: 'Responsable', apellidos: 'Prueba', parentesco: 'otro', telefono: '70000000' }] });
      }
      if (path.includes('/reportes/')) return fulfill({ filas: [] });
      return fulfill([]);
    });
    try {
      await page.goto(process.env.TEST_URL || 'http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Pacientes', exact: true }).click();
      await page.getByRole('button', { name: 'Ver', exact: true }).click();
      if (config.profileFailure) {
        await page.getByRole('alert').getByText('No se pudo cargar la ficha del paciente. Intenta nuevamente.').waitFor();
        await page.getByRole('button', { name: 'Reintentar carga' }).click();
      }
      await page.getByText('Responsable Prueba (otro)', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Registrar Vacuna', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      const add = async id => {
        await dialog.getByLabel('Dosis', { exact: true }).selectOption(String(id));
        await dialog.getByLabel('Lote', { exact: true }).selectOption(String(100 + id));
        await dialog.getByRole('button', { name: 'Añadir dosis a la visita' }).click();
      };
      await verify({ page, dialog, add, requests });
      assert.deepEqual(errors, []);
      console.log('PASS:', name);
    } catch (e) {
      await page.screenshot({ path: os.tmpdir() + '/visita-error.png' }).catch(() => {});
      throw e;
    } finally { await page.close(); }
  }
  try {
    await run('dos dosis, petición única, tutor cargado e historial actualizado', async ({ page, dialog, add, requests }) => {
      await add(1); await add(2);
      await dialog.getByRole('button', { name: 'Revisar visita' }).click();
      await page.screenshot({ path: os.tmpdir() + '/visita-resumen.png' });
      await dialog.getByRole('button', { name: 'Confirmar 2 dosis' }).click();
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(requests.length, 1); assert.equal(requests[0].dosisAplicadas.length, 2);
      await page.getByText('Lote: LOTE-1', { exact: false }).waitFor();
      await page.getByText('Lote: LOTE-2', { exact: false }).waitFor();
      await page.screenshot({ path: os.tmpdir() + '/visita-despues.png' });
    });
    await run('quitar dosis y corregir una fecha futura sin enviar', async ({ dialog, add, requests }) => {
      await add(1);
      await dialog.getByLabel('Dosis', { exact: true }).locator('option[value="1"]:disabled').waitFor({ state: 'attached' });
      await dialog.getByRole('button', { name: 'Quitar Vacuna de prueba 1 Dosis única' }).click();
      await dialog.locator('button:disabled').filter({ hasText: 'Revisar visita' }).waitFor();
      await add(2);
      await dialog.getByLabel('Fecha de aplicación').fill('2099-01-01');
      await dialog.getByRole('button', { name: 'Revisar visita' }).click();
      assert.equal(await dialog.getByLabel('Fecha de aplicación').evaluate(el => el.validity.rangeOverflow), true);
      assert.equal(requests.length, 0);
    });
    await run('error de lotes visible y recuperación al cambiar la selección', async ({ dialog, add }) => {
      await dialog.getByLabel('Dosis', { exact: true }).selectOption('1');
      await dialog.getByRole('alert').getByText(/No se pudieron cargar los lotes/).waitFor();
      await add(2);
      await dialog.getByRole('button', { name: 'Revisar visita' }).click();
      await dialog.getByRole('button', { name: 'Confirmar 1 dosis' }).waitFor();
    }, { lotFailure: true });
    await run('rechazo por stock conserva las dosis para corregirlas', async ({ dialog, add, requests }) => {
      await add(1); await add(2);
      await dialog.getByRole('button', { name: 'Revisar visita' }).click();
      await dialog.getByRole('button', { name: 'Confirmar 2 dosis' }).click();
      await dialog.getByRole('alert').getByText('El lote está vencido, inactivo o sin stock').waitFor();
      await dialog.getByRole('button', { name: 'Volver a editar' }).click();
      await dialog.getByText('Dosis de esta visita (2)', { exact: true }).waitFor();
      assert.equal(requests.length, 1);
    }, { saveFailure: true });
    await run('respuesta atrasada no reemplaza lotes de la selección actual', async ({ page, dialog }) => {
      const first = page.waitForRequest(r => r.url().includes('/lotes/vacuna/1/'));
      await dialog.getByLabel('Dosis', { exact: true }).selectOption('1'); await first;
      await dialog.getByLabel('Dosis', { exact: true }).selectOption('2');
      await dialog.getByLabel('Lote', { exact: true }).selectOption('102');
      await wait(650);
      assert.equal(await dialog.getByLabel('Lote', { exact: true }).inputValue(), '102');
      assert.equal(await dialog.getByLabel('Lote', { exact: true }).locator('option[value="101"]').count(), 0);
    }, { delayedLots: true });
    await run('ficha reintenta carga y resumen cabe en pantalla móvil oscura', async ({ page, dialog, add }) => {
      await add(1); await add(2);
      await page.getByRole('button', { name: 'Activar tema oscuro' }).click();
      await page.setViewportSize({ width: 390, height: 844 });
      await dialog.getByRole('button', { name: 'Revisar visita' }).click();
      const bounds = await dialog.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
      await page.screenshot({ path: os.tmpdir() + '/visita-movil-oscuro.png' });
    }, { profileFailure: true });
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
