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

export const INITIAL_STORYBOARD_MILESTONES: StoryboardMilestone[] = [];
