const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const rol of ['administrador', 'enfermero']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      page.setDefaultTimeout(15000);
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const paciente = { id: 9001, nombres: 'Paciente', apellidos: 'Prueba', codigo_paciente: 'TEST', fecha_nacimiento: '2024-01-01', sexo: 'F', estado: 'activo', tutores: [] };
      const dosis = (id, estado = 'activo') => ({ id, vacuna_id: 1, numero_dosis: id, nombre_dosis: `Dosis ${id}`, estado, edad_recomendada_dias: 0, tolerancia_dias: 0, intervalo_minimo_dias: 0 });
      const vacunas = [
        { id: 1, nombre: 'Vacuna de prueba', nombre_corto: 'TEST', estado: 'activo', dosis: [dosis(1), dosis(2), dosis(3, 'inactivo')] },
        { id: 2, nombre: 'Vacuna retirada', nombre_corto: 'OLD', estado: 'inactivo', dosis: [{ ...dosis(4), vacuna_id: 2 }] },
      ];
      const historial = [{ id: 99, paciente_id: paciente.id, dosis_id: 1, vacuna_nombre: 'Vacuna de prueba', nombre_dosis: 'Dosis 1', fecha_aplicacion: '2024-01-01', lote: 'LOCAL', establecimiento: 'Hospital', aplicado_por: 'Aplicador local', origen: 'local', observaciones: '' }];
      const altas = [], correcciones = [];
      let fallarCatalogo = true;
      await page.addInitScript(rol => {
        localStorage.setItem('hmgu_token', 'test');
        localStorage.setItem('hmgu_usuario', JSON.stringify({ id: 1, nombre: 'Operador prueba', rol }));
      }, rol);
      await page.route('**/api/v1/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname;
        const respond = (status, data, message = 'OK') => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: status < 400, data, message }) });
        if (req.method() === 'POST') {
          assert.equal(path, '/api/v1/historial/antecedentes');
          const input = req.postDataJSON(); altas.push(input);
          assert.equal('loteVacunaId' in input, false); assert.equal('citaId' in input, false);
          if (altas.length === 1) return respond(422, null, 'La fecha no respeta el intervalo programado desde la dosis anterior.');
          const item = { id: 100, paciente_id: input.pacienteId, dosis_id: input.dosisId, vacuna_nombre: 'Vacuna de prueba', nombre_dosis: 'Dosis 2', fecha_aplicacion: input.fechaAplicacion, lote: null, lote_vacuna_id: null, cita_id: null, establecimiento: input.establecimiento, documento_referencia: input.documentoReferencia, observaciones: input.observaciones, origen: 'externo', aplicado_por: null, registrado_por: 'Operador prueba' };
          historial.push(item); return respond(201, item);
        }
        if (req.method() === 'PUT') {
          assert.equal(rol, 'administrador'); assert.equal(path, '/api/v1/historial/100');
          const input = req.postDataJSON(); correcciones.push(input);
          if (correcciones.length === 1) return respond(409, null, 'No se pudo guardar la corrección. Reintenta.');
          Object.assign(historial[1], { fecha_aplicacion: input.fechaAplicacion, establecimiento: input.establecimiento, documento_referencia: input.documentoReferencia, observaciones: input.observaciones });
          return respond(200, historial[1]);
        }
        if (path.endsWith('/vacunas')) {
          if (fallarCatalogo) { fallarCatalogo = false; return respond(503, null, 'Temporalmente no disponible'); }
          return respond(200, vacunas);
        }
        if (path.endsWith('/pacientes')) return respond(200, { rows: [paciente], total: 1 });
        if (path.endsWith('/pacientes/9001')) return respond(200, paciente);
        if (path.includes('/historial/paciente/')) return respond(200, historial);
        if (path.endsWith('/esquema')) return respond(200, { detalle: [], resumen: { aplicadas: historial.length, proximas: 0, pendientes: 0, atrasadas: 0 }, estadoGeneral: 'verde' });
        if (path.includes('/reportes/')) return respond(200, { filas: [] });
        if (path.endsWith('/correos/resumen')) return respond(200, { habilitado: false, estados: [] });
        return respond(200, []);
      });
      await page.goto(process.env.TEST_URL || 'http://localhost:4000/');
      await page.getByRole('button', { name: 'Historial', exact: true }).click();
      await page.getByRole('button', { name: /Paciente Prueba/ }).click();
      await page.getByText('Aplicada por: Aplicador local', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Registrar antecedente externo', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Registrar antecedente externo', exact: true });
      await dialog.getByRole('button', { name: 'Reintentar catálogo' }).click();
      await dialog.getByLabel(/^Vacuna y dosis/).getByRole('option', { name: 'Vacuna de prueba · Dosis 2', exact: true }).waitFor({ state: 'attached' });
      assert.deepEqual(await dialog.getByRole('option').evaluateAll(options => options.map(o => o.value)), ['', '2']);
      const fecha = dialog.getByLabel('Fecha de aplicación', { exact: true });
      assert.equal(await fecha.getAttribute('min'), '2024-01-01');
      assert.equal(await dialog.getByLabel('Establecimiento', { exact: true }).getAttribute('maxlength'), '150');
      assert.equal(await dialog.getByLabel(/^Documento de referencia/).getAttribute('maxlength'), '200');
      await dialog.getByLabel(/^Vacuna y dosis/).selectOption('2');
      await fecha.fill('2024-01-02');
      await dialog.getByLabel('Establecimiento', { exact: true }).fill('  Centro de salud exterior  ');
      await dialog.getByLabel(/^Documento de referencia/).fill('  Carnet 123, página 2  ');
      await dialog.getByLabel('Observaciones', { exact: true }).fill('Documento revisado');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      await dialog.getByRole('button', { name: 'Guardar antecedente', exact: true }).click();
      await dialog.getByRole('alert').getByText(/intervalo programado/).waitFor();
      assert.equal(await dialog.getByLabel(/^Documento de referencia/).inputValue(), '  Carnet 123, página 2  ');
      await fecha.fill('2024-03-01');
      await dialog.getByRole('button', { name: 'Guardar antecedente', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      await page.getByText('Antecedente externo documentado', { exact: true }).waitFor();
      await page.getByText('Documento de referencia: Carnet 123, página 2', { exact: true }).waitFor();
      await page.getByText('Registrado por: Operador prueba', { exact: true }).waitFor();
      assert.equal(await page.getByText('Aplicada por: Operador prueba', { exact: true }).count(), 0);
      assert.equal(altas.length, 2);
      assert.deepEqual(altas[1], { pacienteId: 9001, dosisId: 2, fechaAplicacion: '2024-03-01', establecimiento: 'Centro de salud exterior', documentoReferencia: 'Carnet 123, página 2', observaciones: 'Documento revisado' });
      if (rol === 'administrador') {
        const registro = page.getByText('Antecedente externo documentado', { exact: true }).locator('..').locator('..');
        await registro.getByRole('button', { name: 'Corregir registro', exact: true }).click();
        const editar = page.getByRole('dialog', { name: 'Corregir registro de vacunación', exact: true });
        assert.equal(await editar.getByLabel('Documento de referencia', { exact: true }).inputValue(), 'Carnet 123, página 2');
        await editar.getByLabel('Documento de referencia', { exact: true }).fill('Certificado 456');
        await editar.getByRole('button', { name: 'Guardar corrección', exact: true }).click();
        await editar.getByRole('alert').waitFor();
        assert.equal(await editar.getByLabel('Documento de referencia', { exact: true }).inputValue(), 'Certificado 456');
        await editar.getByRole('button', { name: 'Guardar corrección', exact: true }).click();
        await editar.waitFor({ state: 'hidden' });
        await page.getByText('Documento de referencia: Certificado 456', { exact: true }).waitFor();
        assert.equal(correcciones.length, 2); assert.equal(correcciones[1].documentoReferencia, 'Certificado 456');
      } else assert.equal(await page.getByRole('button', { name: 'Corregir registro', exact: true }).count(), 0);
      await page.getByRole('button', { name: 'Registrar antecedente externo', exact: true }).click();
      await dialog.getByText('No hay dosis activas pendientes de registrar para este paciente.', { exact: true }).waitFor();
      assert.equal(await dialog.getByRole('button', { name: 'Guardar antecedente', exact: true }).isDisabled(), true);
      await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.getByRole('button', { name: 'Pacientes', exact: true }).click();
      await page.getByRole('button', { name: 'Ver', exact: true }).click();
      await page.getByText('Antecedente externo documentado', { exact: true }).waitFor();
      await page.getByText('Registrado por: Operador prueba', { exact: true }).waitFor();
      assert.deepEqual(errors, []);
      console.log(`PASS antecedentes externos: ${rol}, catálogo/reintento, datos documentales, límites, móvil, historial y ficha.`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
