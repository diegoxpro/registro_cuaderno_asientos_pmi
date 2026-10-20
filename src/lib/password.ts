/**
 * Hash de contraseñas con scrypt (módulo nativo de Node, sin dependencias externas).
 * Formato almacenado: scrypt$<salt base64>$<hash base64>
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const PREFIX = 'scrypt$';
const KEY_LENGTH = 64;

export function isPasswordHashed(stored: string | null | undefined): boolean {
  return typeof stored === 'string' && stored.startsWith(PREFIX);
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(plain, salt, KEY_LENGTH);
  return `${PREFIX}${salt.toString('base64')}$${hash.toString('base64')}`;
}

/**
 * Verifica la contraseña. Acepta también contraseñas antiguas en texto plano
 * (`needsRehash: true`) para migrarlas al formato con hash en el siguiente login.
 */
export async function verifyPassword(
  plain: string,
  stored: string | null | undefined
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!stored) return { valid: false, needsRehash: false };

  if (!isPasswordHashed(stored)) {
    const a = Buffer.from(plain);
    const b = Buffer.from(stored);
    const valid = a.length === b.length && timingSafeEqual(a, b);
    return { valid, needsRehash: valid };
  }

  const [, saltB64, hashB64] = stored.split('$');
  if (!saltB64 || !hashB64) return { valid: false, needsRehash: false };
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(plain, Buffer.from(saltB64, 'base64'), expected.length);
  return { valid: timingSafeEqual(actual, expected), needsRehash: false };
}
