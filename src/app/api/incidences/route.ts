import { NextResponse } from 'next/server';
import {
  getServerIncidences,
  saveServerIncidence,
  saveServerIncidencesBatch,
  deleteServerIncidence,
} from '@/lib/serverIncidenceStorage';
import { getServerProjects } from '@/lib/serverProjectStorage';
import { getRequestSession } from '@/lib/session';

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

// GET /api/incidences - Obtener asientos sincronizados con base de datos
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || undefined;

    const allowed = await getAccessibleProjectKeys(req);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Sesión no válida.' }, { status: 401 });
    }
    if (projectId && !allowed.has(projectId.toLowerCase().trim())) {
      return NextResponse.json(
        { success: false, error: 'No tiene acceso a este proyecto.' },
        { status: 403 }
      );
    }

    const incidences = (await getServerIncidences(projectId)).filter((inc) =>
      allowed.has(String(inc.proyectoId || '').toLowerCase().trim())
    );

    return NextResponse.json({
      success: true,
      count: incidences.length,
      incidences,
    });
  } catch (error: any) {
    console.error('Error al obtener asientos en /api/incidences:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al obtener asientos del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/incidences - Guardar asiento(s) inmediatamente en la base de datos
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Soporte para carga en lote
    if (Array.isArray(body)) {
      const savedList = await saveServerIncidencesBatch(body);
      return NextResponse.json({
        success: true,
        message: `Se sincronizaron ${savedList.length} asientos exitosamente en la base de datos.`,
        incidences: savedList,
      });
    }

    if (body.incidences && Array.isArray(body.incidences)) {
      const savedList = await saveServerIncidencesBatch(body.incidences);
      return NextResponse.json({
        success: true,
        message: `Se sincronizaron ${savedList.length} asientos exitosamente en la base de datos.`,
        incidences: savedList,
      });
    }

    const targetProjId = body.proyectoId || body.projectId || body.cui || body.cuiProyecto;
    if (targetProjId && !body.proyectoId) {
      body.proyectoId = targetProjId;
    }

    const saved = await saveServerIncidence(body);

    return NextResponse.json({
      success: true,
      message: `Asiento N° ${saved.numeroCorrelativo} guardado exitosamente en la base de datos.`,
      incidence: saved,
    });
  } catch (error: any) {
    console.error('Error al guardar asiento en /api/incidences:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al guardar asiento en la base de datos' },
      { status: 500 }
    );
  }
}

// DELETE /api/incidences - Eliminar un asiento
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let targetId = searchParams.get('id');

    if (!targetId) {
      try {
        const body = await req.json();
        targetId = body.id;
      } catch {}
    }

    if (!targetId) {
      return NextResponse.json(
        { success: false, error: 'Debe especificar el ID del asiento a eliminar.' },
        { status: 400 }
      );
    }

    await deleteServerIncidence(targetId);

    return NextResponse.json({
      success: true,
      message: `Asiento ${targetId} eliminado correctamente de la base de datos.`,
    });
  } catch (error: any) {
    console.error('Error al eliminar asiento en /api/incidences:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al eliminar asiento' },
      { status: 500 }
    );
  }
}
