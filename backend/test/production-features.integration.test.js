process.env.NODE_ENV='test';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {pool}=require('../src/config/db');
const mermaService=require('../src/services/merma.service');
const unificacionService=require('../src/services/unificacionPaciente.service');
const pacienteService=require('../src/services/paciente.service');
const {generarPayloadFirmado}=require('../src/services/carnet.service');
const {enviarWhatsApp,normalizarTelefono}=require('../src/services/notificacion.service');
const originalConnection=pool.getConnection.bind(pool),originalQuery=pool.query.bind(pool);

async function isolated(run){
 const conn=await originalConnection();await conn.beginTransaction();let op=0;
 pool.query=conn.query.bind(conn);
 pool.getConnection=async()=>({query:conn.query.bind(conn),beginTransaction:()=>conn.query(`SAVEPOINT produccion_${++op}`),commit:async()=>{},rollback:()=>conn.query(`ROLLBACK TO SAVEPOINT produccion_${op}`),release:()=>{}});
 try{await run(conn);}finally{pool.query=originalQuery;pool.getConnection=originalConnection;await conn.rollback();conn.release();}
}
after(()=>pool.end());

test('merma descuenta stock y auditoría en una misma operación; rechaza stock insuficiente',()=>isolated(async conn=>{
 const tag=randomBytes(5).toString('hex');
 const [usuario]=await conn.query("INSERT INTO usuarios(nombre_completo,email,username,password_hash,rol) VALUES (?,?,?,'x','enfermero')",['Merma prueba',`${tag}@example.invalid`,`merma${tag}`]);
 const [vacuna]=await conn.query("INSERT INTO vacunas(nombre,nombre_corto,via_administracion) VALUES (?,?, 'IM')",[`Vacuna ${tag}`,`V${tag}`]);
 const [lote]=await conn.query("INSERT INTO lotes_vacuna(vacuna_id,numero_lote,fecha_vencimiento,cantidad_disponible) VALUES (?,?,DATE_ADD(CURDATE(),INTERVAL 1 YEAR),10)",[vacuna.insertId,`L${tag}`]);
 const resultado=await mermaService.registrar({loteId:lote.insertId,cantidadDosisPerdidas:3,motivo:'rotura_accidental',observaciones:'Prueba'},{usuarioId:usuario.insertId});
 assert.equal(resultado.cantidadDisponible,7);
 assert.equal((await conn.query('SELECT cantidad_disponible FROM lotes_vacuna WHERE id=?',[lote.insertId]))[0][0].cantidad_disponible,7);
 assert.equal((await conn.query("SELECT COUNT(*) total FROM auditoria WHERE entidad='mermas_lote' AND entidad_id=?",[resultado.id]))[0][0].total,1);
 await assert.rejects(mermaService.registrar({loteId:lote.insertId,cantidadDosisPerdidas:8,motivo:'otro'},{usuarioId:usuario.insertId}),error=>error.status===409);
}));

test('certificado de nacimiento duplicado se detecta antes de insertar',()=>isolated(async()=>{
 const certificado=`CN-${randomBytes(6).toString('hex')}`;
 const base={nombres:'Persona',apellidos:'Temporal',fechaNacimiento:'1990-01-01',sexo:'F',telefonoContacto:'70000000',email:'persona@example.invalid',certificadoNacimiento:certificado};
 await pacienteService.crear(base);
 await assert.rejects(pacienteService.crear({...base,nombres:'Duplicada'}),error=>error.status===409 && /Ya existe/.test(error.message));
}));

test('unificación mueve citas y alertas y desactiva el perfil origen',()=>isolated(async conn=>{
 const tag=randomBytes(5).toString('hex');
 const [usuario]=await conn.query("INSERT INTO usuarios(nombre_completo,email,username,password_hash,rol) VALUES (?,?,?,'x','administrador')",['Admin merge',`merge${tag}@example.invalid`,`merge${tag}`]);
 const [origen]=await conn.query("INSERT INTO pacientes(codigo_paciente,nombres,apellidos,fecha_nacimiento,sexo) VALUES (?,'Origen','Prueba','1990-01-01','F')",[`ORI-${tag}`]);
 const [destino]=await conn.query("INSERT INTO pacientes(codigo_paciente,nombres,apellidos,fecha_nacimiento,sexo) VALUES (?,'Destino','Prueba','1990-01-01','F')",[`DES-${tag}`]);
 const [[dosis]]=await conn.query("SELECT d.id FROM dosis d JOIN vacunas v ON v.id=d.vacuna_id WHERE d.estado='activo' AND v.estado='activo' LIMIT 1");
 await conn.query('INSERT INTO citas(paciente_id,usuario_id) VALUES (?,?)',[origen.insertId,usuario.insertId]);
 await conn.query("INSERT INTO alertas(paciente_id,dosis_id,estado_semaforo,estado_dosis,fecha_limite,mensaje) VALUES (?,?,'amarillo','pendiente',CURDATE(),'Prueba')",[origen.insertId,dosis.id]);
 const resultado=await unificacionService.unificar(origen.insertId,destino.insertId,{usuarioId:usuario.insertId});
 assert.equal(resultado.movidos.citas,1);assert.equal(resultado.movidos.alertas,1);
 assert.equal((await conn.query('SELECT paciente_id FROM citas WHERE paciente_id=?',[destino.insertId]))[0].length,1);
 assert.equal((await conn.query('SELECT estado FROM pacientes WHERE id=?',[origen.insertId]))[0][0].estado,'inactivo');
}));

test('QR usa JSON con HMAC completo y WhatsApp opera en modo MOCK sin clave',async()=>{
 const payload=generarPayloadFirmado('HMIGU-2026-0001','2026-10-01');
 assert.deepEqual(Object.keys(payload),['cod_paciente','hash_validacion','fecha_emision']);
 assert.match(payload.hash_validacion,/^[a-f0-9]{64}$/);
 assert.equal(normalizarTelefono('70000000'),'59170000000');
 assert.deepEqual(await enviarWhatsApp({to:'59170000000',message:'Prueba HMGU'}),{mock:true});
});
