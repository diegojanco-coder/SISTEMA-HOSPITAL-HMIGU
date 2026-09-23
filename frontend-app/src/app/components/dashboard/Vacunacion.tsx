import { useCallback, useEffect, useState } from 'react';
import { listarVacunas } from '../../../services/vacunas.service';
import type { Vacuna, Dosis } from '../../../lib/types';
function edad(d:Dosis,vacunas:Vacuna[]){
 const p=d.regla_calendario?.programacion;
 if(p?.base==='contacto')return 'Evaluación al contacto';
 if(p?.base==='dosis_previa'){
  const referencia=vacunas.flatMap(v=>v.dosis.map(anterior=>({vacuna:v.nombre,dosis:anterior}))).find(r=>r.dosis.id===p.dosisId);
  return referencia?`Intervalo programado: ${p.valor} ${p.unidad} después de ${referencia.vacuna} · ${referencia.dosis.nombre_dosis}`:`Intervalo programado: ${p.valor} ${p.unidad}. La dosis de referencia no está disponible en el catálogo activo; requiere revisión.`;
 }
 if(d.edad_recomendada_valor!=null)return `${d.edad_recomendada_valor} ${{dias:'días',semanas:'semanas',meses:'meses',anios:'años'}[d.edad_recomendada_unidad||'dias']}`;
 return `${d.edad_recomendada_dias} días (configuración anterior)`;
}
export default function Vacunacion(){
 const [vacunas,setVacunas]=useState<Vacuna[]>([]),[cargando,setCargando]=useState(true),[error,setError]=useState('');
 const cargar=useCallback(async()=>{setCargando(true);setError('');try{setVacunas(await listarVacunas());}catch{setError('No se pudo cargar el calendario.');}finally{setCargando(false);}},[]);
 useEffect(()=>{cargar();},[cargar]);
 return <div className="space-y-6"><h3 className="text-2xl font-bold">Control de Vacunación</h3>
 <p className="text-muted-foreground">Calendario configurado y fuentes de referencia. Los antecedentes y la evaluación del paciente determinan las dosis que corresponden.</p>
 {error&&<div role="alert">{error} <button className="underline" onClick={cargar}>Reintentar</button></div>}{cargando&&<p>Cargando…</p>}
 {['Regular','Campañas temporales','Pendiente de revisión'].map(grupo=>{
 const rows=vacunas.flatMap(v=>v.dosis.map(d=>({v,d}))).filter(({d})=>grupo===(d.regla_calendario?(d.regla_calendario.tipo==='campana'?'Campañas temporales':'Regular'):'Pendiente de revisión'));
 return <section key={grupo} className="rounded-xl border border-border bg-card p-6"><h4 className="font-bold text-lg mb-4">{grupo}</h4>
 {!cargando&&!rows.length&&<p className="text-muted-foreground text-sm">No hay dosis en esta sección.</p>}
 <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{rows.map(({v,d})=><article key={d.id} className="rounded-lg border border-border bg-muted p-4 space-y-2"><h5 className="font-semibold">{v.nombre} · {d.nombre_dosis}</h5><p className="text-sm">{edad(d,vacunas)}</p>{v.descripcion&&<p className="text-sm text-muted-foreground">{v.descripcion}</p>}
 {d.regla_calendario&&<><p className="text-sm text-muted-foreground">Desde {d.regla_calendario.minMeses} meses{d.regla_calendario.maxMesesExclusivo!=null?` hasta antes de ${d.regla_calendario.maxMesesExclusivo} meses`:''}</p>
 {d.regla_calendario.edadesPorSexo&&<div className="text-sm text-muted-foreground space-y-1"><p>Además, según sexo registrado:</p>{(['F','M'] as const).map(sexo=>{const rango=d.regla_calendario?.edadesPorSexo?.[sexo];return <p key={sexo}>{sexo==='F'?'Femenino':'Masculino'}: {rango?`desde ${rango.minMeses} meses${rango.maxMesesExclusivo!=null?` hasta antes de ${rango.maxMesesExclusivo} meses`:''}`:'fuera del alcance de esta regla'}</p>;})}</div>}
 {d.regla_calendario.tipo==='campana'&&<p className="text-sm">{d.regla_calendario.territorio} · {d.regla_calendario.inicio} a {d.regla_calendario.fin}</p>}
 <p className="text-sm">{d.regla_calendario.habilitada===false?'Deshabilitada':d.regla_calendario.tipo==='campana'?'Sujeta a vigencia y territorio':'Regla configurada'}</p>
 {/^https?:\/\//.test(d.regla_calendario.fuente)&&<a className="text-sm text-primary underline" href={d.regla_calendario.fuente} target="_blank" rel="noreferrer">Consultar fuente</a>}</>}
 </article>)}</div></section>;
 })}</div>;
}
