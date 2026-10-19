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

const SEED_INCIDENCES_2704014: MockIncidenceEntry[] = [
  {
    id: "inc-2704014-0001",
    numeroCorrelativo: 1,
    proyectoId: "p-2704014",
    tipoIncidencia: "CONSULTA_TECNICA",
    titulo: "INICIO DE LA ELABORACIÓN DEL EXPEDIENTE TÉCNICO",
    contenido: "Fecha: 16 de octubre de 2026. En la fecha, se deja constancia del Inicio de la fase de elaboración del Expediente Técnico del proyecto \"Mejoramiento y ampliación del servicio de interpretación cultural en Museo Tumbas Reales de Sipán\", con CUI N.° 2704014, bajo la modalidad de Obras por Impuestos, con un plazo de ciento veinte (120) días calendario, conforme a las condiciones contractuales aplicables. Habiéndose realizado el acceso al terreno el 15 de octubre de 2026, se da inicio a las actividades técnicas, coordinaciones y estudios necesarios para la elaboración del Expediente Técnico, de acuerdo con el cronograma establecido y la normativa vigente. Se solicita a la Entidad Deudora/Supervisora efectuar el seguimiento correspondiente, a fin de garantizar el cumplimiento de los plazos y las condiciones contractuales.",
    fechaHora: "16/10/2026 17:57",
    autorNombre: "ROBERTO CARLOS CHAPOÑAN FARROÑAN",
    autorCargo: "SUPERVISOR_DE_PROYECTO",
    autorCIP: "CIP-107596",
    estadoGestion: "Asiento Informativo (Sin acción requerida)",
    plazoDiasRespuesta: 10,
    adjuntos: [],
  },
  {
    id: "inc-2704014-0002",
    numeroCorrelativo: 2,
    proyectoId: "p-2704014",
    tipoIncidencia: "CONSULTA_TECNICA",
    titulo: "INICIADO EL PLAZO CONTRACTUAL PARA LA ELABORACION DEL EXPEDIENTE TECNICO",
    contenido: "EL QUE SUSCRIBE, EN CALIDAD DE SUPERVISOR DE LA ELABORACION DEL EXPEDIENTE TECNICO, EN COMPAÑIA DEL PLANTEL TECNICO DE CONSORCIO TUMBAS REALES, HA REALIZADO EL RECORRIDO DEL TERRENO Y HA SUSCRITO CON FECHA 15 DE OCTUBRE DE 2026 EL ACTA DE ACCESO AL TERRENO, SIN OBSERVACIONES, HABIENDOSE CUMPLIDO CON LOS REQUISITOS NECESARIOS, CON FECHA 16 OCTUBRE DE 2016 SE HA INICIADO EL PLAZO CONTRACTUAL, PARA LA ELABORACION DEL EXPEDIENTE TECNICO DEL PROYECTO: \"MEJORAMIENTO Y AMPLIACIÓN DEL SERVICIO DE INTERPRETACIÓN CULTURAL EN MUSEO TUMBAS REALES DE SIPÁN\", SE INDICA AL JEFE DE PROYECTO, QUE DE CONFORMIDAD CON LOS TERMINOS DE REFERENCIA EL PLAZO MAXIMO PARA LA PRESENTACION DEL PRIMER ENTREGABLE - PLAN DE TRABAJO, ES DE 03 DIAS CALENDARIOS, TENIENDO COMO FECHA MAXIMA EL DIA DOMINGO 18 DE OCTUBRE DE 2026; ASIMISMO SE SOLICITA ADJUNTAR LOS CERTIFICADOS DE HABILIDAD DEL PLANTEL TECNICO, SE DEJA CONSTANCIA, QUE LA SUPERVISION DA INICIO AL SEGUIMIENTO Y CONTROL DE LAS LABORES REALIZADAS EN LA ELABORACION DEL EXPEDIENTE TECNICO",
    fechaHora: "19/10/2026 09:21",
    autorNombre: "ROBERTO CARLOS CHAPOÑAN FARROÑAN",
    autorCargo: "SUPERVISOR_DE_PROYECTO",
    autorCIP: "CIP-107596",
    estadoGestion: "Asiento Informativo (Sin acción requerida)",
    plazoDiasRespuesta: 10,
    adjuntos: [],
  },
];

export const INITIAL_INCIDENCES: Record<string, MockIncidenceEntry[]> = {
  "p-2704014": SEED_INCIDENCES_2704014,
  "2704014": SEED_INCIDENCES_2704014,
};

