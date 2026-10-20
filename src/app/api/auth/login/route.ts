import { NextResponse } from 'next/server';
import { findServerUser, saveServerUser, toPublicUser } from '@/lib/serverUserStorage';
import { verifyPassword } from '@/lib/password';
import {
  SESSION_COOKIE,
  PENDING_2FA_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  PENDING_2FA_MAX_AGE_SECONDS,
  createSessionToken,
  createPending2faToken,
  cookieOptions,
} from '@/lib/session';

const INVALID_CREDENTIALS = 'DNI/usuario o contraseña incorrectos.';

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

    const foundUser = await findServerUser(cleanId);
    const check = await verifyPassword(cleanPassword, foundUser?.contrasena);

    // Mismo mensaje para usuario inexistente o contraseña errada (no revelar cuentas válidas)
    if (!foundUser || !check.valid) {
      return NextResponse.json(
        { success: false, errorType: 'INVALID_CREDENTIALS', error: INVALID_CREDENTIALS },
        { status: 401 }
      );
    }

    // Migrar contraseñas antiguas en texto plano al formato con hash
    if (check.needsRehash) {
      await saveServerUser({ ...foundUser, contrasena: cleanPassword });
    }

    const publicUser = toPublicUser(foundUser);

    // Cuenta con 2FA: emitir solo una cookie temporal; la sesión se emite tras verificar el OTP
    if (foundUser.otpEnabled) {
      const res = NextResponse.json({ success: true, requiresOtp: true, user: publicUser });
      res.cookies.set(
        PENDING_2FA_COOKIE,
        await createPending2faToken({ uid: foundUser.id, identifier: foundUser.usuario || foundUser.dni }),
        cookieOptions(PENDING_2FA_MAX_AGE_SECONDS)
      );
      return res;
    }

    const res = NextResponse.json({ success: true, requiresOtp: false, user: publicUser });
    res.cookies.set(
      SESSION_COOKIE,
      await createSessionToken({ uid: foundUser.id, usuario: foundUser.usuario, dni: foundUser.dni, rol: foundUser.rol }),
      cookieOptions(SESSION_MAX_AGE_SECONDS)
    );
    return res;
  } catch (error) {
    console.error('Error en API auth/login:', error);
    return NextResponse.json(
      { success: false, error: 'Ocurrió un error en el servidor al validar el inicio de sesión.' },
      { status: 500 }
    );
  }
}
