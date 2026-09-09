const {pool}=require('../config/db');
async function main(){try{
 const fuentes={SRP:'https://www.minsalud.gob.bo/8713-ministerio-de-salud-y-alcaldia-de-la-paz-lanzan-la-ruta-srp-protegiendo-a-nuestras-ninas-y-ninos-contra-el-sarampion-en-cinco-redes-de-salud',NEUMO:'https://www.minsalud.gob.bo/8555-dos-tipos-de-vacunas-previenen-la-meningitis-en-ninos-menores-de-cinco-anos-completar-el-esquema-de-todas-las-dosis-permite-proteccion-eficaz'};
 // Solo valores originales del catálogo; nunca reemplaza reglas administradas.
 for(const [codigo,numero,dias,meses] of [['SRP',1,365,12],['SRP',2,1460,18],['NEUMO',1,60,2],['NEUMO',2,120,4],['NEUMO',3,365,6]]){
 const regla=JSON.stringify({tipo:'regular',fuente:fuentes[codigo],minMeses:0,maxMesesExclusivo:60,habilitada:true,version:1,programacion:{base:'nacimiento'}});
 await pool.query(`UPDATE dosis d JOIN vacunas v ON v.id=d.vacuna_id SET d.edad_recomendada_valor=?,d.edad_recomendada_unidad='meses',d.regla_calendario=?
 WHERE v.nombre_corto=? AND d.numero_dosis=? AND d.edad_recomendada_dias=? AND d.regla_calendario IS NULL AND d.edad_recomendada_valor IS NULL`,[meses,regla,codigo,numero,dias]);
 }
 console.log('SRP y neumococo originales actualizados a edades verificadas; historial conservado.');
}finally{await pool.end();}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
