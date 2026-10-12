import { NextResponse } from 'next/server';
import { verifyOtpCode } from '@/lib/otp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, code } = body;

    if (!identifier || !code) {
      return NextResponse.json(
        { success: false, error: 'Debe ingresar el identificador de usuario y el código OTP.' },
        { status: 400 }
      );
    }

    const verification = verifyOtpCode(identifier, code);

    if (!verification.success) {
      return NextResponse.json(
        {
          success: false,
          error: verification.message,
          expired: verification.expired,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Autenticación de Doble Factor 2FA OTP completada con éxito.',
    });
  } catch (error) {
    console.error('Error en API auth/otp/verify:', error);
    return NextResponse.json(
      { success: false, error: 'Ocurrió un error en el servidor al verificar el código OTP.' },
      { status: 500 }
    );
  }
}
