import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { AppUser } from '@/lib/users';
import { hashPassword, isPasswordHashed } from '@/lib/password';

export type PublicUser = Omit<AppUser, 'contrasena'>;

// Datos del usuario aptos para enviar al cliente (nunca incluye la contraseña)
export function toPublicUser(user: AppUser): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { contrasena, ...rest } = user;
  return rest;
}

const STORAGE_DIR = path.join(process.cwd(), 'storage');
const USERS_FILE = path.join(STORAGE_DIR, 'users.json');

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
  const norm = normalizeRole(role);
  switch (norm) {
    case 'ADMINISTRADOR': return 'Administrador';
    case 'SUPERVISOR_DE_OBRA': return 'Supervisor de obra';
    case 'JEFE_DE_PROYECTO': return 'Jefe de Proyecto';
    case 'SUPERVISOR_DE_PROYECTO': return 'Supervisor de Proyecto';
    case 'RESIDENTE': default: return 'Residente';
  }
}

import { fixUtf8Mojibake } from '@/lib/utf8Utils';
export { fixUtf8Mojibake };

// Leer archivo de usuarios del servidor
async function readUsersFile(): Promise<AppUser[]> {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }

    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('Error al leer storage/users.json:', err);
  }
  return [];
}

// Escribir archivo de usuarios en el servidor
async function writeUsersFile(users: AppUser[]): Promise<void> {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error al guardar en storage/users.json:', err);
  }
}

let isDbAvailable = true;
let lastDbAttempt = 0;
const DB_RETRY_COOLDOWN_MS = 60000;

function canAttemptDb(): boolean {
  if (isDbAvailable) return true;
  return Date.now() - lastDbAttempt > DB_RETRY_COOLDOWN_MS;
}

function markDbSuccess() {
  isDbAvailable = true;
}

function markDbFailure() {
  isDbAvailable = false;
  lastDbAttempt = Date.now();
}

// Helper para obtener el valor real de otpEnabled desde almacenamiento persistente o semillas
function lookupOtpEnabled(uUser: string, uDni: string, fileUsers: AppUser[]): boolean {
  const match = fileUsers.find(
    (fu) =>
      (fu.usuario && fu.usuario.toLowerCase() === (uUser || '').toLowerCase()) ||
      (fu.dni && fu.dni.toLowerCase() === (uDni || '').toLowerCase())
  );
  return match?.otpEnabled !== undefined ? Boolean(match.otpEnabled) : false;
}

// Obtener todos los usuarios del servidor (Sincronizado con Prisma si está disponible)
export async function getServerUsers(): Promise<AppUser[]> {
  const fileUsers = await readUsersFile();
  const userMap = new Map<string, AppUser>();

  // 2. Cargar usuarios del archivo persistente
  for (const u of fileUsers) {
    const key = (u.usuario || u.dni).toLowerCase();
    userMap.set(key, u);
  }

  // 3. Intentar consultar base de datos Prisma (si está disponible con circuit breaker)
  if (canAttemptDb()) {
    try {
      const dbUsers = await prisma.user.findMany();
      markDbSuccess();
      if (Array.isArray(dbUsers) && dbUsers.length > 0) {
        for (const du of dbUsers) {
          const matchingFileUser = fileUsers.find(
            (fu) =>
              (fu.usuario && fu.usuario.toLowerCase() === du.usuario.toLowerCase()) ||
              (fu.dni && fu.dni.toLowerCase() === du.dni.toLowerCase())
          );
          const effectiveRole = (du.perfilAcceso === 'RESIDENTE' && matchingFileUser?.rol && matchingFileUser.rol !== 'RESIDENTE')
            ? matchingFileUser.rol
            : normalizeRole(du.perfilAcceso);
          const effectiveDisplay = (du.perfilAcceso === 'RESIDENTE' && matchingFileUser?.rolDisplay && matchingFileUser.rolDisplay !== 'Residente')
            ? matchingFileUser.rolDisplay
            : roleToDisplay(effectiveRole);

          const mapped: AppUser = {
            id: du.id,
            nombre: fixUtf8Mojibake(du.nombre),
            apellidos: fixUtf8Mojibake(du.apellidos),
            dni: du.dni,
            cip: du.cip || undefined,
            email: du.email,
            telefono: du.telefono,
            modContrato: du.modContrato ? fixUtf8Mojibake(du.modContrato) : undefined,
            usuario: fixUtf8Mojibake(du.usuario),
            contrasena: du.contrasena,
            rol: effectiveRole,
            rolDisplay: effectiveDisplay,
            otpEnabled: lookupOtpEnabled(du.usuario, du.dni, fileUsers),
          };
          const key = (mapped.usuario || mapped.dni).toLowerCase();
          userMap.set(key, mapped);
        }
      }
    } catch {
      markDbFailure();
    }
  }

  const result = Array.from(userMap.values());
  return result;
}

