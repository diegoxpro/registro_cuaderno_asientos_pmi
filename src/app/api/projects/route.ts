import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/session';
import { getServerProjects, saveServerProject, saveServerProjectsBatch, deleteServerProject } from '@/lib/serverProjectStorage';

// GET /api/projects - Retorna proyectos sincronizados con la base de datos y filtrados por RBAC
export async function GET(req: Request) {
  try {
    // El filtro RBAC usa la identidad de la sesión, nunca parámetros enviados por el cliente
    const session = getRequestSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sesión no válida.' }, { status: 401 });
    }

    const projects = await getServerProjects({ userDni: session.dni, role: session.rol });

    return NextResponse.json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error: any) {
    console.error('Error al obtener proyectos en /api/projects:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al obtener proyectos' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Crea o actualiza proyecto(s) inmediatamente en la base de datos
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Soporte para carga masiva / en lote
    if (Array.isArray(body)) {
      const savedList = await saveServerProjectsBatch(body);
      return NextResponse.json({
        success: true,
        message: `Se guardaron ${savedList.length} proyectos exitosamente en la base de datos.`,
        projects: savedList,
      });
    }

    if (body.projects && Array.isArray(body.projects)) {
      const savedList = await saveServerProjectsBatch(body.projects);
      return NextResponse.json({
        success: true,
        message: `Se guardaron ${savedList.length} proyectos exitosamente en la base de datos.`,
        projects: savedList,
      });
    }

    if (!body.cui) {
      return NextResponse.json(
        { success: false, error: 'El CUI del proyecto es obligatorio para el registro.' },
        { status: 400 }
      );
    }

    const savedProject = await saveServerProject(body);

    return NextResponse.json({
      success: true,
      message: `Proyecto CUI ${savedProject.cui} guardado exitosamente en la base de datos y visible para usuarios autorizados.`,
      project: savedProject,
    });
  } catch (error: any) {
    console.error('Error al guardar proyecto en /api/projects:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al guardar proyecto en la base de datos' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects - Elimina un proyecto de la base de datos y almacenamiento
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let target = searchParams.get('id') || searchParams.get('cui');

    if (!target) {
      try {
        const body = await req.json();
        target = body.id || body.cui;
      } catch {}
    }

    if (!target) {
      return NextResponse.json(
        { success: false, error: 'Debe especificar el ID o CUI del proyecto a eliminar.' },
        { status: 400 }
      );
    }

    await deleteServerProject(target);

    return NextResponse.json({
      success: true,
      message: `Proyecto ${target} eliminado correctamente del servidor y base de datos.`,
    });
  } catch (error: any) {
    console.error('Error al eliminar proyecto en /api/projects:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al eliminar proyecto' },
      { status: 500 }
    );
  }
}
