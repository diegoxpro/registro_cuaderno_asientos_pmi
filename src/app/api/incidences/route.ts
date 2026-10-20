import { NextResponse } from 'next/server';
import {
  getServerIncidences,
  saveServerIncidence,
  saveServerIncidencesBatch,
  deleteServerIncidence,
} from '@/lib/serverIncidenceStorage';

// GET /api/incidences - Obtener asientos sincronizados con base de datos
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || undefined;

    const incidences = await getServerIncidences(projectId);

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
