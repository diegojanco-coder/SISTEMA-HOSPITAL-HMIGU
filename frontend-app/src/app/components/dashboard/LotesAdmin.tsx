import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { listarLotesDisponibles, registrarMerma, type LoteDisponible, type MotivoMerma } from '../../../services/lotes.service';
import type { Vacuna } from '../../../lib/types';
const clase='w-full rounded-lg border border-border bg-background p-2 text-foreground';
function hoyLocal(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export default function LotesAdmin({vacunas}:{vacunas:Vacuna[]}){
 const [vacunaId,setVacunaId]=useState(''),[numero,setNumero]=useState(''),[fecha,setFecha]=useState(''),[cantidad,setCantidad]=useState('');
 const [lotes,setLotes]=useState<LoteDisponible[]>([]),[revision,setRevision]=useState(0),[cargando,setCargando]=useState(false),[guardando,setGuardando]=useState(false);
 const [error,setError]=useState(''),[errorLista,setErrorLista]=useState(''),[mensaje,setMensaje]=useState('');
 const [loteMerma,setLoteMerma]=useState(''),[cantidadMerma,setCantidadMerma]=useState(''),[motivo,setMotivo]=useState<MotivoMerma>('frasco_abierto_vencido'),[observaciones,setObservaciones]=useState(''),[guardandoMerma,setGuardandoMerma]=useState(false);
 useEffect(()=>{let vigente=true;setLotes([]);setErrorLista('');if(!vacunaId){setCargando(false);return;}
  setCargando(true);listarLotesDisponibles(vacunaId).then(r=>{if(vigente)setLotes(r);}).catch(()=>{if(vigente)setErrorLista('No se pudieron cargar los lotes.');}).finally(()=>{if(vigente)setCargando(false);});return()=>{vigente=false;};
 },[vacunaId,revision]);
 async function guardar(e:React.FormEvent){e.preventDefault();if(guardando)return;setError('');setMensaje('');setGuardando(true);
  try{await api.post('/lotes',{vacunaId:Number(vacunaId),numeroLote:numero,fechaVencimiento:fecha,cantidadDisponible:Number(cantidad)});setNumero('');setFecha('');setCantidad('');setRevision(v=>v+1);setMensaje('Lote registrado. El stock ya está disponible para vacunación.');}
  catch(e:any){setError(e.response?.data?.errors?.map((x:any)=>x.mensaje).filter(Boolean).join(' ')||e.response?.data?.message||'No se pudo registrar el lote');}finally{setGuardando(false);}
 }
 async function guardarMerma(e:React.FormEvent){e.preventDefault();if(guardandoMerma)return;setError('');setMensaje('');setGuardandoMerma(true);
  try{await registrarMerma({loteId:Number(loteMerma),cantidadDosisPerdidas:Number(cantidadMerma),motivo,observaciones});setLoteMerma('');setCantidadMerma('');setObservaciones('');setRevision(v=>v+1);setMensaje('Merma registrada. El descuento de stock y la auditoría fueron guardados.');}
  catch(e:any){setError(e.response?.data?.errors?.map((x:any)=>x.mensaje).filter(Boolean).join(' ')||e.response?.data?.message||'No se pudo registrar la merma');}finally{setGuardandoMerma(false);}
 }
 return <section className="rounded-xl border border-border bg-card p-6 space-y-4"><h4 className="font-bold text-lg">Ingreso de lotes y stock</h4>
 <p className="text-sm text-muted-foreground">Registre el número, vencimiento y cantidad del lote recibido. No se agrega stock de demostración automáticamente.</p>
 <form onSubmit={guardar}><fieldset disabled={guardando} className="space-y-4"><div className="grid md:grid-cols-2 gap-4">
  <label>Vacuna del lote<select aria-label="Vacuna del lote" className={clase} required value={vacunaId} onChange={e=>{setVacunaId(e.target.value);setMensaje('');setError('');}}><option value="">Seleccione una vacuna</option>{vacunas.filter(v=>v.estado!=='inactivo').map(v=><option key={v.id} value={v.id}>{v.nombre}</option>)}</select></label>
  <label>Número de lote<input className={clase} required maxLength={50} pattern="[A-Za-z0-9]+" title="Solo letras y números" value={numero} onChange={e=>setNumero(e.target.value)}/></label>
  <label>Vencimiento del lote<input type="date" required min={hoyLocal()} className={clase} value={fecha} onChange={e=>setFecha(e.target.value)}/></label>
  <label>Unidades recibidas<input type="number" required min="1" max="2147483647" step="1" className={clase} value={cantidad} onChange={e=>setCantidad(e.target.value)}/></label>
 </div><button className="rounded-lg bg-primary text-primary-foreground px-4 py-2" type="submit">{guardando?'Guardando…':'Registrar lote'}</button></fieldset></form>
 {error&&<p role="alert" className="text-red-600">{error}</p>}{mensaje&&<p role="status">{mensaje}</p>}
 {vacunaId&&<div className="space-y-2"><h5 className="font-semibold">Lotes vigentes con stock</h5>{cargando&&<p>Cargando…</p>}{errorLista&&<p role="alert">{errorLista} <button className="underline" onClick={()=>setRevision(v=>v+1)}>Reintentar lotes</button></p>}
 {!cargando&&!errorLista&&!lotes.length&&<p className="text-muted-foreground text-sm">No hay lotes disponibles para esta vacuna.</p>}
 {lotes.map(l=><div key={l.id} className="rounded-lg border border-border p-3 text-sm">Lote {l.numero_lote} · {l.cantidad_disponible} unidades · Vence {String(l.fecha_vencimiento).slice(0,10)}</div>)}</div>}
 {lotes.length>0&&<form onSubmit={guardarMerma} className="space-y-4 rounded-xl border border-amber-300/60 bg-amber-50/50 p-4 dark:bg-amber-950/20"><h5 className="font-semibold">Registrar merma de vacunas</h5><p className="text-sm text-muted-foreground">El descuento es transaccional: no permitirá superar el stock y quedará en auditoría.</p><fieldset disabled={guardandoMerma} className="grid gap-4 md:grid-cols-2">
  <label>Lote afectado<select className={clase} required value={loteMerma} onChange={e=>setLoteMerma(e.target.value)}><option value="">Seleccione un lote</option>{lotes.map(l=><option key={l.id} value={l.id}>{l.numero_lote} ({l.cantidad_disponible} dosis)</option>)}</select></label>
  <label>Dosis perdidas<input className={clase} type="number" min="1" max={lotes.find(l=>String(l.id)===loteMerma)?.cantidad_disponible||1} required value={cantidadMerma} onChange={e=>setCantidadMerma(e.target.value)}/></label>
  <label>Motivo<select className={clase} value={motivo} onChange={e=>setMotivo(e.target.value as MotivoMerma)}><option value="frasco_abierto_vencido">Frasco abierto vencido</option><option value="rotura_accidental">Rotura accidental</option><option value="falla_cadena_frio">Falla de cadena de frío</option><option value="otro">Otro</option></select></label>
  <label>Observaciones<textarea className={clase} maxLength={1000} value={observaciones} onChange={e=>setObservaciones(e.target.value)}/></label>
  <button className="rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white md:col-span-2" type="submit">{guardandoMerma?'Registrando…':'Confirmar merma y descontar stock'}</button>
 </fieldset></form>}
 </section>;
}
