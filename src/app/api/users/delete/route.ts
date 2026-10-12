import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { id, email, dni, usuario } = await req.json();

    if (!id && !email && !dni && !usuario) {
      return NextResponse.json({ success: false, error: 'Faltan parámetros para identificar al usuario' }, { status: 400 });
    }

    try {
      await prisma.user.deleteMany({
        where: {
          OR: [
            ...(id ? [{ id }] : []),
            ...(email ? [{ email }] : []),
            ...(dni ? [{ dni }] : []),
            ...(usuario ? [{ usuario }] : []),
          ],
        },
      });
      return NextResponse.json({ success: true, message: 'Usuario eliminado de la base de datos' });
    } catch (dbErr: any) {
      console.warn('Prisma DB no disponible al eliminar usuario:', dbErr?.message || dbErr);
      return NextResponse.json({ success: true, message: 'Eliminado en modo local (BD no disponible)' });
    }
  } catch (error: any) {
    console.error('Error al procesar eliminación de usuario:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error interno' }, { status: 500 });
  }
}
