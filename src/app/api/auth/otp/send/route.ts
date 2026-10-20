import { NextResponse } from 'next/server';
import { createOtpSession } from '@/lib/otp';
import { generateOtpEmailHtml } from '@/lib/smtp';
import { createTransport, fromAddress, getSmtpSettings, isConfigComplete } from '@/lib/smtpSettings';
import { cookies } from 'next/headers';
import { findServerUser } from '@/lib/serverUserStorage';
import { SESSION_COOKIE, PENDING_2FA_COOKIE, verifyPending2faToken, verifySessionToken } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Solo se genera OTP para (a) el usuario que acaba de validar su contraseña o
    // (b) un administrador que envía un código de prueba a otra cuenta.
    const cookieStore = await cookies();
    const pending = await verifyPending2faToken(cookieStore.get(PENDING_2FA_COOKIE)?.value);
    const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);

    let cleanId: string;
    if (pending) {
      cleanId = pending.identifier;
    } else if (session?.rol === 'ADMINISTRADOR' && body.identifier) {
      cleanId = String(body.identifier).trim();
    } else {
      return NextResponse.json(
        { success: false, expired: true, error: 'La verificación expiró. Vuelva a ingresar sus credenciales.' },
        { status: 401 }
      );
    }

    const found = await findServerUser(cleanId);
    if (!found || !found.email) {
      return NextResponse.json(
        { success: false, error: 'La cuenta no tiene un correo electrónico registrado.' },
        { status: 400 }
      );
    }
    const targetEmail = found.email;
    const targetNombre = found.nombre;
    const targetApellidos = found.apellidos;

    // Crear sesión OTP de 5 minutos
    const otpRecord = createOtpSession({
      userId: cleanId,
      identifier: cleanId,
      email: targetEmail,
      durationMinutes: 5,
    });

    let emailSent = false;
    let emailErrorMessage = '';

    // Despacho con la configuración SMTP general del sistema (nunca la del navegador)
    const config = await getSmtpSettings();
    if (isConfigComplete(config)) {
      try {
        await createTransport(config).sendMail({
          from: fromAddress(config, 'GORE Lambayeque - 2FA'),
          to: targetEmail,
          subject: `🔑 Código OTP de Verificación 2FA [${otpRecord.code}] — GORE Lambayeque`,
          html: generateOtpEmailHtml({
            nombre: targetNombre,
            apellidos: targetApellidos,
            otpCode: otpRecord.code,
            expiresMinutes: 5,
          }),
        });
        emailSent = true;
      } catch (err: unknown) {
        console.error('[SMTP Error] No se pudo entregar el código OTP por correo:', err);
        emailErrorMessage = 'No se pudo enviar el correo con el código. Intente reenviarlo o contacte al administrador.';
      }
    } else {
      emailErrorMessage = 'El servidor de correo del sistema no está configurado. Contacte al administrador.';
    }

    return NextResponse.json({
      success: true,
      emailSent,
      emailErrorMessage: emailSent ? undefined : emailErrorMessage,
      email: targetEmail,
      expiresAt: otpRecord.expiresAt,
      // Solo en desarrollo: permite el botón "Autocompletar" de la pantalla de login
      code: process.env.NODE_ENV !== 'production' ? otpRecord.code : undefined,
      message: emailSent
        ? `Código de verificación OTP despachado exitosamente a ${targetEmail}`
        : `Código de verificación OTP generado para ${targetEmail}.`,
    });
  } catch (error) {
    console.error('Error en API auth/otp/send:', error);
    return NextResponse.json(
      { success: false, error: 'Ocurrió un error en el servidor al generar el código OTP.' },
      { status: 500 }
    );
  }
}
