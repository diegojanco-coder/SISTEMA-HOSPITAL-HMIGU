const test = require('node:test');
const assert = require('node:assert/strict');
const { fechaCivil, sumarEdad, isoCivil } = require('../src/utils/calendario.util');
const { evaluarEsquema } = require('../src/services/motorVacunacion.service');
test('Mes calendario y año bisiesto conservan el último día válido', () => {
 assert.equal(isoCivil(sumarEdad(fechaCivil('2024-01-31'),1,'meses')),'2024-02-29');
 assert.equal(isoCivil(sumarEdad(fechaCivil('2024-02-29'),1,'anios')),'2025-02-28');
 assert.equal(isoCivil(sumarEdad(fechaCivil('2024-01-31'),6,'semanas')),'2024-03-13');
});
test('Rechaza fechas y unidades inválidas', () => {
 assert.throws(()=>fechaCivil('2025-02-30'));
 assert.throws(()=>sumarEdad(fechaCivil('2025-01-01'),1,'otro'));
});
const dosis = {id:1,numero_dosis:1,edad_recomendada_dias:60,edad_recomendada_valor:2,edad_recomendada_unidad:'meses',tolerancia_dias:30};
test('Pentavalente cumple dos meses reales, no sesenta días', () => {
 const paciente={fecha_nacimiento:'2025-07-01'};
 const resultado=evaluarEsquema(paciente,[dosis],[],new Date(2025,7,30));
 assert.equal(resultado.detalle[0].fechaRecomendada,'2025-09-01');
 assert.equal(resultado.detalle[0].estado,'proxima');
 assert.equal(evaluarEsquema(paciente,[dosis],[],new Date(2025,8,1)).detalle[0].estado,'pendiente');
});
test('Mantiene historial aplicado y compatibilidad de dosis antiguas', () => {
 const paciente={fecha_nacimiento:'2025-07-01'};
 assert.equal(evaluarEsquema(paciente,[dosis],[{dosis_id:1,fecha_aplicacion:'2025-09-01'}],new Date(2026,0,1)).detalle[0].estado,'aplicada');
 const antigua={...dosis,edad_recomendada_valor:null,edad_recomendada_unidad:null};
 assert.equal(evaluarEsquema(paciente,[antigua],[],new Date(2025,8,1)).detalle[0].fechaRecomendada,'2025-08-30');
});

const { evaluarAlcance } = require('../src/utils/elegibilidad.util');
const fuente='https://example.invalid/fixture';
test('Adulto sin regla no genera atraso ni indicador al día; conserva aplicación',()=>{
 const p={fecha_nacimiento:'1990-01-01'};
 const r=evaluarEsquema(p,[dosis],[],new Date(2026,8,8));
 assert.equal(r.detalle[0].estado,'revision');assert.equal(r.resumen.atrasadas,0);assert.equal(r.estadoGeneral,'revision');assert.ok(r.advertencia);
 assert.equal(evaluarEsquema(p,[dosis],[{dosis_id:1}],new Date(2026,8,8)).detalle[0].estado,'aplicada');
});
test('Pentavalente atrasada sigue disponible salvo un límite estricto',()=>{
 const d={...dosis,regla_calendario:{tipo:'regular',minMeses:0,maxMesesExclusivo:60,fuente}};
 const p={fecha_nacimiento:'2021-09-08'};
 assert.equal(evaluarAlcance(p,d,new Date(2026,8,7)),null);
 assert.equal(evaluarAlcance(p,d,new Date(2026,8,8)),null);
 assert.equal(evaluarAlcance(p,{...d,edad_maxima_dias:1825},new Date(2026,8,8)),'bloqueada_por_edad');
});
test('Regla adulta explícita admite adultos e independientes o dependientes',()=>{
 const d={regla_calendario:{tipo:'regular',minMeses:216,fuente}};
 for(const es_dependiente of [0,1]) assert.equal(evaluarAlcance({fecha_nacimiento:'1990-01-01',es_dependiente},d,new Date(2026,8,8)),null);
 assert.equal(evaluarAlcance({fecha_nacimiento:'2020-01-01'},d,new Date(2026,8,8)),'fuera_alcance');
});
test('Campaña exige fechas y territorio y termina después de su último día',()=>{
 const p={fecha_nacimiento:'2025-01-01',departamento:'Cochabamba'};
 const regla={tipo:'campana',minMeses:0,maxMesesExclusivo:72,inicio:'2026-02-01',fin:'2026-04-30',territorio:'Cochabamba',fuente};
 const d={regla_calendario:regla};
 assert.equal(evaluarAlcance(p,d,new Date(2026,0,31)),'fuera_alcance');
 assert.equal(evaluarAlcance(p,d,new Date(2026,1,1)),null);
 assert.equal(evaluarAlcance(p,d,new Date(2026,3,30)),null);
 assert.equal(evaluarAlcance(p,d,new Date(2026,4,1)),'fuera_alcance');
 assert.equal(evaluarAlcance({...p,departamento:'La Paz'},d,new Date(2026,2,1)),'fuera_alcance');
 assert.equal(evaluarAlcance({...p,departamento:null},d,new Date(2026,2,1)),'revision');
 assert.equal(evaluarAlcance(p,{regla_calendario:{...regla,fin:null}},new Date(2026,2,1)),'revision');
});
test('Regla inválida y catálogo vacío no significan esquema completo',()=>{
 assert.equal(evaluarAlcance({fecha_nacimiento:'2025-01-01'},{regla_calendario:'{'},new Date(2026,1,1)),'revision');
 assert.equal(evaluarEsquema({fecha_nacimiento:'2025-01-01'},[],[],new Date(2026,1,1)).estadoGeneral,'revision');
});

