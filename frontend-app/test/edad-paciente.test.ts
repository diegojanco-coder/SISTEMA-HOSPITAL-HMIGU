import { test } from 'node:test';
import assert from 'node:assert/strict';
import { edadPaciente } from '../src/lib/edad-paciente.ts';

test('edad del formulario usa días, meses y años sin desplazar el nacimiento civil',()=>{
 assert.deepEqual(edadPaciente('2026-09-20',new Date(2026,8,20,23)),{anios:0,texto:'0 días'});
 assert.equal(edadPaciente('2026-01-31',new Date(2026,1,28))?.texto,'1 mes');
 assert.equal(edadPaciente('2025-09-20',new Date(2026,8,20))?.texto,'12 meses');
 assert.equal(edadPaciente('2024-09-20',new Date(2026,8,20))?.texto,'2 años');
 assert.equal(edadPaciente('2008-02-29',new Date(2026,1,27))?.anios,17);
 assert.equal(edadPaciente('2008-02-29',new Date(2026,1,28))?.anios,18);
});
test('fecha imposible o futura no ofrece edad',()=>{
 assert.equal(edadPaciente('2026-02-30',new Date(2026,8,20)),null);
 assert.equal(edadPaciente('2026-09-21',new Date(2026,8,20)),null);
 assert.equal(edadPaciente('',new Date(2026,8,20)),null);
});
