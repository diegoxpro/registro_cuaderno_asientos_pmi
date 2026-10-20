import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyOtpCode } from '@/lib/otp';
import { findServerUser, toPublicUser } from '@/lib/serverUserStorage';
import {
  SESSION_COOKIE,
  PENDING_2FA_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifyPending2faToken,
  cookieOptions,
} from '@/lib/session';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    // El identificador sale de la cookie firmada emitida tras validar la contraseña, no del cliente
    const cookieStore = await cookies();
    const pending = await verifyPending2faToken(cookieStore.get(PENDING_2FA_COOKIE)?.value);
    if (!pending) {
      return NextResponse.json(
        { success: false, expired: true, error: 'La verificación expiró. Vuelva a ingresar sus credenciales.' },
        { status: 401 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Debe ingresar el código OTP.' },
        { status: 400 }
      );
    }

    const verification = verifyOtpCode(pending.identifier, String(code));
    if (!verification.success) {
      return NextResponse.json(
        { success: false, error: verification.message, expired: verification.expired },
        { status: 400 }
      );
    }

    const user = await findServerUser(pending.identifier);
    if (!user || user.id !== pending.uid) {
      return NextResponse.json({ success: false, error: 'La cuenta ya no está disponible.' }, { status: 401 });
    }

    const res = NextResponse.json({
      success: true,
      message: 'Autenticación de Doble Factor 2FA OTP completada con éxito.',
      user: toPublicUser(user),
    });
    res.cookies.delete(PENDING_2FA_COOKIE);
    res.cookies.set(
      SESSION_COOKIE,
      await createSessionToken({ uid: user.id, usuario: user.usuario, dni: user.dni, rol: user.rol }),
      cookieOptions(SESSION_MAX_AGE_SECONDS)
    );
    return res;
  } catch (error) {
    console.error('Error en API auth/otp/verify:', error);
    return NextResponse.json(
      { success: false, error: 'Ocurrió un error en el servidor al verificar el código OTP.' },
      { status: 500 }
    );
  }
}
