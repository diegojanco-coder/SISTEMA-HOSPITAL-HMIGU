import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { listarLotesDisponibles, type LoteDisponible } from '../../../services/lotes.service';
import type { Vacuna } from '../../../lib/types';
const clase='w-full rounded-lg border border-border bg-background p-2 text-foreground';
function hoyLocal(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export default function LotesAdmin({vacunas}:{vacunas:Vacuna[]}){
 const [vacunaId,setVacunaId]=useState(''),[numero,setNumero]=useState(''),[fecha,setFecha]=useState(''),[cantidad,setCantidad]=useState('');
 const [lotes,setLotes]=useState<LoteDisponible[]>([]),[revision,setRevision]=useState(0),[cargando,setCargando]=useState(false),[guardando,setGuardando]=useState(false);
 const [error,setError]=useState(''),[errorLista,setErrorLista]=useState(''),[mensaje,setMensaje]=useState('');
 useEffect(()=>{let vigente=true;setLotes([]);setErrorLista('');if(!vacunaId){setCargando(false);return;}
  setCargando(true);listarLotesDisponibles(vacunaId).then(r=>{if(vigente)setLotes(r);}).catch(()=>{if(vigente)setErrorLista('No se pudieron cargar los lotes.');}).finally(()=>{if(vigente)setCargando(false);});return()=>{vigente=false;};
 },[vacunaId,revision]);
 async function guardar(e:React.FormEvent){e.preventDefault();if(guardando)return;setError('');setMensaje('');setGuardando(true);
  try{await api.post('/lotes',{vacunaId:Number(vacunaId),numeroLote:numero,fechaVencimiento:fecha,cantidadDisponible:Number(cantidad)});setNumero('');setFecha('');setCantidad('');setRevision(v=>v+1);setMensaje('Lote registrado. El stock ya está disponible para vacunación.');}
  catch(e:any){setError(e.response?.data?.errors?.map((x:any)=>x.mensaje).filter(Boolean).join(' ')||e.response?.data?.message||'No se pudo registrar el lote');}finally{setGuardando(false);}
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
 </section>;
}
