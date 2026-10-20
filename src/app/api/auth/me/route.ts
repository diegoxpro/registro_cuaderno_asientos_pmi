import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/session';
import { findServerUser, toPublicUser } from '@/lib/serverUserStorage';

// GET /api/auth/me - Devuelve el usuario de la sesión actual (validada por el middleware)
export async function GET(req: Request) {
  const session = getRequestSession(req);
  const user = session ? await findServerUser(session.usuario || session.dni) : null;
  if (!user) {
    return NextResponse.json({ success: false, error: 'Sesión no válida.' }, { status: 401 });
  }
  return NextResponse.json({ success: true, user: toPublicUser(user) });
}
