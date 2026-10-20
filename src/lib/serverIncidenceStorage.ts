/**
 * Asientos del Cuaderno de Incidencias — PostgreSQL (Prisma) como única fuente de verdad.
 * No se usa almacenamiento en archivos: si la base de datos falla, la operación falla.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { MockIncidenceEntry } from '@/lib/mockData';
import { fixUtf8Mojibake } from '@/lib/utf8Utils';

type IncidenceTypeValue = MockIncidenceEntry['tipoIncidencia'];

export class IncidenceNotFoundError extends Error {
  constructor(id: string) {
    super(`El asiento ${id} no existe o fue eliminado de la base de datos.`);
    this.name = 'IncidenceNotFoundError';
  }
}

export class ProjectNotFoundError extends Error {
  constructor(ref: string) {
    super(`El proyecto "${ref}" no existe en la base de datos.`);
    this.name = 'ProjectNotFoundError';
  }
}

function normalizeIncidenceType(t?: string): IncidenceTypeValue {
  const upper = String(t || '').toUpperCase().trim();
  if (upper.includes('RIESGO')) return 'RIESGO';
  if (upper.includes('CONSULTA')) return 'CONSULTA_TECNICA';
  if (upper.includes('OBSERVACION') || upper.includes('OBSERVACIÓN')) return 'OBSERVACION';
  if (upper.includes('MODIFICACION') || upper.includes('MODIFICACIÓN') || upper.includes('ESTRUCTURAL')) return 'MODIFICACION_ESTRUCTURAL';
  return 'INFORMATIVO';
}

export function parseDateString(str?: string | Date | null): Date {
  if (!str) return new Date();
  if (str instanceof Date) return str;
  const dmyMatch = String(str).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
  if (dmyMatch) {
    const [, day, month, year, hours, minutes] = dmyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hours || 0), Number(minutes || 0));
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function formatDateString(date: Date | string): string {
  if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(date.trim())) {
    return date.trim();
  }
  const d = date instanceof Date ? date : parseDateString(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

const incidenceInclude = {
  adjuntos: true,
  proyecto: { select: { id: true, cui: true } },
} satisfies Prisma.IncidenceEntryInclude;

type DbIncidence = Prisma.IncidenceEntryGetPayload<{ include: typeof incidenceInclude }>;

function toIncidenceDto(di: DbIncidence): MockIncidenceEntry {
  return {
    id: di.id,
    numeroCorrelativo: di.numeroCorrelativo,
    proyectoId: di.proyecto?.id || di.proyectoId,
    tipoIncidencia: di.tipoIncidencia as IncidenceTypeValue,
    titulo: fixUtf8Mojibake(di.titulo),
    contenido: fixUtf8Mojibake(di.contenido),
    fechaHora: formatDateString(di.fechaHora),
    autorNombre: fixUtf8Mojibake(di.autorNombre),
    autorCargo: fixUtf8Mojibake(di.autorCargo),
    autorCIP: di.autorCIP || undefined,
    esRespuestaDeId: di.esRespuestaDeId || undefined,
    estadoGestion: fixUtf8Mojibake(di.estadoGestion),
    plazoDiasRespuesta: di.plazoDiasRespuesta ?? undefined,
    solicitudEdicionPendiente: di.solicitudEdicionPendiente,
    motivoSolicitudEdicion: di.motivoSolicitudEdicion || undefined,
    solicitanteEdicionNombre: di.solicitanteEdicionNombre || undefined,
    edicionPermitida: di.edicionPermitida,
    editado: di.editado,
    fechaUltimaEdicion: di.fechaUltimaEdicion ? formatDateString(di.fechaUltimaEdicion) : undefined,
    adjuntos: di.adjuntos.map((att) => ({
      id: att.id,
      nombreArchivo: fixUtf8Mojibake(att.nombreArchivo),
      urlArchivo: att.urlArchivo,
      tipo: att.tipo,
    })),
  };
}

/** Busca un proyecto por id o CUI exactos. */
async function findProject(ref: string) {
  const clean = String(ref || '').trim();
  if (!clean) return null;
  return prisma.project.findFirst({ where: { OR: [{ id: clean }, { cui: clean }] } });
}

