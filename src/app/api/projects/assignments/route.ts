import { NextResponse } from 'next/server';
import { getAssignments, saveAssignments } from '@/lib/serverProjectStorage';

// Escritura restringida a ADMINISTRADOR por el middleware
const NO_STORE = { 'Cache-Control': 'no-store' };

// GET /api/projects/assignments - Asignaciones usuario–proyecto (tabla UserProjectAssignment)
export async function GET() {
  try {
    return NextResponse.json({ success: true, assignments: await getAssignments() }, { headers: NO_STORE });
  } catch (error) {
    console.error('Error al obtener asignaciones:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo conectar con la base de datos para leer las asignaciones.' },
      { status: 500, headers: NO_STORE }
    );
  }
}

// POST /api/projects/assignments - Reemplaza las asignaciones de los usuarios enviados
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const assignments = Array.isArray(body) ? body : body.assignments;
    if (!Array.isArray(assignments)) {
      return NextResponse.json({ success: false, error: 'Formato inválido para asignaciones.' }, { status: 400, headers: NO_STORE });
    }

    const result = await saveAssignments(assignments);
    return NextResponse.json(
      {
        success: true,
        message: `Asignaciones guardadas en la base de datos para ${result.updatedUsers} usuario(s).`,
        ...result,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error('Error al guardar asignaciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error de base de datos: las asignaciones NO se guardaron. Intente nuevamente.' },
      { status: 500, headers: NO_STORE }
    );
  }
}
