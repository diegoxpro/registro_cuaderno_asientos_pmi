import { NextResponse } from 'next/server';
import { getServerUsers, saveServerUser, toPublicUser } from '@/lib/serverUserStorage';

// GET /api/users - Retorna la lista consolidada de usuarios registrados
export async function GET() {
  try {
    const users = await getServerUsers();
    return NextResponse.json({
      success: true,
      users: users.map(toPublicUser),
    });
  } catch (error: any) {
    console.error('Error al obtener usuarios en /api/users:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// POST /api/users - Crea o actualiza un usuario en el servidor (persistente)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre, apellidos, dni, contrasena, email, usuario, rol, rolDisplay, cip, telefono, modContrato, otpEnabled, id } = body;

    // La contraseña es obligatoria solo al crear; al editar, vacía significa "no cambiar"
    if (!nombre || !apellidos || !dni) {
      return NextResponse.json(
        { success: false, error: 'Los campos nombre, apellidos y DNI son obligatorios.' },
        { status: 400 }
      );
    }

    const savedUser = await saveServerUser({
      id,
      nombre,
      apellidos,
      dni,
      cip,
      email: email || `${String(usuario || dni).toLowerCase()}@regionlambayeque.gob.pe`,
      telefono: telefono || '',
      modContrato,
      usuario: usuario || dni,
      contrasena,
      rol,
      rolDisplay,
      otpEnabled,
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario guardado exitosamente en el servidor.',
      user: toPublicUser(savedUser),
    });
  } catch (error: any) {
    console.error('Error al guardar usuario en /api/users:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al guardar usuario en el servidor' },
      { status: 500 }
    );
  }
}
