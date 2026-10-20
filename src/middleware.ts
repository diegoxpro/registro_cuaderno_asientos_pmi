import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, SESSION_HEADERS, verifySessionToken } from '@/lib/session';

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');

  // Nunca confiar en cabeceras de sesión enviadas por el cliente
  const headers = new Headers(req.headers);
  Object.values(SESSION_HEADERS).forEach((h) => headers.delete(h));

  if (isApi && PUBLIC_API.includes(pathname)) {
    return NextResponse.next({ request: { headers } });
  }

  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    if (isApi) {
      return NextResponse.json(
        { success: false, error: 'Sesión no válida o expirada. Inicie sesión nuevamente.' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
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
  // Todo excepto login, raíz, assets de Next e imágenes/archivos estáticos
  matcher: ['/((?!login$|_next/|favicon\\.ico|icon\\.png|img/|.*\\.(?:png|jpg|jpeg|svg|ico|pdf)$).+)'],
};
