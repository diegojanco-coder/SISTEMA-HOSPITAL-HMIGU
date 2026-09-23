const {pool}=require('../config/db');
const auditoria=require('../models/auditoria.model');
const catalogo=[
 {nombre:'Pentavalente',codigo:'PENTA',via:'intramuscular',meses:[2,4,6,18,48],fuente:'https://minsalud.gob.bo/9237-bolivia-dona-255-000-dosis-de-vacuna-pentavalente-para-venezuela-y-haiti'},
 {nombre:'Triple viral (SRP)',codigo:'SRP',via:'subcutanea',meses:[12,18],fuente:'https://www.minsalud.gob.bo/8713-ministerio-de-salud-y-alcaldia-de-la-paz-lanzan-la-ruta-srp-protegiendo-a-nuestras-ninas-y-ninos-contra-el-sarampion-en-cinco-redes-de-salud'},
 {nombre:'Antineumocócica',codigo:'NEUMO',via:'intramuscular',meses:[2,4,6],fuente:'https://www.minsalud.gob.bo/8555-dos-tipos-de-vacunas-previenen-la-meningitis-en-ninos-menores-de-cinco-anos-completar-el-esquema-de-todas-las-dosis-permite-proteccion-eficaz'},
 {nombre:'Fiebre amarilla',codigo:'FA',via:'subcutanea',meses:[12],fuente:'https://www.minsalud.gob.bo/8296-salud-insta-a-intensificar-la-vacunacion-oportuna-contra-la-fiebre-amarilla-una-dosis-confiere-inmunidad-de-por-vida',
  regla:{minMeses:12,maxMesesExclusivo:24},descripcion:'Pauta infantil ordinaria de una dosis a los 12 meses. Recuperación, viajeros y contraindicaciones requieren evaluación clínica.'},
 {nombre:'Virus del papiloma humano',codigo:'VPH',via:'intramuscular',meses:[120],fuente:'https://www.minsalud.gob.bo/9020-campana-de-prevencion-contra-el-cancer-buscara-incentivar-la-deteccion-temprana-de-la-enfermedad',
  regla:{minMeses:120,maxMesesExclusivo:180,edadesPorSexo:{F:{minMeses:120,maxMesesExclusivo:180},M:{minMeses:120,maxMesesExclusivo:132}},programacion:{base:'contacto'}},
  descripcion:'Pauta ordinaria de una dosis: niñas de 10 a 14 años y niños de 10 años. Revisar antecedentes e inmunocompromiso; no define esquemas especiales.'},
 {nombre:'BCG',codigo:'BCG',via:'intradermica',meses:[0],fuente:'https://www.sedeslapaz.gob.bo/wp-content/uploads/2025/12/MANUAL-S.S.S.R.O.-GESTION-2025-FINAL.pdf',
  regla:{minMeses:0,maxMesesExclusivo:12},descripcion:'Una dosis en recién nacido, antes de cumplir un año. Manual SEDES gestión 2025, tabla 2 (página PDF 257), basado en PAI 2022. Prematuridad y otras excepciones requieren evaluación clínica.'},
 {clave:'IPV',nombre:'Antipolio inactivada (IPV)',codigo:'IPV',via:'intramuscular',meses:[2,6],numeros:[1,3],
  fuente:'https://www.sedeslapaz.gob.bo/wp-content/uploads/2025/12/MANUAL-S.S.S.R.O.-GESTION-2025-FINAL.pdf',
  antecedentes:{3:{clave:'bOPV',numero:2,valor:2,unidad:'meses'}},
  descripcion:'Serie antipolio: IPV en posiciones 1 y 3. La tercera se programa desde la bOPV anterior. Intervalos óptimos de la pauta ordinaria; recuperación individual requiere evaluación.'},
 {clave:'bOPV',nombre:'Antipolio oral bivalente (bOPV)',codigo:'bOPV',via:'oral',meses:[4,18,48],numeros:[2,4,5],
  fuente:'https://www.sedeslapaz.gob.bo/wp-content/uploads/2025/12/MANUAL-S.S.S.R.O.-GESTION-2025-FINAL.pdf',
  antecedentes:{2:{clave:'IPV',numero:1,valor:2,unidad:'meses'},4:{clave:'IPV',numero:3,valor:12,unidad:'meses'},5:{clave:'bOPV',numero:4,valor:30,unidad:'meses'}},
  descripcion:'Serie antipolio: bOPV en posiciones 2, 4 y 5; se usa exclusivamente un lote bOPV. Seguimiento desde antecedentes registrados, según intervalos óptimos de la pauta ordinaria.'}
];
async function cargar(db){
 let vacunas=0,dosis=0;const ids=new Map(),nuevas=[],formulaciones=new Map();
 for(const v of catalogo){
  const [existentes]=await db.query('SELECT id,estado FROM vacunas WHERE nombre_corto=? OR nombre=? FOR UPDATE',[v.codigo,v.nombre]);
  if(existentes.length>1)throw new Error(`Catálogo ambiguo para ${v.codigo}: revise los registros existentes`);
  let id=existentes[0]?.id;
  if(existentes[0]?.estado==='inactivo')continue;
  if(!id){const [r]=await db.query('INSERT INTO vacunas(nombre,nombre_corto,via_administracion,descripcion) VALUES (?,?,?,?)',[v.nombre,v.codigo,v.via,v.descripcion||'Edades de programación contrastadas; revisar criterios clínicos antes de aplicar.']);id=r.insertId;vacunas++;}
  if(formulaciones.has(id))throw new Error(`Catálogo ambiguo: ${v.codigo} y ${formulaciones.get(id)} coinciden en una misma vacuna. Revise nombre y código.`);
  formulaciones.set(id,v.codigo);
  for(const [index,meses] of v.meses.entries()){
   const numero=v.numeros?.[index]??index+1,clave=`${v.clave||v.codigo}:${numero}`;
   const [[existe]]=await db.query('SELECT id,estado FROM dosis WHERE vacuna_id=? AND numero_dosis=? FOR UPDATE',[id,numero]);
   if(existe){ids.set(clave,{id:existe.id,activo:existe.estado==='activo'});continue;}
   const regla={tipo:'regular',fuente:v.fuente,habilitada:true,version:1,minMeses:0,maxMesesExclusivo:60,programacion:{base:'nacimiento'},...v.regla};
   // Margen operativo de seguimiento: no se presenta como contraindicación ni límite clínico.
   const [r]=await db.query(`INSERT INTO dosis(vacuna_id,numero_dosis,nombre_dosis,edad_recomendada_dias,edad_recomendada_valor,edad_recomendada_unidad,tolerancia_dias,intervalo_minimo_dias,regla_calendario)
    VALUES (?,?,?,?,?,'meses',30,0,?)`,[id,numero,`Dosis ${numero}`,meses*30,meses,JSON.stringify(regla)]);
   ids.set(clave,{id:r.insertId,activo:true});
   nuevas.push({id:r.insertId,vacuna:v.codigo,meses,regla,antecedente:v.antecedentes?.[numero]});dosis++;
  }
 }
 // Resolver las formulaciones en la misma transacción antes de auditar/publicar.
 for(const nueva of nuevas){
  if(nueva.antecedente){
   const a=nueva.antecedente,anterior=ids.get(`${a.clave}:${a.numero}`);
   if(!anterior?.activo)throw new Error('No se pudo enlazar un antecedente activo del esquema antipolio. Revise el catálogo existente.');
   nueva.regla.programacion={base:'dosis_previa',dosisId:anterior.id,valor:a.valor,unidad:a.unidad,permitirOtraVacuna:true};
   await db.query('UPDATE dosis SET regla_calendario=? WHERE id=?',[JSON.stringify(nueva.regla),nueva.id]);
  }
  await auditoria.create({usuarioId:null,accion:'CREAR',entidad:'calendario',entidadId:nueva.id,datosNuevos:{vacuna:nueva.vacuna,edadMeses:nueva.meses,regla:nueva.regla}},db);
 }
 return {vacunas,dosis};
}
async function main(){const db=await pool.getConnection();try{await db.beginTransaction();const r=await cargar(db);await db.commit();console.log('Catálogo base cargado:',JSON.stringify(r));}catch(e){await db.rollback();throw e;}finally{db.release();await pool.end();}}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={cargar,catalogo};
