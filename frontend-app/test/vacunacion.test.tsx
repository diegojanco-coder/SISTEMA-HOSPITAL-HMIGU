import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddVaccineModal } from '../src/app/components/dashboard/Pacientes';
import { registrarAplicacion } from '../src/services/historial.service';
vi.mock('../src/services/pacientes.service', () => ({
  obtenerEsquemaPaciente: vi.fn().mockResolvedValue({ detalle: [{ dosisId: 1, vacunaId: 1, vacunaNombre: 'Test', nombreDosis: 'Primera', estado: 'pendiente' }] }),
}));
vi.mock('../src/services/historial.service', () => ({ registrarAplicacion: vi.fn() }));
vi.mock('../src/services/lotes.service', () => ({
  listarLotesDisponibles: vi.fn().mockResolvedValue([{ id: 1, numero_lote: 'TEST' }]),
}));
afterEach(cleanup);
beforeEach(() => { vi.mocked(registrarAplicacion).mockReset(); });
async function setup() {
  const onSaved = vi.fn();
  const view = render(<AddVaccineModal paciente={{ id: 1, nombres: 'Paciente', apellidos: 'Prueba' } as any} aplicadoPor="Test" onClose={vi.fn()} onSaved={onSaved} />);
  await screen.findByText('Test - Primera (pendiente)');
  fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '1' } });
  await screen.findByText('TEST (máximo 50 caracteres)');
  fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: '1' } });
  fireEvent.submit(view.container.querySelector('form')!);
  return { onSaved, view };
}
test('shows saved warning until acknowledged and removes the submit form', async () => {
  vi.mocked(registrarAplicacion).mockResolvedValue({ id: 1, pacienteId: 1, dosisAplicadas: [], advertencias: [{ codigo: 'ALERTAS_NO_ACTUALIZADAS', mensaje: 'No vuelva a registrar las dosis.' }] });
  const { onSaved, view } = await setup();
  expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Vacunación registradaNo vuelva a registrar las dosis.');
  expect(view.container.querySelector('form')).toBeNull();
  expect(onSaved).not.toHaveBeenCalled();
  expect(registrarAplicacion).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
  expect(onSaved).toHaveBeenCalledTimes(1);
});
test('normal success finishes immediately', async () => {
  vi.mocked(registrarAplicacion).mockResolvedValue({ id: 1, pacienteId: 1, dosisAplicadas: [] });
  const { onSaved } = await setup();
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole('status')).toBeNull();
});
test('failed registration keeps the form and does not claim success', async () => {
  vi.mocked(registrarAplicacion).mockRejectedValue({ response: { data: { message: 'Lote sin stock' } } });
  const { onSaved, view } = await setup();
  await screen.findByText('Lote sin stock');
  expect(view.container.querySelector('form')).not.toBeNull();
  expect(onSaved).not.toHaveBeenCalled();
});
