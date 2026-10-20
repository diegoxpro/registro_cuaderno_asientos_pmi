import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createOtpSession } from '@/lib/otp';
import { generateOtpEmailHtml } from '@/lib/smtp';
import { cookies } from 'next/headers';
import { findServerUser } from '@/lib/serverUserStorage';
import { SESSION_COOKIE, PENDING_2FA_COOKIE, verifyPending2faToken, verifySessionToken } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { config } = body;

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

    // Si nos pasan configuración SMTP activa, intentar despacho por correo
    if (config && config.host && config.user && config.pass) {
      try {
        const transporter = nodemailer.createTransport({
          host: config.host,
          port: Number(config.port) || 587,
          secure: Boolean(config.secure),
          auth: {
            user: config.user,
            pass: config.pass,
          },
          connectionTimeout: 3000,
          greetingTimeout: 3000,
          socketTimeout: 3000,
        });

        const htmlBody = generateOtpEmailHtml({
          nombre: targetNombre,
          apellidos: targetApellidos,
          otpCode: otpRecord.code,
          expiresMinutes: 5,
        });

        // Ejecutar envío en segundo plano (Non-blocking async dispatch)
        transporter.sendMail({
          from: `"${config.fromName || 'GORE Lambayeque - 2FA'}" <${config.fromEmail || config.user}>`,
          to: targetEmail,
          subject: `🔑 Código OTP de Verificación 2FA [${otpRecord.code}] — GORE Lambayeque`,
          html: htmlBody,
        }).then(() => {
          console.log(`[SMTP] Código OTP [${otpRecord.code}] entregado exitosamente a ${targetEmail}`);
        }).catch((err) => {
          console.error('[SMTP Error] Error al entregar OTP por correo:', err);
        });

        emailSent = true;
      } catch (err: unknown) {
        console.error('Error al instanciar transporte SMTP:', err);
        emailErrorMessage = err instanceof Error ? err.message : 'Fallo en servidor SMTP';
      }
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
