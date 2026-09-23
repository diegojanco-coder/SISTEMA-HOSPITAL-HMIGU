import { useState } from 'react';
import api from '../../../lib/api';
import type { Usuario } from '../../../lib/types';

const input='block w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 mt-1';
export default function PasswordModal({usuario,onClose,onSaved}:{usuario:Usuario;onClose:()=>void;onSaved:()=>void}){
 const [password,setPassword]=useState(''),[confirmacion,setConfirmacion]=useState('');
 const [guardando,setGuardando]=useState(false),[error,setError]=useState('');
 async function guardar(e:React.FormEvent){
  e.preventDefault();if(guardando)return;setError('');
  if(!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,20}$/.test(password)){setError('Use entre 8 y 20 caracteres, una mayúscula, una minúscula y un número.');return;}
  if(password!==confirmacion){setError('Las contraseñas no coinciden.');return;}
  setGuardando(true);
  try{await api.patch(`/usuarios/${usuario.id}/password`,{password});setPassword('');setConfirmacion('');onSaved();}
  catch(e:any){setError(e.response?.data?.message||'No se pudo cambiar la contraseña. Intente nuevamente.');}
  finally{setGuardando(false);}
 }
 return <div role="dialog" aria-modal="true" aria-labelledby="password-title" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
  <div className="bg-card rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
   <h3 id="password-title" className="text-xl font-bold">Cambiar contraseña</h3>
   <p className="my-3 break-words">Usuario: {usuario.nombre_completo} ({usuario.username})</p>
   <p id="password-help" className="text-sm text-muted-foreground mb-4">Use entre 8 y 20 caracteres, una mayúscula, una minúscula y un número.</p>
   <form onSubmit={guardar}>
    {error&&<p role="alert" className="text-red-600 mb-3">{error}</p>}
    <fieldset disabled={guardando} className="space-y-4">
     <label className="block">Nueva contraseña<input type="password" required autoComplete="new-password" minLength={8} maxLength={20} aria-describedby="password-help" className={input} value={password} onChange={e=>setPassword(e.target.value)}/></label>
     <label className="block">Confirmar nueva contraseña<input type="password" required autoComplete="new-password" minLength={8} maxLength={20} className={input} value={confirmacion} onChange={e=>setConfirmacion(e.target.value)}/></label>
     <div className="flex flex-wrap justify-end gap-3 pt-3">
      <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2">Cancelar</button>
      <button type="submit" className="rounded-lg bg-primary text-primary-foreground px-4 py-2">{guardando?'Guardando…':'Guardar contraseña'}</button>
     </div>
    </fieldset>
   </form>
  </div>
 </div>;
}
