export interface MockProject {
  id: string;
  cui: string;
  nombre: string;
  nConvenio: string;
  modalidad: string;
  fase: string;
  entidadEjecutora: string;
  entidadSupervisora?: string;
  montoInversion?: string | number | null;
  monto?: string | number | null;
  plazoDias?: string | number | null;
  plazo?: string | number | null;
  fechaInicio?: string | null;
  distrito?: string | null;
  localidad?: string | null;
  residenteNombre: string | null;
  residenteCIP: string | null;
  residenteDni?: string | null;
  residenteCelular?: string | null;
  residenteEmail?: string | null;
  supervisorNombre: string | null;
  supervisorCIP: string | null;
  supervisorDni?: string | null;
  supervisorEmpresa?: string | null;
  supervisorEmail?: string | null;
  estado: 'ACTIVO' | 'PAUSADO' | 'CONCLUIDO';
  provincia: string;
  estadoObra: string;
  asientosCount?: number;
  archivado?: boolean;
  fechaArchivado?: string;
  archivadoPor?: string;
}

export interface MockIncidenceEntry {
  id: string;
  numeroCorrelativo: number;
  proyectoId: string;
  tipoIncidencia: 'RIESGO' | 'CONSULTA_TECNICA' | 'OBSERVACION' | 'INFORMATIVO' | 'MODIFICACION_ESTRUCTURAL';
  titulo: string;
  contenido: string;
  fechaHora: string;
  autorNombre: string;
  autorCargo: string;
  autorCIP?: string | null;
  esRespuestaDeId?: string | null;
  estadoGestion: string;
  plazoDiasRespuesta?: number | null;
  adjuntos: { id: string; nombreArchivo: string; urlArchivo: string; tipo: string }[];
  solicitudEdicionPendiente?: boolean;
  motivoSolicitudEdicion?: string;
  solicitanteEdicionNombre?: string;
  edicionPermitida?: boolean;
  editado?: boolean;
  fechaUltimaEdicion?: string;
}

export const INITIAL_PROJECTS: MockProject[] = [];

export const INITIAL_INCIDENCES: Record<string, MockIncidenceEntry[]> = {};

