const {pool}=require('../config/db');
const auditoria=require('../models/auditoria.model');
const catalogo=[
 {nombre:'Pentavalente',codigo:'PENTA',via:'intramuscular',meses:[2,4,6,18,48],fuente:'https://minsalud.gob.bo/9237-bolivia-dona-255-000-dosis-de-vacuna-pentavalente-para-venezuela-y-haiti'},
 {nombre:'Triple viral (SRP)',codigo:'SRP',via:'subcutanea',meses:[12,18],fuente:'https://www.minsalud.gob.bo/8713-ministerio-de-salud-y-alcaldia-de-la-paz-lanzan-la-ruta-srp-protegiendo-a-nuestras-ninas-y-ninos-contra-el-sarampion-en-cinco-redes-de-salud'},
 {nombre:'Antineumocócica',codigo:'NEUMO',via:'intramuscular',meses:[2,4,6],fuente:'https://www.minsalud.gob.bo/8555-dos-tipos-de-vacunas-previenen-la-meningitis-en-ninos-menores-de-cinco-anos-completar-el-esquema-de-todas-las-dosis-permite-proteccion-eficaz'}
];
async function cargar(db){
 let vacunas=0,dosis=0;
 for(const v of catalogo){
  const [existentes]=await db.query('SELECT id,estado FROM vacunas WHERE nombre_corto=? OR nombre=? FOR UPDATE',[v.codigo,v.nombre]);
  if(existentes.length>1)throw new Error(`Catálogo ambiguo para ${v.codigo}: revise los registros existentes`);
  let id=existentes[0]?.id;
  if(existentes[0]?.estado==='inactivo')continue;
  if(!id){const [r]=await db.query('INSERT INTO vacunas(nombre,nombre_corto,via_administracion,descripcion) VALUES (?,?,?,?)',[v.nombre,v.codigo,v.via,'Edades de programación contrastadas; revisar criterios clínicos antes de aplicar.']);id=r.insertId;vacunas++;}
  for(const [index,meses] of v.meses.entries()){
   const [[existe]]=await db.query('SELECT id FROM dosis WHERE vacuna_id=? AND numero_dosis=?',[id,index+1]);if(existe)continue;
   const regla={tipo:'regular',fuente:v.fuente,habilitada:true,version:1,minMeses:0,maxMesesExclusivo:60,programacion:{base:'nacimiento'}};
   // Margen operativo de seguimiento: no se presenta como contraindicación ni límite clínico.
   const [r]=await db.query(`INSERT INTO dosis(vacuna_id,numero_dosis,nombre_dosis,edad_recomendada_dias,edad_recomendada_valor,edad_recomendada_unidad,tolerancia_dias,intervalo_minimo_dias,regla_calendario)
    VALUES (?,?,?,?,?,'meses',30,0,?)`,[id,index+1,`Dosis ${index+1}`,meses*30,meses,JSON.stringify(regla)]);
   await auditoria.create({usuarioId:null,accion:'CREAR',entidad:'calendario',entidadId:r.insertId,datosNuevos:{vacuna:v.codigo,edadMeses:meses,regla}},db);dosis++;
  }
 }
 return {vacunas,dosis};
}
async function main(){const db=await pool.getConnection();try{await db.beginTransaction();const r=await cargar(db);await db.commit();console.log('Catálogo base cargado:',JSON.stringify(r));}catch(e){await db.rollback();throw e;}finally{db.release();await pool.end();}}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={cargar,catalogo};
