import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, SESSION_HEADERS, verifySessionToken, type SessionPayload } from '@/lib/session';

// Rutas API accesibles sin sesión (flujo de inicio de sesión)
const PUBLIC_API = ['/api/auth/login', '/api/auth/otp/send', '/api/auth/otp/verify', '/api/auth/logout'];

// Rutas API exclusivas del rol ADMINISTRADOR
const ADMIN_API_PREFIXES = ['/api/users', '/api/backup', '/api/smtp'];
const ADMIN_API_WRITE = ['/api/projects/assignments'];

function isAdminOnly(pathname: string, method: string): boolean {
  if (ADMIN_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (method !== 'GET' && ADMIN_API_WRITE.includes(pathname)) return true;
  return false;
}

// Estado actual del usuario en la base de datos (caché corta para no consultar en cada petición).
// Así, eliminar un usuario o cambiar su rol tiene efecto en segundos, sin esperar a que caduque la sesión.
const USER_CACHE_TTL_MS = 10_000;
type UserState = { exists: false } | { exists: true; rol: string; dni: string; usuario: string };
const userCache = new Map<string, { state: UserState; at: number }>();

async function getUserState(uid: string): Promise<UserState> {
  const cached = userCache.get(uid);
  if (cached && Date.now() - cached.at < USER_CACHE_TTL_MS) return cached.state;
  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { perfilAcceso: true, dni: true, usuario: true },
  });
  const state: UserState = user
    ? { exists: true, rol: user.perfilAcceso, dni: user.dni, usuario: user.usuario }
    : { exists: false };
  userCache.set(uid, { state, at: Date.now() });
  return state;
}

function unauthorized(req: NextRequest, isApi: boolean, message: string) {
  const res = isApi
    ? NextResponse.json({ success: false, error: message }, { status: 401 })
    : NextResponse.redirect(new URL('/login', req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');

  // Nunca confiar en cabeceras de sesión enviadas por el cliente
  const headers = new Headers(req.headers);
  Object.values(SESSION_HEADERS).forEach((h) => headers.delete(h));

  if (isApi && PUBLIC_API.includes(pathname)) {
    return NextResponse.next({ request: { headers } });
  }

  const token = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!token) return unauthorized(req, isApi, 'Sesión no válida o expirada. Inicie sesión nuevamente.');

  // Datos vigentes del usuario: si fue eliminado, la sesión deja de valer; si cambió su rol, se aplica el nuevo
  let session: Omit<SessionPayload, 'exp'> = token;
  try {
    const state = await getUserState(token.uid);
    if (!state.exists) return unauthorized(req, isApi, 'Su cuenta ya no está habilitada en el sistema.');
    session = { uid: token.uid, rol: state.rol, dni: state.dni, usuario: state.usuario };
  } catch (err) {
    // Sin base de datos se usan los datos de la cookie firmada (las operaciones fallarán igualmente con error)
    console.error('No se pudo verificar el usuario de la sesión en la base de datos:', err);
  }

  if (isApi && session.rol !== 'ADMINISTRADOR' && isAdminOnly(pathname, req.method)) {
    return NextResponse.json(
      { success: false, error: 'No tiene permisos para realizar esta operación.' },
      { status: 403 }
    );
  }

  headers.set(SESSION_HEADERS.uid, session.uid);
  headers.set(SESSION_HEADERS.usuario, session.usuario);
  headers.set(SESSION_HEADERS.dni, session.dni);
  headers.set(SESSION_HEADERS.rol, session.rol);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Se ejecuta en Node.js para poder consultar la base de datos
  runtime: 'nodejs',
  // Todo excepto login, raíz, assets de Next, imágenes/archivos estáticos y la subida de adjuntos
  // (api/attachments verifica la sesión por sí misma: el middleware en Node no admite cuerpos grandes)
  matcher: ['/((?!login$|api/attachments$|_next/|favicon\\.ico|icon\\.png|img/|.*\\.(?:png|jpg|jpeg|svg|ico|pdf)$).+)'],
};
