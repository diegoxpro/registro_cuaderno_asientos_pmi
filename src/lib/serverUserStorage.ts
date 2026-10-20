/**
 * Usuarios del sistema — PostgreSQL (Prisma) como única fuente de verdad.
 * No se usa almacenamiento en archivos: si la base de datos falla, la operación falla.
 */
import { randomUUID } from 'crypto';
import { Prisma, Role, User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppUser } from '@/lib/users';
import { hashPassword } from '@/lib/password';
import { fixUtf8Mojibake } from '@/lib/utf8Utils';

export { fixUtf8Mojibake };

export type PublicUser = Omit<AppUser, 'contrasena'>;

export class UserValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserValidationError';
  }
}

// Datos del usuario aptos para enviar al cliente (nunca incluye la contraseña)
export function toPublicUser(user: AppUser): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { contrasena, ...rest } = user;
  return rest;
}

// Normalizador de roles
export function normalizeRole(roleStr?: string): 'ADMINISTRADOR' | 'RESIDENTE' | 'SUPERVISOR_DE_OBRA' | 'JEFE_DE_PROYECTO' | 'SUPERVISOR_DE_PROYECTO' {
  if (!roleStr) return 'RESIDENTE';
  const upper = String(roleStr).toUpperCase().trim().replace(/\s+/g, '_');
  if (upper.includes('ADMIN')) return 'ADMINISTRADOR';
  if (upper.includes('OBRA')) return 'SUPERVISOR_DE_OBRA';
  if (upper.includes('SUPERVISOR_DE_PROYECTO') || upper.includes('SUPERVISOR_PROYECTO')) return 'SUPERVISOR_DE_PROYECTO';
  if (upper.includes('JEFE')) return 'JEFE_DE_PROYECTO';
  if (upper.includes('RESIDENTE')) return 'RESIDENTE';
  return 'RESIDENTE';
}

export function roleToDisplay(role: string): string {
  switch (normalizeRole(role)) {
    case 'ADMINISTRADOR': return 'Administrador';
    case 'SUPERVISOR_DE_OBRA': return 'Supervisor de obra';
    case 'JEFE_DE_PROYECTO': return 'Jefe de Proyecto';
    case 'SUPERVISOR_DE_PROYECTO': return 'Supervisor de Proyecto';
    case 'RESIDENTE': default: return 'Residente';
  }
}

function toAppUser(u: User): AppUser {
  const rol = normalizeRole(u.perfilAcceso);
  return {
    id: u.id,
    nombre: fixUtf8Mojibake(u.nombre),
    apellidos: fixUtf8Mojibake(u.apellidos),
    dni: u.dni,
    cip: u.cip || undefined,
    email: u.email,
    telefono: u.telefono,
    modContrato: u.modContrato ? fixUtf8Mojibake(u.modContrato) : undefined,
    usuario: fixUtf8Mojibake(u.usuario),
    contrasena: u.contrasena,
    rol,
    rolDisplay: roleToDisplay(rol),
    otpEnabled: u.otpEnabled,
  };
}

// Todos los usuarios registrados
export async function getServerUsers(): Promise<AppUser[]> {
  const rows = await prisma.user.findMany({ orderBy: [{ nombre: 'asc' }, { apellidos: 'asc' }] });
  return rows.map(toAppUser);
}

// Buscar usuario por DNI, usuario o correo
export async function findServerUser(identifier: string): Promise<AppUser | null> {
  const clean = String(identifier || '').trim();
  if (!clean) return null;
  const row = await prisma.user.findFirst({
    where: {
      OR: [
        { dni: clean },
        { usuario: { equals: clean, mode: 'insensitive' } },
        { email: { equals: clean, mode: 'insensitive' } },
      ],
    },
  });
  return row ? toAppUser(row) : null;
}

// Buscar usuario por su id (el de la sesión)
export async function findServerUserById(id: string): Promise<AppUser | null> {
  const row = id ? await prisma.user.findUnique({ where: { id } }) : null;
  return row ? toAppUser(row) : null;
}

/**
 * Crea o actualiza un usuario (se identifica por id, DNI o nombre de usuario).
 * Si `contrasena` llega vacía al editar, se conserva la contraseña actual.
 */
export async function saveServerUser(
  userData: Partial<AppUser> & { usuario?: string; dni: string; contrasena?: string }
): Promise<AppUser> {
  const dni = String(userData.dni || '').trim();
  const usuario = fixUtf8Mojibake(String(userData.usuario || dni).trim());
  const nombre = fixUtf8Mojibake(String(userData.nombre || '').trim());
  const apellidos = fixUtf8Mojibake(String(userData.apellidos || '').trim());
  if (!dni || !nombre || !apellidos) {
    throw new UserValidationError('Los campos nombre, apellidos y DNI son obligatorios.');
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        ...(userData.id ? [{ id: String(userData.id) }] : []),
        { dni },
        { usuario: { equals: usuario, mode: 'insensitive' as const } },
      ],
    },
  });

  const typedPassword = String(userData.contrasena || '').trim();
  if (!existing && !typedPassword) {
    throw new UserValidationError('La contraseña es obligatoria para registrar un nuevo usuario.');
  }

  // Al editar, los campos opcionales que no se envían conservan su valor actual
  const keep = <T,>(value: unknown, current: T, map: (v: unknown) => T): T =>
    value === undefined ? current : map(value);
  const data = {
    nombre,
    apellidos,
    dni,
    usuario,
    cip: keep(userData.cip, existing?.cip ?? null, (v) => (v ? String(v).trim() : null)),
    email: keep(userData.email, existing?.email ?? '', (v) => String(v || '').trim()),
    telefono: keep(userData.telefono, existing?.telefono ?? '', (v) => String(v || '').trim()),
    modContrato: keep(userData.modContrato, existing?.modContrato ?? null, (v) => (v ? fixUtf8Mojibake(String(v).trim()) : null)),
    perfilAcceso: keep(userData.rol, existing?.perfilAcceso ?? ('RESIDENTE' as Role), (v) => normalizeRole(String(v)) as Role),
    otpEnabled: keep(userData.otpEnabled, existing?.otpEnabled ?? false, (v) => Boolean(v)),
    ...(typedPassword ? { contrasena: await hashPassword(typedPassword) } : {}),
  };

  try {
    const row = existing
      ? await prisma.user.update({ where: { id: existing.id }, data })
      : await prisma.user.create({ data: { id: randomUUID(), ...data, contrasena: data.contrasena as string } });
    return toAppUser(row);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new UserValidationError('Ya existe otro usuario con ese DNI o nombre de usuario.');
    }
    throw err;
  }
}

// Eliminar un usuario. Devuelve false si no existía.
export async function deleteServerUser(params: { id?: string; email?: string; dni?: string; usuario?: string }): Promise<boolean> {
  const or: Prisma.UserWhereInput[] = [];
  if (params.id) or.push({ id: String(params.id) });
  if (params.dni) or.push({ dni: String(params.dni).trim() });
  if (params.usuario) or.push({ usuario: { equals: String(params.usuario).trim(), mode: 'insensitive' } });
  if (or.length === 0) return false;
  // Se identifica por id/DNI/usuario (no por correo: varios usuarios podrían compartirlo)
  const user = await prisma.user.findFirst({ where: { OR: or } });
  if (!user) return false;
  await prisma.user.delete({ where: { id: user.id } }); // asignaciones: onDelete Cascade
  return true;
}
