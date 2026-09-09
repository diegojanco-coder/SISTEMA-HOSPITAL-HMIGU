const transaction=require('../utils/transaction.util');
const usuarioModel = require('../models/usuario.model');
const { hashPassword } = require('../utils/password.util');

async function listar(filtros) {
  return usuarioModel.findAll(filtros);
}

async function obtener(id) {
  return usuarioModel.findById(id);
}

async function crear(data) {
  const passwordHash = await hashPassword(data.password);
  return usuarioModel.create({ ...data, passwordHash });
}

async function actualizar(id, data) {
  return transaction(async db=>{
    const [usuarios]=await db.query('SELECT id,rol,estado FROM usuarios ORDER BY id FOR UPDATE');
    const actual=usuarios.find(u=>u.id===Number(id));if(!actual)throw Object.assign(new Error('Usuario no encontrado'),{status:404});
    const estado=data.estado??actual.estado;
    if(actual.rol==='administrador' && actual.estado==='activo' && (data.rol!=='administrador'||estado!=='activo') && !usuarios.some(u=>u.id!==actual.id&&u.rol==='administrador'&&u.estado==='activo'))throw Object.assign(new Error('Debe conservar al menos un administrador activo'),{status:422});
    await db.query('UPDATE usuarios SET nombre_completo=?,email=?,username=?,rol=?,estado=? WHERE id=?',[data.nombreCompleto,data.email,data.username,data.rol,estado,id]);
    const [[r]]=await db.query('SELECT id,nombre_completo,email,username,rol,estado FROM usuarios WHERE id=?',[id]);return r;
  });
}

async function cambiarPassword(id, nuevaPassword) {
  const hash = await hashPassword(nuevaPassword);
  return usuarioModel.updatePassword(id, hash);
}

async function desactivar(id) {
  const actual=await usuarioModel.findById(id);
  if(!actual)throw Object.assign(new Error('Usuario no encontrado'),{status:404});
  return actualizar(id,{nombreCompleto:actual.nombre_completo,email:actual.email,username:actual.username,rol:actual.rol,estado:'inactivo'});
}

module.exports = { listar, obtener, crear, actualizar, cambiarPassword, desactivar };
