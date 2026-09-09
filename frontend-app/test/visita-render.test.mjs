import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transform } from 'esbuild';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as visita from '../src/lib/visita.ts';
test('el formulario abre sin depender de variables del formulario de tutores', async () => {
 const source=await readFile(new URL('../src/app/components/dashboard/AddVaccineModal.tsx',import.meta.url),'utf8');
 const result=await transform(source,{loader:'tsx',format:'cjs',jsx:'automatic'});
 const require=createRequire(import.meta.url);
 const compiled={exports:{}};
 const load=(id)=>id.endsWith('/lib/visita') ? visita : id.includes('/services/') ? {} : require(id);
 new Function('require','module','exports',result.code)(load,compiled,compiled.exports);
 const html=renderToStaticMarkup(React.createElement(compiled.exports.default,{paciente:{id:1,nombres:'Prueba',apellidos:'Temporal',codigo_paciente:'TEST',fecha_nacimiento:'2000-01-01'},aplicadoPor:'Enfermería',onClose(){},onSaved(){}}));
 assert.match(html,/Registrar vacunación/);assert.match(html,/Cargando dosis/);assert.match(html,/Revisar visita/);
});
