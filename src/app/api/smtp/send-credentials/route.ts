import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { generateUserCredentialsEmailHtml } from '@/lib/smtp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { config, user, systemUrl } = body;

    if (!user || !user.email) {
      return NextResponse.json(
        { success: false, error: 'Se requieren los datos del usuario y un correo de destino válido.' },
        { status: 400 }
      );
    }

    if (!config || !config.host || !config.user) {
      return NextResponse.json(
        { success: false, error: 'Configuración SMTP no encontrada o incompleta.' },
        { status: 400 }
      );
    }

    // Configurar transporte nodemailer
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: Number(config.port) || 587,
      secure: Boolean(config.secure),
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const htmlContent = generateUserCredentialsEmailHtml({
      nombre: user.nombre,
      apellidos: user.apellidos,
      usuario: user.usuario || user.dni,
      contrasena: user.contrasena || '123456',
      rol: user.rol || 'Residente',
      email: user.email,
      dni: user.dni,
      systemUrl: systemUrl || (request.headers.get('origin') ? `${request.headers.get('origin')}/login` : undefined),
    });

    const mailOptions = {
      from: `"${config.fromName || 'GORE Lambayeque - Registro de Asientos'}" <${config.fromEmail || config.user}>`,
      to: user.email,
      subject: `Credenciales de Acceso - Sistema Cuaderno Digital GORE Lambayeque`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: `Credenciales enviadas correctamente a ${user.email}`,
      messageId: info.messageId,
    });
  } catch (error: unknown) {
    console.error('Error al enviar credenciales por correo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error al despachar el correo electrónico.';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
