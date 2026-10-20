import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/session';
import {
  getServerProjects,
  createServerProject,
  updateServerProject,
  saveServerProjectsBatch,
  deleteServerProject,
  findProjectByRef,
  canSeeAllProjects,
  ProjectConflictError,
  ProjectValidationError,
} from '@/lib/serverProjectStorage';
import { getAccessibleProjectKeys, normKey } from '@/lib/projectAccess';

const NO_STORE = { 'Cache-Control': 'no-store' };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

// Roles que pueden registrar y editar proyectos (los mismos que ven esas opciones en la interfaz)
const canManageProjects = (rol: string) => /ADMIN|JEFE|SUPERVISOR/.test(String(rol).toUpperCase());

function errorResponse(error: unknown, logLabel: string, userMessage: string) {
  if (error instanceof ProjectConflictError) return json({ success: false, conflict: true, error: error.message }, 409);
  if (error instanceof ProjectValidationError) return json({ success: false, error: error.message }, 400);
  console.error(logLabel, error);
  return json({ success: false, error: userMessage }, 500);
}

// GET /api/projects - Proyectos visibles para el usuario de la sesión (leídos de PostgreSQL)
export async function GET(req: Request) {
  try {
    // El filtro RBAC usa la identidad de la sesión, nunca parámetros enviados por el cliente
    const session = getRequestSession(req);
    if (!session) return json({ success: false, error: 'Sesión no válida.' }, 401);

    const projects = await getServerProjects({ userDni: session.dni, role: session.rol });
    return json({ success: true, count: projects.length, projects });
  } catch (error) {
    return errorResponse(error, 'Error al obtener proyectos en /api/projects:', 'No se pudo conectar con la base de datos para leer los proyectos.');
  }
}

// POST /api/projects - Crea (sin id existente) o actualiza (con id) un proyecto en PostgreSQL.
// Un arreglo (o { projects: [...] }) se trata como carga masiva: crea o actualiza por CUI.
export async function POST(req: Request) {
  try {
    const session = getRequestSession(req);
    if (!session) return json({ success: false, error: 'Sesión no válida.' }, 401);
    if (!canManageProjects(session.rol)) {
      return json({ success: false, error: 'No tiene permisos para registrar o editar proyectos.' }, 403);
    }

    const body = await req.json();
    const list = Array.isArray(body) ? body : Array.isArray(body?.projects) ? body.projects : null;

    if (list) {
      if (!/ADMIN|JEFE/.test(session.rol.toUpperCase())) {
        return json({ success: false, error: 'Solo un administrador o jefe de proyecto puede hacer cargas masivas.' }, 403);
      }
      const { saved, errors } = await saveServerProjectsBatch(list);
      return json({
        success: errors.length === 0,
        message: `Se guardaron ${saved.length} de ${list.length} proyectos en la base de datos.`,
        projects: saved,
        errors,
      }, errors.length === 0 ? 200 : 207);
    }

    const existing = body?.id ? await findProjectByRef(String(body.id)) : null;
    if (existing) {
      // Editar: además del rol, debe tener acceso a ese proyecto
      const allowed = await getAccessibleProjectKeys(req);
      if (!allowed?.has(normKey(existing.id))) {
        return json({ success: false, error: 'No tiene acceso a este proyecto.' }, 403);
      }
      const project = await updateServerProject(existing.id, body);
      return json({ success: true, message: `Proyecto CUI ${project.cui} actualizado en la base de datos.`, project });
    }

    // Quien solo ve sus proyectos queda asignado al que crea; admin/jefe ya ven todos
    const project = await createServerProject(body, canSeeAllProjects(session.rol) ? undefined : session.dni);
    return json({ success: true, message: `Proyecto CUI ${project.cui} registrado en la base de datos.`, project });
  } catch (error) {
    return errorResponse(error, 'Error al guardar proyecto en /api/projects:', 'Error de base de datos: el proyecto NO se guardó. Intente nuevamente.');
  }
}

// DELETE /api/projects?id=... - Elimina un proyecto con sus asientos y adjuntos (solo ADMINISTRADOR)
export async function DELETE(req: Request) {
  try {
    const session = getRequestSession(req);
    if (session?.rol !== 'ADMINISTRADOR') {
      return json({ success: false, error: 'Solo un administrador puede eliminar proyectos.' }, 403);
    }

    const { searchParams } = new URL(req.url);
    let target = searchParams.get('id') || searchParams.get('cui');
    if (!target) {
      try {
        const body = await req.json();
        target = body.id || body.cui;
      } catch {}
    }
    if (!target) return json({ success: false, error: 'Debe especificar el ID o CUI del proyecto a eliminar.' }, 400);

    const deleted = await deleteServerProject(target);
    if (!deleted) return json({ success: false, notFound: true, error: 'El proyecto no existe o ya fue eliminado.' }, 404);
    return json({ success: true, message: `Proyecto ${target} eliminado de la base de datos.` });
  } catch (error) {
    return errorResponse(error, 'Error al eliminar proyecto en /api/projects:', 'Error de base de datos: el proyecto no se eliminó.');
  }
}
