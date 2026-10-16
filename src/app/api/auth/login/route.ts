import { NextResponse } from 'next/server';
import { findServerUser } from '@/lib/serverUserStorage';
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
    const cleanPassword = String(password).trim();

    // 1. Buscar en el almacén unificado del servidor (Prisma DB + storage/users.json)
    let foundUser = await findServerUser(cleanId);

    // 2. Si no se encontró en el servidor, verificar usuarios semilla de respaldo
    if (!foundUser) {
      const fallback = INITIAL_REGISTERED_USERS.find((u) => {
        const uDni = (u.dni || '').trim().toLowerCase();
        const uUser = (u.usuario || '').trim().toLowerCase();
        const uMail = (u.email || '').trim().toLowerCase();
        const idLower = cleanId.toLowerCase();
        return uDni === idLower || uUser === idLower || uMail === idLower;
      });

      if (fallback) {
        foundUser = fallback;
      }
    }

    // 3. Si no existe en ningún origen de datos
    if (!foundUser) {
      return NextResponse.json(
        {
          success: false,
          errorType: 'USER_NOT_FOUND',
          error: 'El DNI o usuario ingresado no se encuentra registrado en el sistema.',
        },
        { status: 404 }
      );
    }

    // 4. Validar contraseña
    const storedPassword = String(foundUser.contrasena || '').trim();
    if (storedPassword !== cleanPassword) {
      return NextResponse.json(
        {
          success: false,
          errorType: 'INVALID_PASSWORD',
          error: 'La contraseña ingresada es incorrecta. Por favor intente nuevamente.',
        },
        { status: 401 }
      );
    }

    // 5. Retornar sesión exitosa
    return NextResponse.json({
      success: true,
      user: {
        id: foundUser.id,
        nombre: foundUser.nombre,
        apellidos: foundUser.apellidos,
        dni: foundUser.dni,
        cip: foundUser.cip,
        email: foundUser.email,
        telefono: foundUser.telefono,
        modContrato: foundUser.modContrato,
        usuario: foundUser.usuario,
        rol: foundUser.rol,
        rolDisplay: foundUser.rolDisplay,
        otpEnabled: foundUser.otpEnabled,
      },
    });
  } catch (error) {
    console.error('Error en API auth/login:', error);
    return NextResponse.json(
      { success: false, error: 'Ocurrió un error en el servidor al validar el inicio de sesión.' },
      { status: 500 }
    );
  }
}
