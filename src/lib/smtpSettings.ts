/**
 * Configuración SMTP general del sistema (una sola para todos), guardada en PostgreSQL.
 * La contraseña se guarda cifrada (AES-256-GCM, clave derivada de SESSION_SECRET)
 * y nunca se envía al navegador.
 * Solo para uso en el servidor.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { DEFAULT_SMTP_CONFIG, PublicSmtpConfig, SmtpConfig } from '@/lib/smtp';

export type { PublicSmtpConfig };

const SETTING_KEY = 'smtp';
const ENC_PREFIX = 'enc:v1:';

function encryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET || 'dev-only-cuaderno-secret-cambiar-en-produccion';
  return createHash('sha256').update(`smtp-settings:${secret}`).digest();
}

function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ENC_PREFIX + [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
}

function decrypt(stored: string): string {
  if (!stored) return '';
  if (!stored.startsWith(ENC_PREFIX)) return stored;
  try {
    const [iv, tag, data] = stored.slice(ENC_PREFIX.length).split('.').map((p) => Buffer.from(p, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    // Si SESSION_SECRET cambió, la contraseña ya no se puede descifrar: hay que volver a ingresarla
    console.error('No se pudo descifrar la contraseña SMTP guardada (¿cambió SESSION_SECRET?).');
    return '';
  }
}

function normalize(input: Partial<SmtpConfig>, base: SmtpConfig): SmtpConfig {
  return {
    host: String(input.host ?? base.host).trim(),
    port: Number(input.port ?? base.port) || 587,
    secure: Boolean(input.secure ?? base.secure),
    user: String(input.user ?? base.user).trim(),
    pass: base.pass,
    fromName: String(input.fromName ?? base.fromName).trim(),
    fromEmail: String(input.fromEmail ?? base.fromEmail).trim(),
    autoSendOnRegister: Boolean(input.autoSendOnRegister ?? base.autoSendOnRegister),
  };
}

export function isConfigComplete(c: Pick<SmtpConfig, 'host' | 'user' | 'pass' | 'fromEmail'>): boolean {
  return Boolean(c.host && c.user && c.pass && c.fromEmail);
}

/** Configuración completa (con contraseña en claro) para enviar correos desde el servidor. */
export async function getSmtpSettings(): Promise<SmtpConfig & { updatedAt?: Date; updatedBy?: string | null }> {
  const row = await prisma.systemSetting.findUnique({ where: { clave: SETTING_KEY } });
  if (!row) return { ...DEFAULT_SMTP_CONFIG };
  const stored = JSON.parse(row.valor) as Partial<SmtpConfig>;
  return {
    ...normalize(stored, DEFAULT_SMTP_CONFIG),
    pass: decrypt(String(stored.pass || '')),
    updatedAt: row.updatedAt,
    updatedBy: row.actualizadoPor,
  };
}

export async function getPublicSmtpSettings(): Promise<PublicSmtpConfig> {
  const full = await getSmtpSettings();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { pass, updatedAt, updatedBy, ...rest } = full;
  return {
    ...rest,
    hasPassword: Boolean(pass),
    configured: isConfigComplete(full),
    updatedAt: updatedAt?.toISOString(),
    updatedBy: updatedBy || undefined,
  };
}

/**
 * Combina los valores del formulario con los guardados.
 * Contraseña vacía = conservar la guardada.
 */
export async function mergeWithStored(input: Partial<SmtpConfig>): Promise<SmtpConfig> {
  const current = await getSmtpSettings();
  const merged = normalize(input, current);
  merged.pass = input.pass ? String(input.pass) : current.pass;
  return merged;
}

export async function saveSmtpSettings(input: Partial<SmtpConfig>, updatedBy: string): Promise<PublicSmtpConfig> {
  const merged = await mergeWithStored(input);
  const valor = JSON.stringify({ ...merged, pass: merged.pass ? encrypt(merged.pass) : '' });
  await prisma.systemSetting.upsert({
    where: { clave: SETTING_KEY },
    update: { valor, actualizadoPor: updatedBy },
    create: { clave: SETTING_KEY, valor, actualizadoPor: updatedBy },
  });
  return getPublicSmtpSettings();
}

export function createTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: Number(config.port) || 587,
    secure: Boolean(config.secure),
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export function fromAddress(config: SmtpConfig, fallbackName: string): string {
  return `"${config.fromName || fallbackName}" <${config.fromEmail || config.user}>`;
}