// Obtener las incidencias (con filtro opcional por proyecto: id o CUI)
export async function getServerIncidences(projectId?: string): Promise<MockIncidenceEntry[]> {
  let where: Prisma.IncidenceEntryWhereInput = {};
  if (projectId) {
    const project = await findProject(projectId);
    if (!project) return [];
    where = { proyectoId: project.id };
  }

  const rows = await prisma.incidenceEntry.findMany({
    where,
    include: incidenceInclude,
    orderBy: [{ proyectoId: 'asc' }, { numeroCorrelativo: 'asc' }],
  });
  return rows.map(toIncidenceDto);
}

function cleanText(value: unknown, fallback = ''): string {
  return fixUtf8Mojibake(String(value ?? '').trim()) || fallback;
}

async function upsertAttachments(asientoId: string, adjuntos: MockIncidenceEntry['adjuntos'] | undefined) {
  if (!Array.isArray(adjuntos)) return;
  for (const att of adjuntos) {
    if (!att?.id || !att.nombreArchivo) continue;
    const data = {
      nombreArchivo: fixUtf8Mojibake(att.nombreArchivo),
      urlArchivo: att.urlArchivo || '',
      tipo: att.tipo || 'application/octet-stream',
    };
    await prisma.attachment.upsert({
      where: { id: att.id },
      update: data,
      create: { id: att.id, asientoId, ...data },
    });
  }
}

const isTemporaryId = (id?: string) => !id || id.startsWith('e-new-') || id.startsWith('temp-');

/**
 * Crea un asiento nuevo (sin id o con id temporal) o actualiza uno existente.
 * - El número correlativo lo asigna siempre el servidor.
 * - Actualizar un asiento que ya no existe lanza IncidenceNotFoundError (no se recrea).
 */
export async function saveServerIncidence(incidenceData: Partial<MockIncidenceEntry>): Promise<MockIncidenceEntry> {
  const data = incidenceData as Partial<MockIncidenceEntry> & { projectId?: string; cui?: string; cuiProyecto?: string };

  if (!isTemporaryId(data.id)) {
    return updateIncidence(data.id as string, data);
  }

  const projectRef = String(data.proyectoId || data.projectId || data.cui || data.cuiProyecto || '').trim();
  const project = await findProject(projectRef);
  if (!project) {
    throw new ProjectNotFoundError(projectRef || '(sin especificar)');
  }

  const tipo = normalizeIncidenceType(data.tipoIncidencia);
  const baseData = {
    proyectoId: project.id,
    tipoIncidencia: tipo,
    titulo: cleanText(data.titulo, 'ASIENTO DE OBRA'),
    contenido: cleanText(data.contenido),
    fechaHora: parseDateString(data.fechaHora || new Date()),
    autorNombre: cleanText(data.autorNombre, 'Ing. Responsable de Obra'),
    autorCargo: cleanText(data.autorCargo, 'Supervisor de Obra'),
    autorCIP: data.autorCIP ? String(data.autorCIP).trim() : null,
    esRespuestaDeId: data.esRespuestaDeId || null,
    estadoGestion: cleanText(data.estadoGestion, 'Asiento Informativo (Sin acción requerida)'),
    plazoDiasRespuesta: data.plazoDiasRespuesta || (tipo === 'CONSULTA_TECNICA' ? 10 : null),
  };

  // Correlativo = máximo del proyecto + 1. Si dos usuarios registran a la vez, la restricción
  // única (proyectoId, numeroCorrelativo) rechaza a uno y se reintenta con el siguiente número.
  for (let attempt = 0; attempt < 5; attempt++) {
    const agg = await prisma.incidenceEntry.aggregate({
      where: { proyectoId: project.id },
      _max: { numeroCorrelativo: true },
    });
    const correlativo = (agg._max.numeroCorrelativo || 0) + 1;
    try {
      const created = await prisma.incidenceEntry.create({
        data: {
          id: `inc-${project.cui}-${String(correlativo).padStart(4, '0')}-${Date.now().toString(36)}`,
          numeroCorrelativo: correlativo,
          ...baseData,
        },
      });
      await upsertAttachments(created.id, data.adjuntos);
      const full = await prisma.incidenceEntry.findUniqueOrThrow({ where: { id: created.id }, include: incidenceInclude });
      return toIncidenceDto(full);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue;
      throw err;
    }
  }
  throw new Error('No se pudo asignar un número correlativo al asiento. Intente nuevamente.');
}

