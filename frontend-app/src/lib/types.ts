// Tipos compartidos, reflejan la forma de las respuestas del backend
// (Node.js + Express + MySQL) del Sistema de Vacunación HMGU.

export type Rol = 'administrador' | 'enfermero';

export interface Usuario {
  id: number;
  nombre_completo: string;
  email: string;
  username: string;
  rol: Rol;
  estado: 'activo' | 'inactivo';
  ultimo_login: string | null;
}

export interface SesionUsuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface Tutor {
  id: number;
  nombres: string;
  apellidos: string;
  carnet_identidad: string | null;
  parentesco: 'padre' | 'madre' | 'tutor_legal' | 'otro';
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  estado: 'activo' | 'inactivo';
  es_principal?: number;
}

export interface Paciente {
  identidad_provisional?: number | boolean;
  registro_pendiente?: number | boolean;
  contacto_alertas?: 'paciente' | 'tutor';
  contacto_principal?: { nombre: string; email: string | null; telefono: string | null; origen: 'paciente' | 'tutor' } | null;
  departamento?: string | null;
  es_dependiente?: number;
  email?: string | null;
  id: number;
  codigo_paciente: string;
  nombres: string;
  apellidos: string;
  carnet_identidad: string | null;
  fecha_nacimiento: string;
  sexo: 'M' | 'F';
  direccion: string | null;
  telefono_contacto: string | null;
  estado: 'activo' | 'inactivo';
  edad?: { anios: number; meses: number; dias: number; edadEnDias: number };
  edad_formateada?: string;
  tutores?: Tutor[];
  dosis_aplicadas?: number;
}

export interface ReglaCalendario {
 tipo: 'regular' | 'campana'; fuente: string; habilitada?: boolean; version?: number;
 minMeses: number; maxMesesExclusivo?: number | null; inicio?: string; fin?: string; territorio?: string;
 edadesPorSexo?: Partial<Record<'F' | 'M', {minMeses: number; maxMesesExclusivo: number | null}>>;
 programacion?: {base: 'nacimiento' | 'contacto' | 'dosis_previa'; dosisId?: number; valor?: number; unidad?: string; permitirOtraVacuna?: boolean};
}
export interface Dosis {
 regla_calendario?: ReglaCalendario | null;
 edad_recomendada_valor?: number | null;
 edad_recomendada_unidad?: string | null;
  id: number;
  vacuna_id: number;
  numero_dosis: number;
  nombre_dosis: string;
  edad_recomendada_dias: number;
  tolerancia_dias: number;
  intervalo_minimo_dias: number;
  estado: 'activo' | 'inactivo';
}

export interface Vacuna {
  id: number;
  nombre: string;
  nombre_corto: string;
  descripcion: string | null;
  enfermedad_previene: string | null;
  via_administracion: string;
  estado: 'activo' | 'inactivo';
  dosis: Dosis[];
}

export type EstadoDosis = 'revision' | 'fuera_alcance' | 'aplicada' | 'futura' | 'proxima' | 'pendiente' | 'atrasada';

export interface EsquemaDetalleItem {
  registrable?: boolean;
  dosisId: number;
  vacunaId: number;
  vacunaNombre: string;
  vacunaNombreCorto: string;
  numeroDosis: number;
  nombreDosis: string;
  estado: EstadoDosis;
  fechaRecomendada: string | null;
  fechaLimite: string | null;
  fechaAplicacion: string | null;
  lote: string | null;
}

export interface EsquemaPaciente {
  edad: { anios: number; meses: number; dias: number; edadEnDias: number };
  detalle: EsquemaDetalleItem[];
  resumen: { aplicadas: number; proximas: number; pendientes: number; atrasadas: number; futuras: number };
  estadoGeneral: 'verde' | 'amarillo' | 'rojo' | 'revision';
  advertencia?: string | null;
}

export interface HistorialItem {
  id: number;
  paciente_id: number;
  dosis_id: number;
  fecha_aplicacion: string;
  lote: string | null;
  establecimiento: string;
  observaciones: string | null;
  nombre_dosis: string;
  numero_dosis: number;
  vacuna_nombre: string;
  nombre_corto: string;
  aplicado_por: string | null;
  origen: 'local' | 'externo';
  documento_referencia: string | null;
  registrado_por: string | null;
  lote_vacuna_id?: number | null;
  cita_id?: number | null;
}

export interface Alerta {
  id: number;
  paciente_id: number;
  dosis_id: number;
  estado_semaforo: 'verde' | 'amarillo' | 'rojo';
  fecha_limite: string;
  mensaje: string;
  leida: number;
  nombres: string;
  apellidos: string;
  codigo_paciente: string;
  vacuna_nombre: string;
  nombre_dosis: string;
}

export interface RegistroAuditoria {
  id: number;
  usuario_id: number | null;
  usuario_nombre: string | null;
  accion: string;
  entidad: string;
  entidad_id: number | null;
  ip: string | null;
  created_at: string;
}

export interface Paginado<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}
