import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createOtpSession } from '@/lib/otp';
import { generateOtpEmailHtml } from '@/lib/smtp';
import { INITIAL_REGISTERED_USERS } from '@/lib/users';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, email, nombre, apellidos, config } = body;

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Debe especificar el identificador de usuario (DNI / Usuario).' },
        { status: 400 }
      );
    }

    const cleanId = String(identifier).trim();
    let targetEmail = email;
    let targetNombre = nombre || 'Usuario';
    let targetApellidos = apellidos || '';

    // Si no enviaron mail o nombre, buscar en usuarios semilla
    if (!targetEmail) {
      const found = INITIAL_REGISTERED_USERS.find(
        (u) => u.dni.toLowerCase() === cleanId.toLowerCase() || u.usuario.toLowerCase() === cleanId.toLowerCase()
      );
      if (found) {
        targetEmail = found.email;
        targetNombre = found.nombre;
        targetApellidos = found.apellidos;
      } else {
        targetEmail = 'usuario@regionlambayeque.gob.pe';
      }
    }

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
      code: otpRecord.code, // Retornado para el modo de prueba/demostración visual
      expiresAt: otpRecord.expiresAt,
      message: emailSent
        ? `Código de verificación OTP despachado exitosamente a ${targetEmail}`
        : `Código OTP generado [${otpRecord.code}]. Servidor SMTP sin configurar o en modo demostración.`,
    });
  } catch (error) {
    console.error('Error en API auth/otp/send:', error);
    return NextResponse.json(
      { success: false, error: 'Ocurrió un error en el servidor al generar el código OTP.' },
      { status: 500 }
    );
  }
}
