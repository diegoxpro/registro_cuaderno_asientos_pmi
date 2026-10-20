/**
 * Verificación de sesión dentro de una ruta API (solo servidor).
 * Normalmente la hace el middleware; las rutas excluidas del middleware
 * (como la subida de adjuntos, por el tamaño del cuerpo) usan esta función.
 */
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, getRequestSession, verifySessionToken, type SessionPayload } from '@/lib/session';

export async function requireSession(req: Request): Promise<Omit<SessionPayload, 'exp'> | null> {
  const fromMiddleware = getRequestSession(req);
  if (fromMiddleware) return fromMiddleware;

  const token = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!token) return null;
  // Igual que el middleware: el usuario debe seguir existiendo y se usa su rol actual
  const user = await prisma.user.findUnique({
    where: { id: token.uid },
    select: { perfilAcceso: true, dni: true, usuario: true },
  });
  if (!user) return null;
  return { uid: token.uid, rol: user.perfilAcceso, dni: user.dni, usuario: user.usuario };
}
