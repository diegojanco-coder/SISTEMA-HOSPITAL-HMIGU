// Ejecutar manualmente desde una terminal del propietario del proyecto.
// No cambia permisos, no borra locks y no hace push.
const path=require('node:path'),fs=require('node:fs'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function git(args){const r=spawnSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true});if(r.error)throw new Error('No se pudo ejecutar Git.');return r;}
function ejecutar(args){const r=git(args);if(r.status!==0)throw new Error(r.stderr.trim()||'Git no pudo completar la operación.');if(r.stdout.trim())console.log(r.stdout.trim());}
const grupos=[
 {mensaje:'feat: integrar registro de pacientes, calendario PAI y antecedentes',archivos:[
 'backend/src/database/addPatientRegistration.js','backend/src/models/paciente.model.js','backend/src/models/tutor.model.js',
 'backend/src/routes/paciente.routes.js','backend/src/routes/tutor.routes.js','backend/src/services/paciente.service.js','backend/src/services/tutor.service.js',
 'backend/src/services/alerta.service.js','backend/src/utils/contactoPaciente.util.js','backend/test/pacientes.integration.test.js','backend/test/registro-pacientes.integration.test.js',
 'frontend-app/src/app/components/dashboard/PatientFormModal.tsx','frontend-app/src/app/components/dashboard/Tutores.tsx',
 'frontend-app/src/lib/edad-paciente.ts','frontend-app/src/services/pacientes.service.ts','frontend-app/src/services/tutores.service.ts','frontend-app/test/edad-paciente.test.ts','frontend-app/package.json','docs/12-REGISTRO-PACIENTES.md',
 'backend/src/database/checkInstallation.js','backend/src/database/loadVerifiedCatalog.js','backend/src/services/calendario.service.js','backend/src/services/notificacion.service.js','backend/src/utils/elegibilidad.util.js','backend/test/calendario-admin.integration.test.js','backend/test/calendario.test.js','backend/test/catalogo.integration.test.js','backend/test/notificaciones.integration.test.js',
 'backend/src/services/historial.service.js','backend/src/services/validarAplicacion.service.js','backend/test/polio.integration.test.js',
 'backend/src/database/addExternalHistory.js','backend/src/database/schema.sql','backend/src/database/upgrade.js','backend/src/controllers/historial.controller.js','backend/src/routes/historial.routes.js','backend/src/models/historial.model.js',
 'backend/src/services/reporte.service.js','backend/src/services/carnet.service.js','backend/src/utils/pdf.util.js','backend/test/antecedentes.integration.test.js','backend/test/carnet.test.js','backend/test/flujo-http.integration.test.js','backend/test/instalacion.integration.test.js',
 'frontend-app/src/app/components/dashboard/AntecedenteModal.tsx','frontend-app/src/app/components/dashboard/Historial.tsx','frontend-app/src/app/components/dashboard/Pacientes.tsx','frontend-app/src/app/components/shared/HistorialDetalle.tsx','frontend-app/src/services/historial.service.ts','frontend-app/test/antecedentes-browser.cjs','docs/05-CALENDARIO-ADULTOS.md','docs/11-ANTECEDENTES-EXTERNOS.md',
 'frontend-app/src/app/components/dashboard/CalendarioAdmin.tsx','frontend-app/src/app/components/dashboard/Vacunacion.tsx','frontend-app/src/lib/types.ts','frontend-app/test/calendario-browser.cjs','docs/09-CATALOGO-PAI.md']},
 {mensaje:'fix: administrar contrasenas y mostrar errores de dosis',archivos:[
 'backend/src/controllers/usuario.controller.js','backend/src/services/usuario.service.js','backend/test/usuarios-password.integration.test.js',
 'frontend-app/src/app/components/dashboard/Configuracion.tsx','frontend-app/src/app/components/dashboard/PasswordModal.tsx','frontend-app/test/configuracion-browser.cjs']},
 {mensaje:'feat: integrar inicio local y validar respaldo y flujo completo',archivos:[
 'package.json','INICIAR-SISTEMA.cmd','GUARDAR-CAMBIOS.cmd','scripts',
 'backend/.env.example','backend/package.json','backend/src/app.js','backend/src/config/env.js','backend/src/server.js','backend/src/jobs',
 'backend/src/database/verifyBackup.js','backend/src/services/backup.service.js','backend/src/services/backupVerification.service.js','backend/src/middlewares/frontend.middleware.js',
 'backend/test/backup.integration.test.js','backend/test/frontend.integration.test.js','backend/test/jobs.test.js','backend/test/flujo-browser.cjs','backend/test/helpers',
 'frontend-app/src/app/components/dashboard/Pacientes.tsx','README.md','docs/06-ENTREGA.md','docs/07-RESPALDOS.md','docs/08-PRUEBA-INTEGRAL.md','docs/10-INSTALACION-LOCAL.md']}
];
try{
 const repo=git(['rev-parse','--show-toplevel']);if(repo.status!==0||path.resolve(repo.stdout.trim()).toLowerCase()!==root.toLowerCase())throw new Error('La carpeta no coincide con la raíz del repositorio.');
 if(git(['diff','--cached','--quiet']).status!==0)throw new Error('Ya hay cambios preparados en Git. Revise ese contenido antes de ejecutar este archivo.');
 for(const grupo of grupos){
  const files=grupo.archivos.filter(f=>fs.existsSync(path.join(root,f)));
  ejecutar(['add','--',...files]);
  const difference=git(['diff','--cached','--quiet']);
  if(difference.status===0)continue;
  if(difference.status!==1)throw new Error('No se pudo revisar el contenido preparado.');
  ejecutar(['commit','-m',grupo.mensaje]);
 }
 ejecutar(['status','--short']);
 console.log('Commits completados. No se hizo push ni se incluyeron archivos .env privados.');
}catch(e){console.error(e.message);console.error('No cambie los permisos ni borre .git para forzar la operación.');process.exitCode=1;}
