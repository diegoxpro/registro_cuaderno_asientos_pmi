import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Limpiando base de datos por completo...');

  // 1. Limpiar todas las tablas
  await prisma.userProjectAssignment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.incidenceEntry.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  console.log('👤 Creando únicamente el usuario administrador inicial...');

  // Usuario Administrador: Carlos Mendoza Silva
  const admin = await prisma.user.create({
    data: {
      dni: '70123456',
      nombre: 'Carlos',
      apellidos: 'Mendoza Silva',
      email: 'diegomartingv@gmail.com',
      telefono: '912345678',
      usuario: 'admin',
      modContrato: 'Nombrado 276',
      perfilAcceso: Role.ADMINISTRADOR,
      cip: 'CIP-112233',
      contrasena: 'admin123',
    },
  });

  console.log('✅ Base de datos limpia configurada con éxito.');
  console.log(`👤 Usuario creado: ${admin.nombre} ${admin.apellidos} - ${admin.perfilAcceso}`);
  console.log(`   DNI/Usuario: ${admin.usuario} (${admin.dni})`);
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
