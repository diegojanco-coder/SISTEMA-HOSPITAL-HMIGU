import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarVisita, datosVisita, fechaLocal } from '../src/lib/visita.ts';
const dosis = { dosisId: 1, vacunaNombre: 'Prueba', nombreDosis: 'Primera', loteVacunaId: 7, numeroLote: 'TEST', stock: 2 };
test('impide repetir una dosis', () => assert.match(validarVisita([dosis,dosis], '2026-09-07','2000-01-01','2026-09-07'), /repetirse/));
test('acumula consumo de un mismo lote', () => assert.match(validarVisita([{...dosis,stock:1},{...dosis,dosisId:2,stock:1}], '2026-09-07','2000-01-01','2026-09-07'), /existencias/));
test('admite varias dosis cuando hay stock', () => assert.equal(validarVisita([dosis,{...dosis,dosisId:2}], '2026-09-07','2000-01-01','2026-09-07'), ''));
test('rechaza fecha futura y anterior al nacimiento', () => {
 assert.match(validarVisita([dosis], '2026-09-08','2000-01-01','2026-09-07'), /futura/);
 assert.match(validarVisita([dosis], '1999-01-01','2000-01-01','2026-09-07'), /nacimiento/);
});
test('rechaza fecha imposible y visita vacía', () => {
 assert.match(validarVisita([dosis], '2026-02-30','2000-01-01','2026-09-07'), /válida/);
 assert.match(validarVisita([], '2026-09-07','2000-01-01','2026-09-07'), /al menos/);
});
test('envía todas las dosis juntas, con fecha compartida y sin metadatos visuales', () => {
 const payload=datosVisita(8,'2026-09-07','Observación',[dosis,{...dosis,dosisId:2}]);
 assert.equal(payload.dosisAplicadas.length,2);
 assert.deepEqual(payload.dosisAplicadas[1],{dosisId:2,loteVacunaId:7,fechaAplicacion:'2026-09-07'});
 assert.equal(payload.pacienteId,8);
});
test('la fecha inicial usa el calendario local',()=>assert.equal(fechaLocal(new Date(2026,8,7,23,59)), '2026-09-07'));