test('Seguimiento adulto cuenta un mes desde la aplicación, no desde el nacimiento',()=>{
 const d={...dosis,id:2,regla_calendario:{tipo:'regular',minMeses:216,fuente,programacion:{base:'dosis_previa',dosisId:1,valor:1,unidad:'meses'}}};
 const p={fecha_nacimiento:'1990-01-01'};
 const r=evaluarEsquema(p,[d],[{dosis_id:1,fecha_aplicacion:'2026-01-31'}],new Date(2026,1,20));
 assert.equal(r.detalle[0].fechaRecomendada,'2026-02-28');assert.equal(r.detalle[0].estado,'proxima');
 const sin=evaluarEsquema(p,[d],[],new Date(2026,1,20));
 assert.equal(sin.detalle[0].estado,'revision');assert.equal(sin.detalle[0].fechaRecomendada,null);assert.equal(sin.estadoGeneral,'revision');
});
test('Primera dosis al contacto no se considera atrasada desde la infancia',()=>{
 const d={...dosis,regla_calendario:{tipo:'regular',minMeses:216,fuente,programacion:{base:'contacto'}}};
 const p={fecha_nacimiento:'1990-01-01'};
 const r=evaluarEsquema(p,[d],[],new Date(2026,1,20));
 assert.equal(r.detalle[0].estado,'revision');assert.equal(r.detalle[0].fechaLimite,null);
 assert.equal(evaluarEsquema(p,[d],[{dosis_id:1,fecha_aplicacion:'2026-01-01'}],new Date(2026,1,20)).detalle[0].estado,'aplicada');
});
test('Antecedente ambiguo o inválido requiere revisión',()=>{
 const d={...dosis,id:2,regla_calendario:{tipo:'regular',minMeses:216,fuente,programacion:{base:'dosis_previa',dosisId:1,valor:1,unidad:'meses'}}};
 for(const historial of [[{dosis_id:1,fecha_aplicacion:'2026-02-30'}],[{dosis_id:1,fecha_aplicacion:'2026-01-01'},{dosis_id:1,fecha_aplicacion:'2026-01-02'}]]) {
 assert.equal(evaluarEsquema({fecha_nacimiento:'1990-01-01'},[d],historial,new Date(2026,1,20)).detalle[0].estado,'revision');
 }
});
test('edad exacta no produce días negativos al cruzar febrero',()=>{
 const {calcularEdadExacta}=require('../src/utils/edad.util');
 assert.deepEqual(calcularEdadExacta('2025-01-31',new Date(2025,2,1)),{anios:0,meses:1,dias:1,edadEnDias:29});
 assert.deepEqual(calcularEdadExacta('2024-02-29',new Date(2025,1,28)),{anios:1,meses:0,dias:0,edadEnDias:365});
});

