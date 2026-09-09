import { useState } from 'react';
import api from '../../../lib/api';
import type { Vacuna, ReglaCalendario } from '../../../lib/types';
const clase='w-full rounded-lg border border-border bg-background p-2 text-foreground';
const unidades=['dias','semanas','meses','anios'];
const etiquetas=['Días','Semanas','Meses','Años'];
export default function CalendarioAdmin({vacunas,onGuardado}:{vacunas:Vacuna[];onGuardado:()=>Promise<void>}) {
 const [id,setId]=useState('');const [regla,setRegla]=useState<ReglaCalendario|null>(null);
 const [edad,setEdad]=useState(0),[unidad,setUnidad]=useState('dias'),[margen,setMargen]=useState(30);
 const [guardando,setGuardando]=useState(false),[mensaje,setMensaje]=useState(''),[error,setError]=useState('');
 const dosis=vacunas.flatMap(v=>v.dosis.map(d=>({...d,vacunaNombre:v.nombre})));
 const elegida=dosis.find(d=>String(d.id)===id);
 function seleccionar(value:string){
  setId(value);setError('');setMensaje('');const d=dosis.find(d=>String(d.id)===value);
  if(!d){setRegla(null);return;}
  setEdad(d.edad_recomendada_valor??d.edad_recomendada_dias);setUnidad(d.edad_recomendada_unidad??'dias');setMargen(d.tolerancia_dias);
  setRegla({...d.regla_calendario,tipo:d.regla_calendario?.tipo??'regular',fuente:d.regla_calendario?.fuente??'',minMeses:d.regla_calendario?.minMeses??0,
   habilitada:d.regla_calendario?.habilitada??Boolean(d.regla_calendario),version:d.regla_calendario?.version??0,programacion:d.regla_calendario?.programacion??{base:'nacimiento'}});
 }
 function cambiar(data:Partial<ReglaCalendario>){setRegla(r=>r?{...r,...data}:null);setMensaje('');}
 async function guardar(event:React.FormEvent){event.preventDefault();if(!regla||guardando)return;setGuardando(true);setError('');setMensaje('');
  try {const {data}=await api.put(`/vacunas/dosis/${id}/calendario`,{regla,version:regla.version??0,edadValor:edad,edadUnidad:unidad,toleranciaDias:margen});
   setRegla(data.data.regla_calendario);setMensaje('Regla guardada y auditada.'+(data.data.advertencias?.length?' '+data.data.advertencias.join(' '):''));
   try {await onGuardado();}catch {setMensaje('Regla guardada. Recargue la página para actualizar el listado.');}
  }catch(e:any){setError(e.response?.data?.message||'No se pudo guardar la regla');}finally{setGuardando(false);}
 }
 return <section className="bg-card rounded-xl border border-border p-6 space-y-4">
  <h4 className="text-lg font-bold">Reglas del calendario y campañas</h4>
  <p className="text-sm text-muted-foreground">Configure cada dosis según su documento de referencia. La edad máxima no se incluye. Para una nueva temporada, cree una dosis distinta y conserve las anteriores.</p>
  <label className="block">Dosis a configurar<select className={clase} value={id} disabled={guardando} onChange={e=>seleccionar(e.target.value)}><option value="">Seleccione una dosis</option>{dosis.map(d=><option key={d.id} value={d.id}>{d.vacunaNombre} · {d.nombre_dosis}</option>)}</select></label>
  {regla&&<form onSubmit={guardar} className="space-y-4"><fieldset disabled={guardando} className="space-y-4">
   <div className="grid md:grid-cols-2 gap-4">
    <label>Tipo<select aria-label="Tipo" className={clase} value={regla.tipo} onChange={e=>cambiar({tipo:e.target.value as ReglaCalendario['tipo']})}><option value="regular">Regular</option><option value="campana">Campaña temporal</option></select></label>
    <label>Fuente oficial<input type="url" required maxLength={1000} className={clase} value={regla.fuente} onChange={e=>cambiar({fuente:e.target.value})}/></label>
    <label>Edad mínima (meses)<input type="number" min="0" max="1800" required className={clase} value={regla.minMeses} onChange={e=>cambiar({minMeses:Number(e.target.value)})}/></label>
    <label>Edad máxima, sin incluir (meses)<input type="number" min={regla.minMeses+1} max="1800" className={clase} value={regla.maxMesesExclusivo??''} placeholder="Sin límite configurado" onChange={e=>cambiar({maxMesesExclusivo:e.target.value===''?null:Number(e.target.value)})}/></label>
   </div>
   {regla.tipo==='campana'&&<div className="grid md:grid-cols-3 gap-4">
    <label>Inicio<input type="date" required className={clase} value={regla.inicio??''} onChange={e=>cambiar({inicio:e.target.value})}/></label>
    <label>Fin (incluido)<input type="date" required min={regla.inicio} className={clase} value={regla.fin??''} onChange={e=>cambiar({fin:e.target.value})}/></label>
    <label>Territorio<select aria-label="Territorio" required className={clase} value={regla.territorio??''} onChange={e=>cambiar({territorio:e.target.value})}><option value="">Seleccione</option>{['Bolivia','Beni','Chuquisaca','Cochabamba','La Paz','Oruro','Pando','Potosí','Santa Cruz','Tarija'].map(t=><option key={t}>{t}</option>)}</select></label>
   </div>}
   <label className="block">Programar desde<select className={clase} value={regla.programacion?.base??'nacimiento'} onChange={e=>cambiar({programacion:{base:e.target.value as 'nacimiento'|'contacto'|'dosis_previa'}})}><option value="nacimiento">Nacimiento</option><option value="contacto">Evaluación al contacto</option><option value="dosis_previa">Aplicación de una dosis anterior</option></select></label>
   {regla.programacion?.base==='dosis_previa'&&<div className="grid md:grid-cols-3 gap-4">
    <label>Dosis anterior<select required className={clase} value={regla.programacion.dosisId??''} onChange={e=>cambiar({programacion:{...regla.programacion!,dosisId:Number(e.target.value)}})}><option value="">Seleccione</option>{dosis.filter(d=>d.id!==elegida?.id&&d.vacuna_id===elegida?.vacuna_id).map(d=><option key={d.id} value={d.id}>{d.nombre_dosis}</option>)}</select></label>
    <label>Intervalo<input type="number" required min="1" max="10000" className={clase} value={regla.programacion.valor??''} onChange={e=>cambiar({programacion:{...regla.programacion!,valor:Number(e.target.value)}})}/></label>
    <label>Unidad del intervalo<select required className={clase} value={regla.programacion.unidad??''} onChange={e=>cambiar({programacion:{...regla.programacion!,unidad:e.target.value}})}><option value="">Seleccione</option>{unidades.map((u,i)=><option key={u} value={u}>{etiquetas[i]}</option>)}</select></label>
   </div>}
   {regla.programacion?.base==='nacimiento'&&<div className="grid md:grid-cols-2 gap-4"><label>Edad recomendada<input type="number" min="0" max="60000" required className={clase} value={edad} onChange={e=>setEdad(Number(e.target.value))}/></label><label>Unidad de edad<select className={clase} value={unidad} onChange={e=>setUnidad(e.target.value)}>{unidades.map((u,i)=><option key={u} value={u}>{etiquetas[i]}</option>)}</select></label></div>}
   <label className="block">Margen de seguimiento (días)<input type="number" min="0" max="3650" required className={clase} value={margen} onChange={e=>setMargen(Number(e.target.value))}/></label>
   <label className="flex gap-2 items-start"><input type="checkbox" checked={regla.habilitada===true} onChange={e=>cambiar({habilitada:e.target.checked})}/>Habilitar esta regla para programación y alertas conforme a la fuente indicada.</label>
   <button className="rounded-lg bg-primary text-primary-foreground px-4 py-2" type="submit">{guardando?'Guardando…':'Guardar regla'}</button>
  </fieldset></form>}
  {error&&<p role="alert" className="text-red-600">{error}</p>}{mensaje&&<p role="status">{mensaje}</p>}
 </section>;
}