// Buscar usuario por DNI, Usuario o Email
export async function findServerUser(identifier: string): Promise<AppUser | null> {
  const cleanId = String(identifier || '').trim().toLowerCase();
  if (!cleanId) return null;

  // 1. Intentar en Prisma primero (si está disponible)
  if (canAttemptDb()) {
    try {
      const userFromDb = await prisma.user.findFirst({
        where: {
          OR: [
            { dni: cleanId },
            { usuario: { equals: cleanId, mode: 'insensitive' } },
            { email: { equals: cleanId, mode: 'insensitive' } },
          ],
        },
      });

      if (userFromDb) {
        markDbSuccess();
        const fileUsers = await readUsersFile();
        const matchingFileUser = fileUsers.find(
          (fu) =>
            (fu.usuario && fu.usuario.toLowerCase() === userFromDb.usuario.toLowerCase()) ||
            (fu.dni && fu.dni.toLowerCase() === userFromDb.dni.toLowerCase())
        );
        const effectiveRole = (userFromDb.perfilAcceso === 'RESIDENTE' && matchingFileUser?.rol && matchingFileUser.rol !== 'RESIDENTE')
          ? matchingFileUser.rol
          : normalizeRole(userFromDb.perfilAcceso);
        const effectiveDisplay = (userFromDb.perfilAcceso === 'RESIDENTE' && matchingFileUser?.rolDisplay && matchingFileUser.rolDisplay !== 'Residente')
          ? matchingFileUser.rolDisplay
          : roleToDisplay(effectiveRole);

        return {
          id: userFromDb.id,
          nombre: fixUtf8Mojibake(userFromDb.nombre),
          apellidos: fixUtf8Mojibake(userFromDb.apellidos),
          dni: userFromDb.dni,
          cip: userFromDb.cip || undefined,
          email: userFromDb.email,
          telefono: userFromDb.telefono,
          modContrato: userFromDb.modContrato ? fixUtf8Mojibake(userFromDb.modContrato) : undefined,
          usuario: fixUtf8Mojibake(userFromDb.usuario),
          contrasena: userFromDb.contrasena,
          rol: effectiveRole,
          rolDisplay: effectiveDisplay,
          otpEnabled: lookupOtpEnabled(userFromDb.usuario, userFromDb.dni, fileUsers),
        };
      }
    } catch {
      markDbFailure();
    }
  }

  // 2. Buscar en almacenamiento persistente del servidor
  const allUsers = await getServerUsers();
  const found = allUsers.find((u) => {
    const uDni = (u.dni || '').trim().toLowerCase();
    const uUser = (u.usuario || '').trim().toLowerCase();
    const uMail = (u.email || '').trim().toLowerCase();
    return uDni === cleanId || uUser === cleanId || uMail === cleanId;
  });

  return found || null;
}

