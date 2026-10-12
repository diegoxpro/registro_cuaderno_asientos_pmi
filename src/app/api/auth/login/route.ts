import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { INITIAL_REGISTERED_USERS } from '@/lib/users';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Debe ingresar el DNI/Usuario y la contraseña.' },
        { status: 400 }
      );
    }

    const cleanId = String(identifier).trim();
    const cleanPassword = String(password);

    // 1. Intentar validar contra Prisma DB
    let userFromDb = null;
    try {
      userFromDb = await prisma.user.findFirst({
        where: {
          OR: [
            { dni: cleanId },
            { usuario: { equals: cleanId, mode: 'insensitive' } },
            { email: { equals: cleanId, mode: 'insensitive' } },
          ],
        },
      });
    } catch (dbErr) {
      console.warn('DB indisponible, usando base local fallback:', dbErr);
    }

    if (userFromDb) {
      if (userFromDb.contrasena !== cleanPassword) {
        return NextResponse.json(
          {
            success: false,
            errorType: 'INVALID_PASSWORD',
            error: 'La contraseña ingresada es incorrecta. Por favor intente nuevamente.',
          },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: userFromDb.id,
          nombre: userFromDb.nombre,
          apellidos: userFromDb.apellidos,
          dni: userFromDb.dni,
          cip: userFromDb.cip,
          email: userFromDb.email,
          telefono: userFromDb.telefono,
          modContrato: userFromDb.modContrato,
          usuario: userFromDb.usuario,
          rol: userFromDb.perfilAcceso,
        },
      });
    }

    // 2. Fallback a usuarios semilla/locales
    const fallbackUser = INITIAL_REGISTERED_USERS.find(
      (u) =>
        u.dni.toLowerCase() === cleanId.toLowerCase() ||
        u.usuario.toLowerCase() === cleanId.toLowerCase() ||
        u.email.toLowerCase() === cleanId.toLowerCase()
    );

    if (!fallbackUser) {
      return NextResponse.json(
        {
          success: false,
          errorType: 'USER_NOT_FOUND',
          error: 'El DNI o usuario ingresado no se encuentra registrado en el sistema.',
        },
        { status: 404 }
      );
    }

    if (fallbackUser.contrasena !== cleanPassword) {
      return NextResponse.json(
        {
          success: false,
          errorType: 'INVALID_PASSWORD',
          error: 'La contraseña ingresada es incorrecta. Por favor intente nuevamente.',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: fallbackUser,
    });
  } catch (error) {
    console.error('Error en API auth/login:', error);
    return NextResponse.json(
      { success: false, error: 'Ocurrió un error en el servidor al validar el inicio de sesión.' },
      { status: 500 }
    );
  }
}
