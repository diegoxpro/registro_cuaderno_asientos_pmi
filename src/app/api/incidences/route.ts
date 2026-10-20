import { NextResponse } from 'next/server';
import {
  getServerIncidences,
  saveServerIncidence,
  saveServerIncidencesBatch,
  deleteServerIncidence,
  IncidenceNotFoundError,
  ProjectNotFoundError,
} from '@/lib/serverIncidenceStorage';
import { getServerProjects } from '@/lib/serverProjectStorage';
import { getRequestSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { findServerUser } from '@/lib/serverUserStorage';

// Respuestas siempre frescas: la base de datos es la única fuente de verdad
const NO_STORE = { 'Cache-Control': 'no-store' };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

// Identificadores (id y CUI) de los proyectos visibles para el usuario de la sesión
async function getAccessibleProjectKeys(req: Request): Promise<Set<string> | null> {
  const session = getRequestSession(req);
  if (!session) return null;
  const projects = await getServerProjects({ userDni: session.dni, role: session.rol });
  const keys = new Set<string>();
  for (const p of projects) {
    if (p.id) keys.add(String(p.id).toLowerCase().trim());
    if (p.cui) keys.add(String(p.cui).toLowerCase().trim());
  }
  return keys;
}

const normKey = (v: unknown) => String(v || '').toLowerCase().trim();
const isNewEntry = (item: Record<string, unknown>) => {
  const id = String(item.id || '');
  return !id || id.startsWith('e-new-') || id.startsWith('temp-');
};

function errorResponse(error: unknown, logLabel: string, userMessage: string) {
  if (error instanceof IncidenceNotFoundError) return json({ success: false, notFound: true, error: error.message }, 404);
  if (error instanceof ProjectNotFoundError) return json({ success: false, error: error.message }, 400);
  console.error(logLabel, error);
  return json({ success: false, error: userMessage }, 500);
}

// GET /api/incidences?projectId=... - Asientos leídos directamente de PostgreSQL
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || undefined;

    const allowed = await getAccessibleProjectKeys(req);
    if (!allowed) return json({ success: false, error: 'Sesión no válida.' }, 401);
    if (projectId && !allowed.has(normKey(projectId))) {
      return json({ success: false, error: 'No tiene acceso a este proyecto.' }, 403);
    }

    const incidences = (await getServerIncidences(projectId)).filter((inc) => allowed.has(normKey(inc.proyectoId)));
    return json({ success: true, count: incidences.length, incidences });
  } catch (error) {
    return errorResponse(error, 'Error al obtener asientos en /api/incidences:', 'No se pudo conectar con la base de datos para leer los asientos. Intente nuevamente.');
  }
}

// POST /api/incidences - Crea (sin id) o actualiza (con id existente) un asiento en PostgreSQL
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const allowed = await getAccessibleProjectKeys(req);
    if (!allowed) return json({ success: false, error: 'Sesión no válida.' }, 401);

    // Verifica que el usuario tenga acceso al proyecto del asiento (nuevo o existente)
    const canWrite = async (item: Record<string, unknown>) => {
      const id = String(item.id || '');
      if (!isNewEntry(item)) {
        const existing = await prisma.incidenceEntry.findUnique({ where: { id }, select: { proyectoId: true } });
        return !existing || allowed.has(normKey(existing.proyectoId)); // inexistente => 404 al guardar
      }
      const ref = item.proyectoId || item.projectId || item.cui || item.cuiProyecto;
      return allowed.has(normKey(ref));
    };

    // El autor de un asiento nuevo es siempre el usuario de la sesión (no lo que envíe el navegador)
    const session = getRequestSession(req);
    const author = session ? await findServerUser(session.usuario || session.dni) : null;
    const stampAuthor = (item: Record<string, unknown>) => {
      if (author && isNewEntry(item)) {
        item.autorNombre = `${author.nombre} ${author.apellidos}`.trim();
        item.autorCargo = author.rol;
        item.autorCIP = author.cip || null;
      } else if (!isNewEntry(item)) {
        // Al editar no se puede cambiar la autoría del asiento
        delete item.autorNombre;
        delete item.autorCargo;
        delete item.autorCIP;
      }
      return item;
    };

    const list = Array.isArray(body) ? body : Array.isArray(body.incidences) ? body.incidences : null;
    if (list) {
      const permitted = [];
      for (const item of list) if (await canWrite(item)) permitted.push(stampAuthor(item));
      const savedList = await saveServerIncidencesBatch(permitted);
      return json({
        success: true,
        message: `Se guardaron ${savedList.length} asientos en la base de datos.`,
        incidences: savedList,
      });
    }

    if (!(await canWrite(body))) {
      return json({ success: false, error: 'No tiene acceso a este proyecto.' }, 403);
    }

    const saved = await saveServerIncidence(stampAuthor(body));
    return json({
      success: true,
      message: `Asiento N° ${String(saved.numeroCorrelativo).padStart(4, '0')} guardado en la base de datos.`,
      incidence: saved,
    });
  } catch (error) {
    return errorResponse(error, 'Error al guardar asiento en /api/incidences:', 'Error de base de datos: el asiento NO se guardó. Intente nuevamente.');
  }
}

// DELETE /api/incidences?id=... - Elimina un asiento (solo ADMINISTRADOR)
export async function DELETE(req: Request) {
  try {
    const session = getRequestSession(req);
    if (session?.rol !== 'ADMINISTRADOR') {
      return json({ success: false, error: 'Solo un administrador puede eliminar asientos.' }, 403);
    }

    const { searchParams } = new URL(req.url);
    let targetId = searchParams.get('id');
    if (!targetId) {
      try {
        targetId = (await req.json()).id;
      } catch {}
    }
    if (!targetId) {
      return json({ success: false, error: 'Debe especificar el ID del asiento a eliminar.' }, 400);
    }

    const deleted = await deleteServerIncidence(targetId);
    if (!deleted) {
      return json({ success: false, notFound: true, error: 'El asiento no existe o ya fue eliminado.' }, 404);
    }
    return json({ success: true, message: `Asiento ${targetId} eliminado de la base de datos.` });
  } catch (error) {
    return errorResponse(error, 'Error al eliminar asiento en /api/incidences:', 'Error de base de datos: el asiento no se eliminó. Intente nuevamente.');
  }
}
