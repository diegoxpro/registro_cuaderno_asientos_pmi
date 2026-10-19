import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { MockIncidenceEntry } from '@/lib/mockData';
import { fixUtf8Mojibake } from '@/lib/utf8Utils';

const STORAGE_DIR = path.join(process.cwd(), 'storage');
const INCIDENCES_FILE = path.join(STORAGE_DIR, 'incidences.json');
const PROJECTS_FILE = path.join(STORAGE_DIR, 'projects.json');

let isDbAvailable = true;
let lastDbAttempt = 0;
const DB_RETRY_COOLDOWN_MS = 60000;

function canAttemptDb(): boolean {
  if (isDbAvailable) return true;
  return Date.now() - lastDbAttempt > DB_RETRY_COOLDOWN_MS;
}

function markDbSuccess() {
  isDbAvailable = true;
}

function markDbFailure() {
  isDbAvailable = false;
  lastDbAttempt = Date.now();
}

function normalizeIncidenceType(t?: string): 'RIESGO' | 'CONSULTA_TECNICA' | 'OBSERVACION' | 'INFORMATIVO' | 'MODIFICACION_ESTRUCTURAL' {
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

// Leer archivo local de incidencias
export async function readIncidencesFile(): Promise<MockIncidenceEntry[]> {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    if (!fs.existsSync(INCIDENCES_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(INCIDENCES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Error al leer storage/incidences.json:', err);
  }
  return [];
}

// Escribir archivo local de incidencias
export async function writeIncidencesFile(incidences: MockIncidenceEntry[]): Promise<void> {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    fs.writeFileSync(INCIDENCES_FILE, JSON.stringify(incidences, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error al guardar en storage/incidences.json:', err);
  }
}

// Actualizar conteo de asientos en el archivo de proyectos local
async function syncProjectAsientosCount(projectIdOrCui: string, count: number): Promise<void> {
  try {
    if (!fs.existsSync(PROJECTS_FILE)) return;
    const raw = fs.readFileSync(PROJECTS_FILE, 'utf-8');
    const projects = JSON.parse(raw);
    if (Array.isArray(projects)) {
      let modified = false;
      const cleanTarget = projectIdOrCui.toLowerCase().trim();
      for (const p of projects) {
        if (
          String(p.id).toLowerCase() === cleanTarget ||
          String(p.cui).toLowerCase() === cleanTarget ||
          cleanTarget.includes(String(p.cui).toLowerCase())
        ) {
          p.asientosCount = count;
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
      }
    }
  } catch (err) {
    console.warn('No se pudo actualizar asientosCount en storage/projects.json:', err);
  }
}

// Obtener todas las incidencias (con filtro opcional por proyecto)
export async function getServerIncidences(projectId?: string): Promise<MockIncidenceEntry[]> {
  const fileIncidences = await readIncidencesFile();
  const incidenceMap = new Map<string, MockIncidenceEntry>();

  // 1. Cargar desde archivo local
  for (const inc of fileIncidences) {
    if (inc.id) {
      incidenceMap.set(inc.id, {
        ...inc,
        titulo: fixUtf8Mojibake(inc.titulo),
        contenido: fixUtf8Mojibake(inc.contenido),
        autorNombre: fixUtf8Mojibake(inc.autorNombre),
        autorCargo: fixUtf8Mojibake(inc.autorCargo),
        estadoGestion: fixUtf8Mojibake(inc.estadoGestion),
      });
    }
  }

  // 2. Cargar desde base de datos PostgreSQL Prisma (si está disponible)
  if (canAttemptDb()) {
    try {
      const dbIncidences = await prisma.incidenceEntry.findMany({
        include: {
          adjuntos: true,
          proyecto: {
            select: { id: true, cui: true },
          },
        },
        orderBy: {
          numeroCorrelativo: 'asc',
        },
      });

      markDbSuccess();

      for (const di of dbIncidences) {
        const mapped: MockIncidenceEntry = {
          id: di.id,
          numeroCorrelativo: di.numeroCorrelativo,
          proyectoId: di.proyecto?.id || di.proyectoId,
          tipoIncidencia: di.tipoIncidencia as any,
          titulo: fixUtf8Mojibake(di.titulo),
          contenido: fixUtf8Mojibake(di.contenido),
          fechaHora: formatDateString(di.fechaHora),
          autorNombre: fixUtf8Mojibake(di.autorNombre),
          autorCargo: fixUtf8Mojibake(di.autorCargo),
          autorCIP: di.autorCIP || undefined,
          esRespuestaDeId: di.esRespuestaDeId || undefined,
          estadoGestion: fixUtf8Mojibake(di.estadoGestion),
          plazoDiasRespuesta: di.plazoDiasRespuesta || undefined,
          adjuntos: di.adjuntos.map((att) => ({
            id: att.id,
            nombreArchivo: fixUtf8Mojibake(att.nombreArchivo),
            urlArchivo: att.urlArchivo,
            tipo: att.tipo,
          })),
        };

        incidenceMap.set(mapped.id, mapped);
      }
    } catch (err) {
      console.warn('Prisma DB no disponible al consultar asientos, usando archivo local:', err);
      markDbFailure();
    }
  }

  let allList = Array.from(incidenceMap.values());

  // Ordenar por correlativo ascendente
  allList.sort((a, b) => a.numeroCorrelativo - b.numeroCorrelativo);

  // Filtrar por projectId si se especifica
  if (projectId) {
    const cleanTarget = String(projectId).toLowerCase().trim();
    allList = allList.filter((inc) => {
      const pId = String(inc.proyectoId || '').toLowerCase().trim();
      return pId === cleanTarget || pId.includes(cleanTarget) || cleanTarget.includes(pId);
    });
  }

  return allList;
}

// Guardar o actualizar una incidencia en el servidor y en la base de datos
export async function saveServerIncidence(incidenceData: Partial<MockIncidenceEntry>): Promise<MockIncidenceEntry> {
  const rawProjId = String(incidenceData.proyectoId || '').trim();
  if (!rawProjId) {
    throw new Error('El ID o CUI del proyecto es obligatorio para registrar un asiento.');
  }

  const cleanTitulo = fixUtf8Mojibake(String(incidenceData.titulo || '').trim()) || 'ASIENTO DE OBRA';
  const cleanContenido = fixUtf8Mojibake(String(incidenceData.contenido || '').trim());
  const cleanAutor = fixUtf8Mojibake(String(incidenceData.autorNombre || 'Ing. Responsable de Obra').trim());
  const cleanCargo = fixUtf8Mojibake(String(incidenceData.autorCargo || 'Supervisor de Obra').trim());
  const cleanCip = incidenceData.autorCIP ? String(incidenceData.autorCIP).trim() : null;
  const tipoNorm = normalizeIncidenceType(incidenceData.tipoIncidencia);
  const cleanEstadoGestion = fixUtf8Mojibake(String(incidenceData.estadoGestion || 'Asiento Informativo (Sin acción requerida)').trim());
  const formattedFechaHora = formatDateString(incidenceData.fechaHora || new Date());
  const dateObj = parseDateString(incidenceData.fechaHora || new Date());

  // Resolver ID real del proyecto desde la base de datos o almacenamiento local
  let realProjectId = rawProjId;
  let resolvedProjectCui = rawProjId;

  if (canAttemptDb()) {
    try {
      const matchedProj = await prisma.project.findFirst({
        where: {
          OR: [{ id: rawProjId }, { cui: rawProjId }],
        },
      });
      if (matchedProj) {
        realProjectId = matchedProj.id;
        resolvedProjectCui = matchedProj.cui;
      }
    } catch {}
  }

  // Cargar lista actual de incidencias para calcular correlativo
  const allIncidences = await readIncidencesFile();
  const existingIndex = incidenceData.id
    ? allIncidences.findIndex((inc) => inc.id === incidenceData.id)
    : -1;

  // Calcular correlativo para este proyecto si no viene especificado
  let correlativo = incidenceData.numeroCorrelativo;
  if (!correlativo || correlativo <= 0) {
    const projectIncidences = allIncidences.filter(
      (inc) => inc.proyectoId === realProjectId || inc.proyectoId === rawProjId
    );
    const maxCorrelativo = projectIncidences.reduce(
      (max, inc) => Math.max(max, inc.numeroCorrelativo || 0),
      0
    );
    correlativo = maxCorrelativo + 1;
  }

  const incidenceId =
    incidenceData.id ||
    (existingIndex >= 0
      ? allIncidences[existingIndex].id
      : `inc-${resolvedProjectCui}-${String(correlativo).padStart(4, '0')}`);

  const fullIncidence: MockIncidenceEntry = {
    id: incidenceId,
    numeroCorrelativo: correlativo,
    proyectoId: realProjectId,
    tipoIncidencia: tipoNorm,
    titulo: cleanTitulo,
    contenido: cleanContenido,
    fechaHora: formattedFechaHora,
    autorNombre: cleanAutor,
    autorCargo: cleanCargo,
    autorCIP: cleanCip,
    esRespuestaDeId: incidenceData.esRespuestaDeId || null,
    estadoGestion: cleanEstadoGestion,
    plazoDiasRespuesta: incidenceData.plazoDiasRespuesta || (tipoNorm === 'CONSULTA_TECNICA' ? 10 : undefined),
    adjuntos: Array.isArray(incidenceData.adjuntos) ? incidenceData.adjuntos : [],
  };

  // 1. Guardar en almacenamiento de archivo persistente del servidor
  if (existingIndex >= 0) {
    allIncidences[existingIndex] = fullIncidence;
  } else {
    allIncidences.push(fullIncidence);
  }
  await writeIncidencesFile(allIncidences);

  // 2. Guardar en PostgreSQL Prisma
  if (canAttemptDb()) {
    try {
      await prisma.incidenceEntry.upsert({
        where: { id: incidenceId },
        update: {
          numeroCorrelativo: fullIncidence.numeroCorrelativo,
          proyectoId: realProjectId,
          tipoIncidencia: tipoNorm,
          titulo: fullIncidence.titulo,
          contenido: fullIncidence.contenido,
          fechaHora: dateObj,
          autorNombre: fullIncidence.autorNombre,
          autorCargo: fullIncidence.autorCargo,
          autorCIP: fullIncidence.autorCIP || null,
          esRespuestaDeId: fullIncidence.esRespuestaDeId || null,
          estadoGestion: fullIncidence.estadoGestion,
          plazoDiasRespuesta: fullIncidence.plazoDiasRespuesta || null,
        },
        create: {
          id: fullIncidence.id,
          numeroCorrelativo: fullIncidence.numeroCorrelativo,
          proyectoId: realProjectId,
          tipoIncidencia: tipoNorm,
          titulo: fullIncidence.titulo,
          contenido: fullIncidence.contenido,
          fechaHora: dateObj,
          autorNombre: fullIncidence.autorNombre,
          autorCargo: fullIncidence.autorCargo,
          autorCIP: fullIncidence.autorCIP || null,
          esRespuestaDeId: fullIncidence.esRespuestaDeId || null,
          estadoGestion: fullIncidence.estadoGestion,
          plazoDiasRespuesta: fullIncidence.plazoDiasRespuesta || null,
        },
      });

      // Manejar adjuntos si existen
      if (Array.isArray(fullIncidence.adjuntos) && fullIncidence.adjuntos.length > 0) {
        for (const att of fullIncidence.adjuntos) {
          if (att.id && att.nombreArchivo) {
            try {
              await prisma.attachment.upsert({
                where: { id: att.id },
                update: {
                  nombreArchivo: fixUtf8Mojibake(att.nombreArchivo),
                  urlArchivo: att.urlArchivo || '',
                  tipo: att.tipo || 'application/octet-stream',
                },
                create: {
                  id: att.id,
                  asientoId: fullIncidence.id,
                  nombreArchivo: fixUtf8Mojibake(att.nombreArchivo),
                  urlArchivo: att.urlArchivo || '',
                  tipo: att.tipo || 'application/octet-stream',
                },
              });
            } catch {}
          }
        }
      }

      markDbSuccess();
    } catch (dbErr) {
      console.warn('Error al guardar incidencia en Prisma DB, persistida en archivo local:', dbErr);
      markDbFailure();
    }
  }

  // 3. Sincronizar conteo de asientos en el proyecto
  const currentProjectCount = allIncidences.filter(
    (inc) => inc.proyectoId === realProjectId || inc.proyectoId === rawProjId
  ).length;

  await syncProjectAsientosCount(realProjectId, currentProjectCount);

  return fullIncidence;
}

// Guardar múltiples incidencias en lote
export async function saveServerIncidencesBatch(incidences: Partial<MockIncidenceEntry>[]): Promise<MockIncidenceEntry[]> {
  const savedList: MockIncidenceEntry[] = [];
  for (const inc of incidences) {
    try {
      const saved = await saveServerIncidence(inc);
      savedList.push(saved);
    } catch (err) {
      console.error('Error al guardar asiento en lote:', err);
    }
  }
  return savedList;
}

// Eliminar una incidencia
export async function deleteServerIncidence(id: string): Promise<boolean> {
  const cleanId = String(id || '').trim();
  if (!cleanId) return false;

  const allIncidences = await readIncidencesFile();
  const target = allIncidences.find((inc) => inc.id === cleanId);
  const filtered = allIncidences.filter((inc) => inc.id !== cleanId);
  await writeIncidencesFile(filtered);

  if (target) {
    const remainingCount = filtered.filter((inc) => inc.proyectoId === target.proyectoId).length;
    await syncProjectAsientosCount(target.proyectoId, remainingCount);
  }

  if (canAttemptDb()) {
    try {
      await prisma.incidenceEntry.deleteMany({
        where: { id: cleanId },
      });
      markDbSuccess();
    } catch (dbErr) {
      console.warn('Error al eliminar incidencia en base de datos:', dbErr);
      markDbFailure();
    }
  }

  return true;
}
