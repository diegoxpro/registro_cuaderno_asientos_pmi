export interface StoryboardAttachment {
  id: string;
  nombre: string;
  tipo: 'IMAGEN' | 'DOCUMENTO';
  url: string;
  tamano: string;
  extension: string;
}

export interface StoryboardMilestone {
  id: string;
  proyectoId: string;
  fechaHora: string;
  areaResponsable: 'Formulación' | 'OPMI' | 'Logística' | 'Infraestructura' | 'Tesorería' | 'Supervisión DEAT' | 'Contraloría';
  estadoTramite: 'En Formulación' | 'Elaboración de Bases' | 'Actos Preparatorios' | 'En Licitación' | 'Ejecución Física' | 'Liquidación' | 'Cierre Concluido';
  numeroExpediente: string;
  comentario: string;
  adjuntos: StoryboardAttachment[];
}

export const INITIAL_STORYBOARD_MILESTONES: StoryboardMilestone[] = [
  // Hitos para CUI 2419083 (Av. Chinchaysuyo)
  {
    id: 'sb-001',
    proyectoId: 'p-2419083',
    fechaHora: '2026-09-08 09:15',
    areaResponsable: 'Supervisión DEAT',
    estadoTramite: 'Ejecución Física',
    numeroExpediente: 'EXP-2026-2419-GORE',
    comentario: 'Verificación del Asiento N° 0005 y aprobación técnica de replanteo geométrico vial en el tramo Av. Grau - Av. Panamericana Sur. Se adjunta acta de conformidad e informe fotográfico.',
    adjuntos: [
      {
        id: 'att-chin-1',
        nombre: 'PL_13652_Acta_Supervision_Tecnica.pdf',
        tipo: 'DOCUMENTO',
        url: '/doc_ejemplo.pdf',
        tamano: '2.8 MB',
        extension: 'pdf'
      },
      {
        id: 'att-chin-2',
        nombre: 'Registro_Topografico_AvChinchaysuyo.jpg',
        tipo: 'IMAGEN',
        url: '/images.jpg',
        tamano: '1.9 MB',
        extension: 'jpg'
      }
    ]
  },
  {
    id: 'sb-002',
    proyectoId: 'p-2419083',
    fechaHora: '2026-08-18 11:30',
    areaResponsable: 'Infraestructura',
    estadoTramite: 'Ejecución Física',
    numeroExpediente: 'EXP-2026-1940-GORE',
    comentario: 'Aprobación del Plan de Desvíos de Tránsito y señalización temporal para inicio de excavación de zanjas en obras de drenaje pluvial.',
    adjuntos: [
      {
        id: 'att-chin-3',
        nombre: 'Plan_Desvios_Transito_Aprobado.pdf',
        tipo: 'DOCUMENTO',
        url: '/doc_ejemplo.pdf',
        tamano: '3.4 MB',
        extension: 'pdf'
      },
      {
        id: 'att-chin-4',
        nombre: 'Foto_Intervencion_AvPanamericana.jpg',
        tipo: 'IMAGEN',
        url: '/images.jpg',
        tamano: '2.1 MB',
        extension: 'jpg'
      }
    ]
  },
  {
    id: 'sb-101',
    proyectoId: 'p-2548912',
    fechaHora: '2026-08-28 09:30',
    areaResponsable: 'Supervisión DEAT',
    estadoTramite: 'Ejecución Física',
    numeroExpediente: 'EXP-2026-8942-GORE',
    comentario: 'Aprobación del Asiento N° 0045 referente al vaciado de losas estructurales en el Pabellón B. Se verifica el cumplimiento de las especificaciones técnicas RNE y ensayos de compresión de concreto a los 28 días.',
    adjuntos: [
      {
        id: 'att-1',
        nombre: 'Acta_Verificacion_Estructural_PabellonB.pdf',
        tipo: 'DOCUMENTO',
        url: '/doc_ejemplo.pdf',
        tamano: '2.4 MB',
        extension: 'pdf'
      },
      {
        id: 'att-2',
        nombre: 'Inspeccion_Vaciado_Losas_Vistas.jpg',
        tipo: 'IMAGEN',
        url: '/images.jpg',
        tamano: '1.8 MB',
        extension: 'jpg'
      }
    ]
  },
  {
    id: 'sb-102',
    proyectoId: 'p-2548912',
    fechaHora: '2026-07-15 14:20',
    areaResponsable: 'Infraestructura',
    estadoTramite: 'Ejecución Física',
    numeroExpediente: 'EXP-2026-6120-GORE',
    comentario: 'Emisión del Acta de Inicio de Obra N° 001 con presencia del Residente de Obra Ing. Juan Pérez y la Supervisión Técnica. Entrega formal del terreno libre de interferencias.',
    adjuntos: [
      {
        id: 'att-3',
        nombre: 'Acta_Entrega_Terreno_Firmada.pdf',
        tipo: 'DOCUMENTO',
        url: '/doc_ejemplo.pdf',
        tamano: '3.1 MB',
        extension: 'pdf'
      },
      {
        id: 'att-4',
        nombre: 'Foto_Terreno_Terreno_Inicial.jpg',
        tipo: 'IMAGEN',
        url: '/images.jpg',
        tamano: '2.2 MB',
        extension: 'jpg'
      }
    ]
  },
  {
    id: 'sb-103',
    proyectoId: 'p-2548912',
    fechaHora: '2026-05-10 11:00',
    areaResponsable: 'Logística',
    estadoTramite: 'En Licitación',
    numeroExpediente: 'LIC-2026-004-DEAT',
    comentario: 'Publicación de la Buena Pro para la Empresa Ejecutora bajo el esquema de la Ley N° 29230 (Obras por Impuestos). Convenio suscrito mediante Resolución Ejecutiva Regional N° 0184-2026-GR.LAMB.',
    adjuntos: [
      {
        id: 'att-5',
        nombre: 'Resolucion_Adjudicacion_BuenaPro.pdf',
        tipo: 'DOCUMENTO',
        url: '/doc_ejemplo.pdf',
        tamano: '1.5 MB',
        extension: 'pdf'
      }
    ]
  },
  {
    id: 'sb-104',
    proyectoId: 'p-2548912',
    fechaHora: '2026-03-02 16:45',
    areaResponsable: 'OPMI',
    estadoTramite: 'Actos Preparatorios',
    numeroExpediente: 'INFORME-2026-088-OPMI',
    comentario: 'Declaratoria de Viabilidad del Proyecto de Inversión Pública e inclusión en el PMIE 2026 del Gobierno Regional de Lambayeque.',
    adjuntos: [
      {
        id: 'att-6',
        nombre: 'Informe_Tecnico_Viabilidad_OPMI.pdf',
        tipo: 'DOCUMENTO',
        url: '/doc_ejemplo.pdf',
        tamano: '4.0 MB',
        extension: 'pdf'
      }
    ]
  },
  {
    id: 'sb-201',
    proyectoId: 'p-2173450',
    fechaHora: '2026-08-10 10:15',
    areaResponsable: 'Supervisión DEAT',
    estadoTramite: 'Liquidación',
    numeroExpediente: 'EXP-2026-9901-LIQ',
    comentario: 'Recepcionada la liquidación técnica-financiera final sin observaciones. Se emite Certificado CIPRL Ley N° 29230.',
    adjuntos: [
      {
        id: 'att-7',
        nombre: 'Certificado_CIPRL_Emitido_GORE.pdf',
        tipo: 'DOCUMENTO',
        url: '/doc_ejemplo.pdf',
        tamano: '1.9 MB',
        extension: 'pdf'
      }
    ]
  }

];

