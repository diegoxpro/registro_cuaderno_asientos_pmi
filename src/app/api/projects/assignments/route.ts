import { NextResponse } from 'next/server';
import { readAssignmentsFile, writeAssignmentsFile } from '@/lib/serverProjectStorage';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const assignments = await readAssignmentsFile();
    return NextResponse.json({
      success: true,
      assignments,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al obtener asignaciones' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const assignments = Array.isArray(body) ? body : body.assignments;

    if (!Array.isArray(assignments)) {
      return NextResponse.json(
        { success: false, error: 'Formato inválido para asignaciones.' },
        { status: 400 }
      );
    }

    await writeAssignmentsFile(assignments);

    // Intentar sincronizar también en DB Prisma
    try {
      for (const item of assignments) {
        const uDni = String(item.dni || '').trim();
        if (uDni) {
          const matchedUser = await prisma.user.findFirst({
            where: { dni: uDni },
          });

          if (matchedUser && Array.isArray(item.assignedProjectIds)) {
            // Eliminar asignaciones previas del usuario
            await prisma.userProjectAssignment.deleteMany({
              where: { userId: matchedUser.id },
            });

            // Insertar nuevas asignaciones
            for (const pId of item.assignedProjectIds) {
              const matchedProject = await prisma.project.findFirst({
                where: { OR: [{ id: pId }, { cui: pId }] },
              });
              if (matchedProject) {
                await prisma.userProjectAssignment.create({
                  data: {
                    userId: matchedUser.id,
                    projectId: matchedProject.id,
                  },
                });
              }
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn('Advertencia al sincronizar asignaciones con Prisma DB:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Asignaciones guardadas y sincronizadas exitosamente.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al guardar asignaciones' },
      { status: 500 }
    );
  }
}