// Guardar o actualizar un usuario en el servidor
// Si `contrasena` llega vacía al editar, se conserva la contraseña actual.
export async function saveServerUser(userData: Partial<AppUser> & { usuario?: string; dni: string; contrasena?: string }): Promise<AppUser> {
  const allUsers = await getServerUsers();
  
  const cleanDni = String(userData.dni).trim();
  const cleanUsuario = fixUtf8Mojibake(String(userData.usuario || userData.dni).trim());
  const typedPassword = String(userData.contrasena || '').trim();
  const rolNorm = normalizeRole(userData.rol);
  const rolDisp = userData.rolDisplay || roleToDisplay(rolNorm);

  const existingIdx = allUsers.findIndex((u) => {
    return (
      (userData.id && u.id === userData.id) ||
      (u.dni && u.dni.trim().toLowerCase() === cleanDni.toLowerCase()) ||
      (u.usuario && u.usuario.trim().toLowerCase() === cleanUsuario.toLowerCase())
    );
  });

  let storedPassword: string;
  if (typedPassword) {
    storedPassword = await hashPassword(typedPassword);
  } else if (existingIdx >= 0 && allUsers[existingIdx].contrasena) {
    const current = allUsers[existingIdx].contrasena;
    storedPassword = isPasswordHashed(current) ? current : await hashPassword(current);
  } else {
    throw new Error('La contraseña es obligatoria para registrar un nuevo usuario.');
  }

  const fullUser: AppUser = {
    id: userData.id || (existingIdx >= 0 ? allUsers[existingIdx].id : `u-${Date.now()}`),
    nombre: fixUtf8Mojibake(String(userData.nombre || '').trim()),
    apellidos: fixUtf8Mojibake(String(userData.apellidos || '').trim()),
    dni: cleanDni,
    cip: userData.cip ? String(userData.cip).trim() : undefined,
    email: String(userData.email || '').trim(),
    telefono: String(userData.telefono || '').trim(),
    modContrato: userData.modContrato ? fixUtf8Mojibake(String(userData.modContrato).trim()) : undefined,
    usuario: cleanUsuario,
    contrasena: storedPassword,
    rol: rolNorm,
    rolDisplay: rolDisp,
    otpEnabled: userData.otpEnabled !== undefined ? Boolean(userData.otpEnabled) : false,
  };

  if (existingIdx >= 0) {
    allUsers[existingIdx] = fullUser;
  } else {
    allUsers.unshift(fullUser);
  }

  // Guardar en archivo persistente
  await writeUsersFile(allUsers);

  // Intentar sincronizar también con Prisma DB (si está disponible)
  if (canAttemptDb()) {
    try {
      let prismaRole: 'ADMINISTRADOR' | 'RESIDENTE' | 'SUPERVISOR_DE_OBRA' | 'JEFE_DE_PROYECTO' | 'SUPERVISOR_DE_PROYECTO' = 'RESIDENTE';
      if (rolNorm === 'ADMINISTRADOR') prismaRole = 'ADMINISTRADOR';
      else if (rolNorm === 'SUPERVISOR_DE_OBRA') prismaRole = 'SUPERVISOR_DE_OBRA';
      else if (rolNorm === 'SUPERVISOR_DE_PROYECTO') prismaRole = 'SUPERVISOR_DE_PROYECTO';
      else if (rolNorm === 'JEFE_DE_PROYECTO') prismaRole = 'JEFE_DE_PROYECTO';

      await prisma.user.upsert({
        where: { dni: cleanDni },
        update: {
          nombre: fullUser.nombre,
          apellidos: fullUser.apellidos,
          cip: fullUser.cip || null,
          email: fullUser.email,
          telefono: fullUser.telefono,
          modContrato: fullUser.modContrato || null,
          usuario: fullUser.usuario,
          contrasena: fullUser.contrasena,
          perfilAcceso: prismaRole,
        },
        create: {
          id: fullUser.id,
          nombre: fullUser.nombre,
          apellidos: fullUser.apellidos,
          dni: fullUser.dni,
          cip: fullUser.cip || null,
          email: fullUser.email,
          telefono: fullUser.telefono,
          modContrato: fullUser.modContrato || null,
          usuario: fullUser.usuario,
          contrasena: fullUser.contrasena,
          perfilAcceso: prismaRole,
        },
      });
      markDbSuccess();
    } catch {
      markDbFailure();
    }
  }

  return fullUser;
}

// Eliminar un usuario en el servidor
export async function deleteServerUser(params: { id?: string; email?: string; dni?: string; usuario?: string }): Promise<boolean> {
  const allUsers = await getServerUsers();
  const cleanId = params.id ? String(params.id).trim() : null;
  const cleanDni = params.dni ? String(params.dni).trim().toLowerCase() : null;
  const cleanEmail = params.email ? String(params.email).trim().toLowerCase() : null;
  const cleanUsuario = params.usuario ? String(params.usuario).trim().toLowerCase() : null;

  const filtered = allUsers.filter((u) => {
    if (cleanId && u.id === cleanId) return false;
    if (cleanDni && u.dni.toLowerCase() === cleanDni) return false;
    if (cleanEmail && u.email.toLowerCase() === cleanEmail) return false;
    if (cleanUsuario && u.usuario.toLowerCase() === cleanUsuario) return false;
    return true;
  });

  await writeUsersFile(filtered);

  // Intentar eliminar también en Prisma DB (si está disponible)
  if (canAttemptDb()) {
    try {
      await prisma.user.deleteMany({
        where: {
          OR: [
            ...(params.id ? [{ id: params.id }] : []),
            ...(params.email ? [{ email: params.email }] : []),
            ...(params.dni ? [{ dni: params.dni }] : []),
            ...(params.usuario ? [{ usuario: params.usuario }] : []),
          ],
        },
      });
      markDbSuccess();
    } catch {
      markDbFailure();
    }
  }

  return true;
}
