import { NextResponse } from 'next/server';
import { deleteServerUser } from '@/lib/serverUserStorage';

export async function POST(req: Request) {
  try {
    const { id, email, dni, usuario } = await req.json();

    if (!id && !email && !dni && !usuario) {
      return NextResponse.json({ success: false, error: 'Faltan parámetros para identificar al usuario' }, { status: 400 });
    }

    // Eliminar del almacenamiento persistente del servidor
    await deleteServerUser({ id, email, dni, usuario });

    return NextResponse.json({ success: true, message: 'Usuario eliminado exitosamente del servidor' });
  } catch (error: any) {
    console.error('Error al procesar eliminación de usuario:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error interno' }, { status: 500 });
  }
}
