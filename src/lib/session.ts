/**
 * Sesión del servidor basada en cookie firmada (HMAC-SHA256).
 * Usa Web Crypto para funcionar tanto en el middleware (Edge) como en rutas API (Node).
 * Sistema de Cuaderno de Incidencias Digital — GORE Lambayeque
 */

export const SESSION_COOKIE = 'cuaderno_session';
export const PENDING_2FA_COOKIE = 'cuaderno_pending_2fa';
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 horas
export const PENDING_2FA_MAX_AGE_SECONDS = 5 * 60; // 5 minutos

export interface SessionPayload {
  uid: string;
  usuario: string;
  dni: string;
  rol: string;
  exp: number; // segundos epoch
}

export interface Pending2faPayload {
  uid: string;
  identifier: string;
  exp: number;
}

// Cabeceras que el middleware inyecta en la petición para las rutas API
export const SESSION_HEADERS = {
  uid: 'x-session-uid',
  usuario: 'x-session-usuario',
  dni: 'x-session-dni',
  rol: 'x-session-rol',
} as const;

const DEV_FALLBACK_SECRET = 'dev-only-cuaderno-secret-cambiar-en-produccion';

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32 && !secret.startsWith('cambiar_')) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET no está configurado (mínimo 32 caracteres).');
  }
  return DEV_FALLBACK_SECRET;
}

const encoder = new TextEncoder();
let cachedKey: { secret: string; key: CryptoKey } | null = null;

async function getKey(): Promise<CryptoKey> {
  const secret = getSecret();
  if (cachedKey && cachedKey.secret === secret) return cachedKey.key;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  cachedKey = { secret, key };
  return key;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array<ArrayBuffer> {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function signToken(payload: object): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await getKey(), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

async function verifyToken<T extends { exp: number }>(token: string | undefined | null): Promise<T | null> {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    const valid = await crypto.subtle.verify('HMAC', await getKey(), fromBase64Url(sig), encoder.encode(body));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as T;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

export function createSessionToken(data: Omit<SessionPayload, 'exp'>): Promise<string> {
  return signToken({ ...data, exp: nowSeconds() + SESSION_MAX_AGE_SECONDS });
}

export function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  return verifyToken<SessionPayload>(token);
}

export function createPending2faToken(data: Omit<Pending2faPayload, 'exp'>): Promise<string> {
  return signToken({ ...data, exp: nowSeconds() + PENDING_2FA_MAX_AGE_SECONDS });
}

export function verifyPending2faToken(token: string | undefined | null): Promise<Pending2faPayload | null> {
  return verifyToken<Pending2faPayload>(token);
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

/** Lee la sesión inyectada por el middleware en una ruta API. */
export function getRequestSession(req: Request): Omit<SessionPayload, 'exp'> | null {
  const uid = req.headers.get(SESSION_HEADERS.uid);
  if (!uid) return null;
  return {
    uid,
    usuario: req.headers.get(SESSION_HEADERS.usuario) || '',
    dni: req.headers.get(SESSION_HEADERS.dni) || '',
    rol: req.headers.get(SESSION_HEADERS.rol) || '',
  };
}
