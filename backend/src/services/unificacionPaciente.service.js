const { pool } = require('../config/db');
const auditoriaModel = require('../models/auditoria.model');

class UnificacionError extends Error {
  constructor(message, status = 422) { super(message); this.status = status; }
}

async function unificar(origenId, destinoId, contexto) {
  origenId=Number(origenId);destinoId=Number(destinoId);
  if(!Number.isInteger(origenId)||!Number.isInteger(destinoId)||origenId<1||destinoId<1||origenId===destinoId)
    throw new UnificacionError('Seleccione dos pacientes distintos');
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const ids=[origenId,destinoId].sort((a,b)=>a-b);
    const [pacientes]=await conn.query('SELECT * FROM pacientes WHERE id IN (?,?) ORDER BY id FOR UPDATE',ids);
    const origen=pacientes.find(p=>p.id===origenId),destino=pacientes.find(p=>p.id===destinoId);
    if(!origen||!destino)throw new UnificacionError('Uno de los pacientes no existe',404);
    if(origen.estado!=='activo'||destino.estado!=='activo')throw new UnificacionError('Ambos pacientes deben estar activos',409);
    const [conflictos]=await conn.query(`SELECT ho.dosis_id FROM historial_vacunacion ho
      JOIN historial_vacunacion hd ON hd.paciente_id=? AND hd.dosis_id=ho.dosis_id
      WHERE ho.paciente_id=? LIMIT 1`,[destinoId,origenId]);
    if(conflictos.length)throw new UnificacionError('Los pacientes tienen una misma dosis registrada. Revise el historial clínico antes de unificar.',409);

    const [historial]=await conn.query('UPDATE historial_vacunacion SET paciente_id=? WHERE paciente_id=?',[destinoId,origenId]);
    const [citas]=await conn.query('UPDATE citas SET paciente_id=? WHERE paciente_id=?',[destinoId,origenId]);
    await conn.query(`DELETE ao FROM alertas ao JOIN alertas ad ON ad.paciente_id=? AND ad.dosis_id=ao.dosis_id WHERE ao.paciente_id=?`,[destinoId,origenId]);
    const [alertas]=await conn.query('UPDATE alertas SET paciente_id=? WHERE paciente_id=?',[destinoId,origenId]);
    await conn.query(`DELETE po FROM paciente_tutor po JOIN paciente_tutor pd ON pd.paciente_id=? AND pd.tutor_id=po.tutor_id WHERE po.paciente_id=?`,[destinoId,origenId]);
    const [tutores]=await conn.query('UPDATE paciente_tutor SET paciente_id=? WHERE paciente_id=?',[destinoId,origenId]);
    await conn.query('UPDATE notificaciones_email SET paciente_id=? WHERE paciente_id=?',[destinoId,origenId]);
    await conn.query("UPDATE pacientes SET estado='inactivo' WHERE id=?",[origenId]);
    const movidos={historial:historial.affectedRows,citas:citas.affectedRows,alertas:alertas.affectedRows,tutores:tutores.affectedRows};
    await auditoriaModel.create({usuarioId:contexto.usuarioId,accion:'EDITAR',entidad:'pacientes',entidadId:destinoId,
      datosPrevios:{pacienteOrigen:origen.codigo_paciente,pacienteDestino:destino.codigo_paciente},
      datosNuevos:{operacion:'unificacion',pacienteOrigenDesactivado:origenId,movidos},ip:contexto.ip,userAgent:contexto.userAgent},conn);
    await conn.commit();
    return {origenId,destinoId,pacienteOrigen:origen.codigo_paciente,pacienteDestino:destino.codigo_paciente,movidos};
  }catch(error){await conn.rollback();throw error;}finally{conn.release();}
}

module.exports={unificar,UnificacionError};
