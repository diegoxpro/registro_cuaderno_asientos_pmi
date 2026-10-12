export interface MockProject {
  id: string;
  cui: string;
  nombre: string;
  nConvenio: string;
  modalidad: string;
  fase: string;
  entidadEjecutora: string;
  entidadSupervisora?: string;
  residenteNombre: string | null;
  residenteCIP: string | null;
  supervisorNombre: string | null;
  supervisorCIP: string | null;
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

export const INITIAL_PROJECTS: MockProject[] = [
  {
    id: 'p-2548912',
    cui: '2548912',
    nombre: 'MEJORAMIENTO DEL SERVICIO DE SALUD DEL HOSPITAL PROVINCIAL DE FERREÑAFE, DISTRITO Y PROVINCIA DE FERREÑAFE - LAMBAYEQUE',
    nConvenio: 'CONVENIO OXI-004-2025-GR.LAMB',
    modalidad: 'OXI LEY 29230',
    fase: 'Ejecución Física',
    entidadEjecutora: 'Cosapi S.A. / Banco de Crédito del Perú S.A.',
    entidadSupervisora: 'Cesel S.A. Ingenieros Consultores',
    residenteNombre: 'Ing. Juan Pérez Valdivia',
    residenteCIP: 'CIP-234891',
    supervisorNombre: 'Ing. María Torres Ugarte',
    supervisorCIP: 'CIP-198273',
    estado: 'ACTIVO',
    provincia: 'Ferreñafe',
    estadoObra: 'En Ejecución Física (Avance 42.5%)',
    asientosCount: 4,
  },
  {
    id: 'p-2419083',
    cui: '2419083',
    nombre: 'CREACIÓN DEL SERVICIO DE TRANSITABILIDAD VIAL EN LA AV. CHINCHAYSUYO (TRAMO AV. GRAU - AV. PANAMERICANA SUR), DISTRITO DE CHICLAYO',
    nConvenio: 'CONVENIO OXI-008-2024-GR.LAMB',
    modalidad: 'OXI LEY 29230',
    fase: 'Expediente Técnico',
    entidadEjecutora: 'Interbank S.A.A. / Constructora del Norte S.A.C.',
    entidadSupervisora: 'Empresa Supervisora del Norte S.A.C.',
    residenteNombre: 'Ing. Roberto Gómez Bolaños',
    residenteCIP: 'CIP-145672',
    supervisorNombre: 'Empresa Supervisora del Norte S.A.C.',
    supervisorCIP: 'CIP-998877',
    estado: 'ACTIVO',
    provincia: 'Chiclayo',
    estadoObra: 'Elaboración de Expediente Técnico',
    asientosCount: 2,
  },
  {
    id: 'p-2398124',
    cui: '2398124',
    nombre: 'MEJORAMIENTO Y AMPLIACIÓN DEL SERVICIO EDUCATIVO DE LA I.E. N° 10059 CORAZÓN DE JESÚS, DISTRITO DE ILLIMO, PROVINCIA DE LAMBAYEQUE',
    nConvenio: 'CONVENIO OXI-012-2023-GR.LAMB',
    modalidad: 'OXI LEY 29230',
    fase: 'Ejecución Física',
    entidadEjecutora: 'Cámara de Comercio de Lambayeque',
    entidadSupervisora: 'Consultores & Asesores de Ingeniería E.I.R.L.',
    residenteNombre: null,
    residenteCIP: null,
    supervisorNombre: null,
    supervisorCIP: null,
    estado: 'ACTIVO',
    provincia: 'Lambayeque',
    estadoObra: 'Pendiente Asignación de Supervisión',
    asientosCount: 0,
  },
  {
    id: 'p-2704014',
    cui: '2704014',
    nombre: 'MEJORAMIENTO Y AMPLIACIÓN DEL SERVICIO DE INTERPRETACIÓN CULTURAL EN MUSEO TUMBAS REALES DE SIPÁN DISTRITO DE LAMBAYEQUE DE LA PROVINCIA DE LAMBAYEQUE DEL DEPARTAMENTO DE LAMBAYEQUE',
    nConvenio: 'CONVENIO OXI-015-2025-GR.LAMB',
    modalidad: 'OXI LEY 29230',
    fase: 'Ejecución Física',
    entidadEjecutora: 'CONSORCIO FINANCISTA TUMBAS REALES',
    entidadSupervisora: 'Supervisión Sipán S.A.C.',
    residenteNombre: 'JUAN ROLA PEREZ',
    residenteCIP: 'CIP-187642',
    supervisorNombre: 'Ing. Carlos Mendoza',
    supervisorCIP: 'CIP-134982',
    estado: 'ACTIVO',
    provincia: 'Lambayeque',
    estadoObra: 'En Ejecución Física',
    asientosCount: 1,
  },
  {
    id: 'p-2109482',
    cui: '2109482',
    nombre: 'CONSTRUCCIÓN DE DEFENSA RIBEREÑA EN EL RÍO LA LECHE EN EL SECTOR MÓCHOPE VIEJO, PROVINCIA DE LAMBAYEQUE',
    nConvenio: 'CONVENIO OXI-001-2022-GR.LAMB',
    modalidad: 'CONTRATA',
    fase: 'Liquidación',
    entidadEjecutora: 'Consorcio Vial La Leche',
    entidadSupervisora: 'Supervisión Hidráulica Lambayeque S.A.',
    residenteNombre: 'Ing. Fernando Armas',
    residenteCIP: 'CIP-876231',
    supervisorNombre: 'Ing. Silvia Alva',
    supervisorCIP: 'CIP-345612',
    estado: 'CONCLUIDO',
    provincia: 'Lambayeque',
    estadoObra: 'Obra Concluida / En Proceso de Liquidación',
    asientosCount: 12,
  },
];

export const INITIAL_INCIDENCES: Record<string, MockIncidenceEntry[]> = {
  'p-2704014': [
    {
      id: 'a-2704014-1',
      numeroCorrelativo: 1,
      proyectoId: 'p-2704014',
      tipoIncidencia: 'INFORMATIVO',
      titulo: 'TRABAJOS DE EXCAVACIÓN',
      contenido: `* SE REALIZA LAS CHARLAS DE SEGURIDAD DE OBRA Y LLENADO DE PROTOCOLOS.
* SE REALIZA LA MITIGACION AMBIENTAL CORRESPONDIENTE DE OBRA.
* SE REALIZA LA PRUEBA HIDRAULICA EN LOS ACCESORIOS DE RED DE AGUA POTABLE Y SE IDENTIFICA QUE EN LAS CONEXIONES DOMICILIARES DE AGUA POTABLE RESUME AGUA, POR LO QUE ES MOTIVO DE REPARACIONES.
* SE PARALIZA LA COLOCACION DE SUB BASE Y BASE, HASTA REALIZAR LA PRUEBA HIDRAULICA DE LAS TUBERIAS EN LAS DIFERENTES CALLES.
* MORADORES DE LA CALLE LAS MAGNOLIAS Y LAURELES, SE ACERCAN A LA ZONA DE TRABAJO PARA SOLICITAR QUE SE REALICE CAMBIO DE BUZONES ANTIGUOS ROTOS, LIMPIEZA Y CAMBIO DE TUBERIAS EN LAS RESPECTIVAS CALLES,`,
      fechaHora: '2026-07-31 14:20',
      autorNombre: 'JUAN ROLA PEREZ',
      autorCargo: 'JEFE DE PROYECTO',
      autorCIP: 'CIP-187642',
      estadoGestion: 'Asiento Informativo (Sin acción requerida)',
      adjuntos: [
        { id: 'att-270-1', nombreArchivo: 'Archivo1.pdf', urlArchivo: '/doc_ejemplo.pdf', tipo: 'application/pdf' },
        { id: 'att-270-2', nombreArchivo: 'Archivo2.rar', urlArchivo: '#', tipo: 'application/x-rar-compressed' },
      ],
    },
  ],
  '2704014': [
    {
      id: 'a-2704014-1',
      numeroCorrelativo: 1,
      proyectoId: '2704014',
      tipoIncidencia: 'INFORMATIVO',
      titulo: 'TRABAJOS DE EXCAVACIÓN',
      contenido: `* SE REALIZA LAS CHARLAS DE SEGURIDAD DE OBRA Y LLENADO DE PROTOCOLOS.
* SE REALIZA LA MITIGACION AMBIENTAL CORRESPONDIENTE DE OBRA.
* SE REALIZA LA PRUEBA HIDRAULICA EN LOS ACCESORIOS DE RED DE AGUA POTABLE Y SE IDENTIFICA QUE EN LAS CONEXIONES DOMICILIARES DE AGUA POTABLE RESUME AGUA, POR LO QUE ES MOTIVO DE REPARACIONES.
* SE PARALIZA LA COLOCACION DE SUB BASE Y BASE, HASTA REALIZAR LA PRUEBA HIDRAULICA DE LAS TUBERIAS EN LAS DIFERENTES CALLES.
* MORADORES DE LA CALLE LAS MAGNOLIAS Y LAURELES, SE ACERCAN A LA ZONA DE TRABAJO PARA SOLICITAR QUE SE REALICE CAMBIO DE BUZONES ANTIGUOS ROTOS, LIMPIEZA Y CAMBIO DE TUBERIAS EN LAS RESPECTIVAS CALLES,`,
      fechaHora: '2026-07-31 14:20',
      autorNombre: 'JUAN ROLA PEREZ',
      autorCargo: 'JEFE DE PROYECTO',
      autorCIP: 'CIP-187642',
      estadoGestion: 'Asiento Informativo (Sin acción requerida)',
      adjuntos: [
        { id: 'att-270-1', nombreArchivo: 'Archivo1.pdf', urlArchivo: '/doc_ejemplo.pdf', tipo: 'application/pdf' },
        { id: 'att-270-2', nombreArchivo: 'Archivo2.rar', urlArchivo: '#', tipo: 'application/x-rar-compressed' },
      ],
    },
  ],
  'p-2548912': [
    {
      id: 'a-1',
      numeroCorrelativo: 1,
      proyectoId: 'p-2548912',
      tipoIncidencia: 'INFORMATIVO',
      titulo: 'INICIO DE TRABAJOS DE EXCAVACIÓN Y CIMENTACIÓN DEL BLOQUE B (CONSULTORIOS EXTERNOS)',
      contenido: 'Se deja constancia que en la fecha se inician formalmente las labores de excavación masiva para el Bloque B del Hospital de Ferreñafe según plano HE-04 REV-02, contando con la presencia en campo del Ing. Supervisor y el especialista de suelos.',
      fechaHora: '2026-08-01 08:30',
      autorNombre: 'Ing. Juan Pérez Valdivia',
      autorCargo: 'Residente de Obra',
      autorCIP: 'CIP-234891',
      estadoGestion: 'Asiento Informativo (Sin acción requerida)',
      adjuntos: [
        { id: 'att-101', nombreArchivo: 'Acta_Inicio_Excavacion_BloqueB.pdf', urlArchivo: '#', tipo: 'application/pdf' },
        { id: 'att-102', nombreArchivo: 'Foto_Trazo_Y_Replanteo_EjeB.jpg', urlArchivo: '#', tipo: 'image/jpeg' },
      ],
    },
    {
      id: 'a-2',
      numeroCorrelativo: 2,
      proyectoId: 'p-2548912',
      tipoIncidencia: 'CONSULTA_TECNICA',
      titulo: 'INTERFERENCIA CON RED DE AGUA POTABLE NO REGISTRADA EN PLANO DE CIMENTACIONES - EJE D-4',
      contenido: 'Se informa la presencia de una tubería de hierro fundido de 6 pulgadas no consignada en los planos del Expediente Técnico a la cota -2.40m del eje D-4. Se solicita pronunciamiento de la Supervisión sobre la variante de trazado o reubicación con la EPS EPSEL.',
      fechaHora: '2026-08-05 10:15',
      autorNombre: 'Ing. Juan Pérez Valdivia',
      autorCargo: 'Residente de Obra',
      autorCIP: 'CIP-234891',
      estadoGestion: 'Asiento Informativo (Sin acción requerida)',
      plazoDiasRespuesta: 5,
      adjuntos: [
        { id: 'att-1', nombreArchivo: 'Foto_Interferencia_Tubería_EjeD4.jpg', urlArchivo: '#', tipo: 'image/jpeg' },
        { id: 'att-2', nombreArchivo: 'Plano_HE04_Modificacion_Propuesta.pdf', urlArchivo: '#', tipo: 'application/pdf' },
      ],
    },
    {
      id: 'a-3',
      numeroCorrelativo: 3,
      proyectoId: 'p-2548912',
      tipoIncidencia: 'RIESGO',
      titulo: 'ALERTA DE RIESGO POR RETRASO EN SUMINISTRO DE AISLADORES SÍSMICOS - LEY 29230',
      contenido: 'Se hace de conocimiento al Gobierno Regional y a la Supervisión que el proveedor internacional ha notificado una demora de 15 días en el embarque de los aisladores elastoméricos. Se solicita reunión técnica urgente para evaluar impacto en la ruta crítica.',
      fechaHora: '2026-08-10 14:00',
      autorNombre: 'Ing. Juan Pérez Valdivia',
      autorCargo: 'Residente de Obra',
      autorCIP: 'CIP-234891',
      estadoGestion: 'Asiento Informativo (Sin acción requerida)',
      plazoDiasRespuesta: 5,
      adjuntos: [
        { id: 'att-301', nombreArchivo: 'Informe_Fabrica_Aisladores_Sismicos.pdf', urlArchivo: '#', tipo: 'application/pdf' },
      ],
    },
    {
      id: 'a-4',
      numeroCorrelativo: 4,
      proyectoId: 'p-2548912',
      tipoIncidencia: 'OBSERVACION',
      titulo: 'RESPUESTA A ASIENTO N° 2 Y OBSERVACIÓN SOBRE MEDIDAS DE SEGURIDAD EN ZONA DE EXCAVACIÓN',
      contenido: 'Esta Supervisión aprueba la solución técnica provisional enviada para la interferencia del eje D-4. Asimismo, se observa que la zanja carece de entibado reglamentario y señalización diurna/nocturna conforme a la Norma G.050.',
      fechaHora: '2026-08-12 09:45',
      autorNombre: 'Ing. María Torres Ugarte',
      autorCargo: 'Supervisor de Obra',
      autorCIP: 'CIP-198273',
      esRespuestaDeId: 'a-2',
      estadoGestion: 'Atendido por Supervisión en Asiento N° 4',
      adjuntos: [
        { id: 'att-401', nombreArchivo: 'Aprobación_Supervision_Variante_Trazado.pdf', urlArchivo: '#', tipo: 'application/pdf' },
        { id: 'att-402', nombreArchivo: 'Evidencia_Inspeccion_Seguridad_G050.png', urlArchivo: '#', tipo: 'image/png' },
      ],
    },
  ],
  'p-2419083': [
    {
      id: 'a-241-1',
      numeroCorrelativo: 1,
      proyectoId: 'p-2419083',
      tipoIncidencia: 'INFORMATIVO',
      titulo: 'INICIO DE ESTUDIOS DE TOPOGRAFÍA Y MECÁNICA DE SUELOS PARA EXPEDIENTE TÉCNICO - AV. CHINCHAYSUYO',
      contenido: 'Se da inicio formal a las brigadas de levantamiento topográfico georreferenciado con estación total y perforación de calicatas a cielo abierto en el tramo comprendido entre la Av. Grau y la Av. Panamericana Sur, con presencia de los especialistas de trazo y pavimentos.',
      fechaHora: '2026-08-02 08:30',
      autorNombre: 'Ing. Roberto Gómez Bolaños',
      autorCargo: 'Residente de Obra',
      autorCIP: 'CIP-145672',
      estadoGestion: 'Asiento Informativo (Sin acción requerida)',
      adjuntos: [
        { id: 'att-c101', nombreArchivo: 'Plano_Topografico_Clave_AvChinchaysuyo.pdf', urlArchivo: '#', tipo: 'application/pdf' },
        { id: 'att-c102', nombreArchivo: 'Foto_Levantamiento_Topografico_Tramo_Grau.jpg', urlArchivo: '#', tipo: 'image/jpeg' },
      ],
    },
    {
      id: 'a-241-2',
      numeroCorrelativo: 2,
      proyectoId: 'p-2419083',
      tipoIncidencia: 'CONSULTA_TECNICA',
      titulo: 'INTERFERENCIA DE REDES ELÉCTRICAS DE MEDIA TENSIÓN Y POSTES DE ALUMBRADO CON EL DISEÑO DE LA CICLOVÍA',
      contenido: 'Durante el desarrollo del diseño geométrico y sección transversal de la vía, se constató la existencia de 8 postes de media tensión de la empresa ENSA que interfieren con la faja proyectada para la ciclovía y veredas peatonales. Se solicita coordinación con la entidad supervisora para gestionar el expediente de reubicación de postes.',
      fechaHora: '2026-08-08 11:20',
      autorNombre: 'Ing. Roberto Gómez Bolaños',
      autorCargo: 'Residente de Obra',
      autorCIP: 'CIP-145672',
      estadoGestion: 'Asiento Informativo (Sin acción requerida)',
      plazoDiasRespuesta: 5,
      adjuntos: [
        { id: 'att-c201', nombreArchivo: 'Informe_Interferencias_Redes_Electricas_ENSA.pdf', urlArchivo: '#', tipo: 'application/pdf' },
        { id: 'att-c202', nombreArchivo: 'Foto_Postes_Media_Tension_Interferencia.jpg', urlArchivo: '#', tipo: 'image/jpeg' },
      ],
    },
  ],
};
