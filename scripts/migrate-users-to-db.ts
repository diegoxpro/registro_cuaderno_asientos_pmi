/**
 * Migración única: pasa a PostgreSQL los datos de usuarios que solo existían en storage/users.json.
 * - Usuarios que no están en la BD: se crean (con su contraseña ya cifrada, o cifrándola si estaba en texto plano).
 * - Usuarios que ya están en la BD: solo se copia `otpEnabled`; si rol o correo difieren, se informa sin cambiar nada.
 * Uso: npm run users:migrate          (agregue --dry-run para solo revisar)
 */
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hashPassword, isPasswordHashed } from '@/lib/password';
import { normalizeRole } from '@/lib/serverUserStorage';
import type { AppUser } from '@/lib/users';

const DRY_RUN = process.argv.includes('--dry-run');
const FILE = path.join(process.cwd(), 'storage', 'users.json');

async function main() {
  if (!fs.existsSync(FILE)) {
    console.log('No existe storage/users.json: nada que migrar.');
    return;
  }
  const fileUsers: AppUser[] = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  console.log(`${DRY_RUN ? '[SIMULACIÓN] ' : ''}Usuarios en el archivo: ${fileUsers.length}`);

  for (const fu of fileUsers) {
    const db = await prisma.user.findFirst({
      where: { OR: [{ dni: fu.dni }, { usuario: { equals: fu.usuario, mode: 'insensitive' } }] },
    });

    if (!db) {
      const pass = fu.contrasena && isPasswordHashed(fu.contrasena) ? fu.contrasena : await hashPassword(fu.contrasena || randomUUID());
      console.log(`  + crear ${fu.usuario} (${fu.dni}) rol=${normalizeRole(fu.rol)} otp=${Boolean(fu.otpEnabled)}`);
      if (!DRY_RUN) {
        await prisma.user.create({
          data: {
            id: randomUUID(),
            nombre: fu.nombre,
            apellidos: fu.apellidos,
            dni: fu.dni,
            cip: fu.cip || null,
            email: fu.email || '',
            telefono: fu.telefono || '',
            modContrato: fu.modContrato || null,
            usuario: fu.usuario,
            contrasena: pass,
            perfilAcceso: normalizeRole(fu.rol) as Role,
            otpEnabled: Boolean(fu.otpEnabled),
          },
        });
      }
      continue;
    }

    const notes: string[] = [];
    if (normalizeRole(fu.rol) !== db.perfilAcceso) notes.push(`rol archivo=${normalizeRole(fu.rol)} / BD=${db.perfilAcceso} (se mantiene BD)`);
    if ((fu.email || '') !== db.email) notes.push(`correo archivo=${fu.email} / BD=${db.email} (se mantiene BD)`);
    const otp = Boolean(fu.otpEnabled);
    if (otp !== db.otpEnabled) {
      notes.push(`otpEnabled → ${otp}`);
      if (!DRY_RUN) await prisma.user.update({ where: { id: db.id }, data: { otpEnabled: otp } });
    }
    console.log(`  = ${fu.usuario}: ${notes.length ? notes.join('; ') : 'sin diferencias'}`);
  }
  console.log(DRY_RUN ? 'Simulación terminada (no se modificó nada).' : 'Migración terminada.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