const reglaSexos={tipo:'regular',fuente,minMeses:120,maxMesesExclusivo:180,programacion:{base:'contacto'},edadesPorSexo:{F:{minMeses:120,maxMesesExclusivo:180},M:{minMeses:120,maxMesesExclusivo:132}}};
test('VPH respeta edades mínimas y permite catch-up después de la ventana ideal',()=>{
 const d={...dosis,regla_calendario:reglaSexos};const p={fecha_nacimiento:'2016-09-12'};
 for(const sexo of ['F','M']){
  assert.equal(evaluarAlcance({...p,sexo},d,'2026-09-11'),'fuera_alcance');
  assert.equal(evaluarAlcance({...p,sexo},d,'2026-09-12'),null);
 }
 assert.equal(evaluarAlcance({...p,sexo:'M'},d,'2027-09-11'),null);
 assert.equal(evaluarAlcance({...p,sexo:'M'},d,'2027-09-12'),null);
 assert.equal(evaluarAlcance({...p,sexo:'F'},d,'2031-09-11'),null);
 assert.equal(evaluarAlcance({...p,sexo:'F'},d,'2031-09-12'),null);
 assert.equal(evaluarAlcance({fecha_nacimiento:'2016-02-29',sexo:'M'},d,'2027-02-27'),null);
 assert.equal(evaluarAlcance({fecha_nacimiento:'2016-02-29',sexo:'M'},d,'2027-02-28'),null);
});
test('rangos específicos se intersectan con edades generales y exigen sexo conocido',()=>{
 const p={fecha_nacimiento:'2012-09-12',sexo:'F'};
 assert.equal(evaluarAlcance(p,{regla_calendario:{...reglaSexos,maxMesesExclusivo:132}},'2026-09-12'),null);
 assert.equal(evaluarAlcance(p,{regla_calendario:{...reglaSexos,minMeses:175}},'2026-09-12'),'fuera_alcance');
 assert.equal(evaluarAlcance(p,{regla_calendario:{...reglaSexos,edadesPorSexo:{M:{minMeses:120,maxMesesExclusivo:180}}}},'2026-09-12'),'fuera_alcance');
 for(const sexo of [null,undefined,'X','f'])assert.equal(evaluarAlcance({...p,sexo},{regla_calendario:reglaSexos},'2026-09-12'),'revision');
 const antigua={...reglaSexos};delete antigua.edadesPorSexo;
 assert.equal(evaluarAlcance({...p,sexo:undefined},{regla_calendario:antigua},'2026-09-12'),null);
});
test('rangos malformados requieren revisión, sin ampliar automáticamente el alcance',()=>{
 for(const edadesPorSexo of [null,{},[],{X:{minMeses:120,maxMesesExclusivo:180}},{F:null},{F:[]},{F:{minMeses:'120',maxMesesExclusivo:180}},{F:{minMeses:120,maxMesesExclusivo:120}},{F:{minMeses:120}},{F:{minMeses:-1,maxMesesExclusivo:null}},{F:{minMeses:120,maxMesesExclusivo:null,otra:1}}]){
  const r={...reglaSexos,edadesPorSexo};
  assert.equal(evaluarAlcance({fecha_nacimiento:'2012-09-12',sexo:'F'},{regla_calendario:JSON.stringify(r)},'2026-09-12'),'revision');
 }
 assert.equal(evaluarAlcance({fecha_nacimiento:'2012-09-12',sexo:'F'},{regla_calendario:{...reglaSexos,edadesPorSexo:{F:{minMeses:120,maxMesesExclusivo:null}}}},'2026-09-12'),null);
});
test('motor solo permite contacto a grupo elegible y conserva aplicaciones históricas',()=>{
 const d={...dosis,regla_calendario:reglaSexos};const p={fecha_nacimiento:'2012-09-12',sexo:'F'};
 const evaluar=(paciente,historial=[])=>evaluarEsquema(paciente,[d],historial,new Date(2026,8,12)).detalle[0];
 assert.equal(evaluar(p).registrable,true);assert.equal(evaluar(p).estado,'revision');
 assert.equal(evaluar({...p,sexo:'M'}).registrable,true);assert.equal(evaluar({...p,sexo:'M'}).estado,'revision');
 const estricta={...d,edad_maxima_dias:5000};
 const bloqueada=evaluarEsquema({...p,sexo:'M'},[estricta],[],new Date(2026,8,12)).detalle[0];
 assert.equal(bloqueada.registrable,false);assert.equal(bloqueada.seleccionable,false);assert.equal(bloqueada.estado,'bloqueada_por_edad');
 assert.equal(evaluar({...p,sexo:'M'},[{dosis_id:d.id,fecha_aplicacion:'2022-09-12'}]).estado,'aplicada');
 assert.equal(evaluar({...p,sexo:null}).registrable,false);
});
test('motor excluye aplicadas de dosis disponibles y conserva atrasadas seleccionables',()=>{
 const p={fecha_nacimiento:'2025-01-01'};
 const catalogo=[
  {...dosis,id:1,vacuna_id:1,vacuna_nombre:'Prueba',nombre_dosis:'Primera',regla_calendario:{tipo:'regular',minMeses:0,fuente,programacion:{base:'nacimiento'}}},
  {...dosis,id:2,vacuna_id:1,vacuna_nombre:'Prueba',nombre_dosis:'Segunda',regla_calendario:{tipo:'regular',minMeses:0,fuente,programacion:{base:'nacimiento'}}}
 ];
 const resultado=evaluarEsquema(p,catalogo,[{dosis_id:1,fecha_aplicacion:'2025-03-01'}],new Date(2025,5,1));
 assert.equal(resultado.detalle.find(x=>x.dosisId===1).estado,'aplicada');
 assert.deepEqual(resultado.dosisDisponibles.map(x=>x.dosisId),[2]);
 assert.equal(resultado.dosisDisponibles[0].estado,'atrasada');
 assert.equal(resultado.dosisDisponibles[0].seleccionable,true);
 assert.ok(resultado.dosisDisponibles[0].diasRetraso>0);
});
test('adultos no reciben calendario infantil y adultos mayores pueden tener reglas propias',()=>{
 const infantil={...dosis,regla_calendario:{tipo:'regular',fuente,minMeses:0,maxMesesExclusivo:60,grupoEtario:'menor',programacion:{base:'nacimiento'}}};
 const adulto={...dosis,id:2,regla_calendario:{tipo:'regular',fuente,minMeses:216,grupoEtario:'adulto',programacion:{base:'contacto'}}};
 const mayor={...dosis,id:3,regla_calendario:{tipo:'regular',fuente,minMeses:720,grupoEtario:'adulto_mayor',programacion:{base:'contacto'}}};
 assert.equal(evaluarAlcance({fecha_nacimiento:'1990-01-01'},infantil,'2026-10-01'),'fuera_alcance');
 assert.equal(evaluarAlcance({fecha_nacimiento:'1990-01-01'},adulto,'2026-10-01'),null);
 assert.equal(evaluarAlcance({fecha_nacimiento:'1950-01-01'},adulto,'2026-10-01'),null);
 assert.equal(evaluarAlcance({fecha_nacimiento:'1990-01-01'},mayor,'2026-10-01'),'fuera_alcance');
 assert.equal(evaluarAlcance({fecha_nacimiento:'1950-01-01'},mayor,'2026-10-01'),null);
});
test('Td recurrente calcula diez años desde la última aplicación',()=>{
 const td={...dosis,vacuna_id:10,vacuna_nombre:'Toxoide Tetánico',regla_calendario:{tipo:'regular',fuente,minMeses:216,grupoEtario:'adulto',programacion:{base:'ultima_aplicacion',valor:10,unidad:'anios',sinAntecedente:'contacto'}}};
 const p={fecha_nacimiento:'1980-01-01'};
 const primera=evaluarEsquema(p,[td],[],new Date('2026-10-01T12:00:00')).detalle[0];
 assert.equal(primera.registrable,true);assert.equal(primera.tipoAlerta,'recomendacion_refuerzo');
 const refuerzo=evaluarEsquema(p,[td],[{dosis_id:td.id,fecha_aplicacion:'2016-10-01'}],new Date('2026-09-15T12:00:00')).detalle[0];
 assert.equal(refuerzo.fechaRecomendada,'2026-10-01');assert.equal(refuerzo.estado,'proxima');assert.equal(refuerzo.recurrente,true);
});
test('influenza estacional usa el inicio de campaña y permite una aplicación por temporada',()=>{
 const flu={...dosis,vacuna_id:11,vacuna_nombre:'Influenza',regla_calendario:{tipo:'campana',fuente,minMeses:720,grupoEtario:'adulto_mayor',inicio:'2026-04-01',fin:'2026-08-31',territorio:'Bolivia',programacion:{base:'campana'}}};
 const p={fecha_nacimiento:'1950-01-01'};
 const previa=evaluarEsquema(p,[flu],[{dosis_id:flu.id,fecha_aplicacion:'2025-05-01'}],new Date('2026-04-01T12:00:00')).detalle[0];
 assert.equal(previa.fechaRecomendada,'2026-04-01');assert.equal(previa.estado,'pendiente');assert.equal(previa.tipoAlerta,'recomendacion_campana');
 const actual=evaluarEsquema(p,[flu],[{dosis_id:flu.id,fecha_aplicacion:'2026-05-01'}],new Date('2026-06-01T12:00:00')).detalle[0];
 assert.equal(actual.estado,'aplicada');
});
