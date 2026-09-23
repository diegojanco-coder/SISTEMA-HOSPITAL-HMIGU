export function edadPaciente(fecha: string, referencia = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const [anio,mes,dia] = fecha.split('-').map(Number);
  if(anio<100) return null;
  const nacimiento=new Date(Date.UTC(anio,mes-1,dia));
  const hoy=new Date(Date.UTC(referencia.getFullYear(),referencia.getMonth(),referencia.getDate()));
  if(nacimiento.getUTCFullYear()!==anio || nacimiento.getUTCMonth()!==mes-1 || nacimiento.getUTCDate()!==dia || nacimiento>hoy)return null;
  let meses=(hoy.getUTCFullYear()-anio)*12+hoy.getUTCMonth()-(mes-1);
  const aniversario=new Date(Date.UTC(anio,mes-1+meses,1));
  const ultimo=new Date(Date.UTC(aniversario.getUTCFullYear(),aniversario.getUTCMonth()+1,0)).getUTCDate();
  aniversario.setUTCDate(Math.min(dia,ultimo));
  if(aniversario>hoy)meses--;
  const anios=Math.floor(meses/12);
  const dias=Math.floor((hoy.getTime()-nacimiento.getTime())/86400000);
  const valor=anios>=2?anios:meses>=1?meses:dias;
  const unidad=anios>=2?'años':meses>=1?(valor===1?'mes':'meses'):(valor===1?'día':'días');
  return {anios,texto:`${valor} ${unidad}`};
}