async function updateIncidence(id: string, data: Partial<MockIncidenceEntry>): Promise<MockIncidenceEntry> {
  const existing = await prisma.incidenceEntry.findUnique({ where: { id } });
  if (!existing) {
    throw new IncidenceNotFoundError(id);
  }

  // Solo se actualizan los campos enviados; proyecto y correlativo no cambian
  const update: Prisma.IncidenceEntryUpdateInput = {};
  if (data.tipoIncidencia !== undefined) update.tipoIncidencia = normalizeIncidenceType(data.tipoIncidencia);
  if (data.titulo !== undefined) update.titulo = cleanText(data.titulo, existing.titulo);
  if (data.contenido !== undefined) update.contenido = cleanText(data.contenido);
  if (data.fechaHora !== undefined) update.fechaHora = parseDateString(data.fechaHora);
  if (data.autorNombre !== undefined) update.autorNombre = cleanText(data.autorNombre, existing.autorNombre);
  if (data.autorCargo !== undefined) update.autorCargo = cleanText(data.autorCargo, existing.autorCargo);
  if (data.autorCIP !== undefined) update.autorCIP = data.autorCIP ? String(data.autorCIP).trim() : null;
  if (data.estadoGestion !== undefined) update.estadoGestion = cleanText(data.estadoGestion, existing.estadoGestion);
  if (data.plazoDiasRespuesta !== undefined) update.plazoDiasRespuesta = data.plazoDiasRespuesta || null;
  if (data.solicitudEdicionPendiente !== undefined) update.solicitudEdicionPendiente = Boolean(data.solicitudEdicionPendiente);
  if (data.motivoSolicitudEdicion !== undefined) update.motivoSolicitudEdicion = data.motivoSolicitudEdicion || null;
  if (data.solicitanteEdicionNombre !== undefined) update.solicitanteEdicionNombre = data.solicitanteEdicionNombre || null;
  if (data.edicionPermitida !== undefined) update.edicionPermitida = Boolean(data.edicionPermitida);
  if (data.editado !== undefined) {
    update.editado = Boolean(data.editado);
    if (data.editado) update.fechaUltimaEdicion = new Date();
  }

  await prisma.incidenceEntry.update({ where: { id }, data: update });
  await upsertAttachments(id, data.adjuntos);
  const full = await prisma.incidenceEntry.findUniqueOrThrow({ where: { id }, include: incidenceInclude });
  return toIncidenceDto(full);
}

// Guardar múltiples incidencias en lote (se omiten las que fallan)
export async function saveServerIncidencesBatch(incidences: Partial<MockIncidenceEntry>[]): Promise<MockIncidenceEntry[]> {
  const savedList: MockIncidenceEntry[] = [];
  for (const inc of incidences) {
    try {
      savedList.push(await saveServerIncidence(inc));
    } catch (err) {
      console.error('Error al guardar asiento en lote:', err);
    }
  }
  return savedList;
}

// Eliminar una incidencia. Devuelve false si no existía.
export async function deleteServerIncidence(id: string): Promise<boolean> {
  const cleanId = String(id || '').trim();
  if (!cleanId) return false;
  const result = await prisma.incidenceEntry.deleteMany({ where: { id: cleanId } });
  return result.count > 0;
}
