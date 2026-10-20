/**
 * Migración única: convierte a hash scrypt todas las contraseñas guardadas en texto plano
 * (storage/users.json y tabla User). Uso: npm run passwords:hash
 */
import { getServerUsers, saveServerUser } from '@/lib/serverUserStorage';
import { isPasswordHashed } from '@/lib/password';
import { prisma } from '@/lib/prisma';

async function main() {
  const users = await getServerUsers();
  let migrated = 0;
  for (const user of users) {
    if (user.contrasena && !isPasswordHashed(user.contrasena)) {
      await saveServerUser({ ...user, contrasena: user.contrasena });
      migrated++;
      console.log(`  ✔ ${user.usuario}`);
    }
  }
  console.log(`Contraseñas migradas: ${migrated} de ${users.length} usuarios.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
