import { NextResponse } from 'next/server';
import { deleteServerUser, findServerUserById } from '@/lib/serverUserStorage';
import { getRequestSession } from '@/lib/session';

// POST /api/users/delete - Elimina un usuario de la base de datos (solo ADMINISTRADOR, vía middleware)
export async function POST(req: Request) {
  try {
    const { id, email, dni, usuario } = await req.json();
    if (!id && !dni && !usuario) {
      return NextResponse.json({ success: false, error: 'Faltan parámetros para identificar al usuario' }, { status: 400 });
    }

    // Evitar que un administrador elimine su propia cuenta y quede sin acceso
    const session = getRequestSession(req);
    const me = session ? await findServerUserById(session.uid) : null;
    if (me && ((id && id === me.id) || (dni && dni === me.dni) || (usuario && String(usuario).toLowerCase() === me.usuario.toLowerCase()))) {
      return NextResponse.json({ success: false, error: 'No puede eliminar su propia cuenta.' }, { status: 400 });
    }

    const deleted = await deleteServerUser({ id, email, dni, usuario });
    if (!deleted) {
      return NextResponse.json({ success: false, notFound: true, error: 'El usuario no existe o ya fue eliminado.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Usuario eliminado de la base de datos.' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return NextResponse.json({ success: false, error: 'Error de base de datos: el usuario no se eliminó.' }, { status: 500 });
  }
}
