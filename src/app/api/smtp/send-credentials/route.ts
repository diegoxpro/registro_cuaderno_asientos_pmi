import { NextResponse } from 'next/server';
import { generateUserCredentialsEmailHtml } from '@/lib/smtp';
import { createTransport, fromAddress, getSmtpSettings, isConfigComplete } from '@/lib/smtpSettings';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, systemUrl } = body;

    if (!user || !user.email) {
      return NextResponse.json(
        { success: false, error: 'Se requieren los datos del usuario y un correo de destino válido.' },
        { status: 400 }
      );
    }

    // Siempre la configuración SMTP general guardada en el servidor
    const config = await getSmtpSettings();
    if (!isConfigComplete(config)) {
      return NextResponse.json(
        { success: false, error: 'El servidor SMTP del sistema no está configurado. Configúrelo en Administración de Usuarios.' },
        { status: 400 }
      );
    }
    const transporter = createTransport(config);

    const htmlContent = generateUserCredentialsEmailHtml({
      nombre: user.nombre,
      apellidos: user.apellidos,
      usuario: user.usuario || user.dni,
      contrasena: user.contrasena || '(sin cambios: use su contraseña actual)',
      rol: user.rol || 'Residente',
      email: user.email,
      dni: user.dni,
      systemUrl: systemUrl || (request.headers.get('origin') ? `${request.headers.get('origin')}/login` : undefined),
    });

    const mailOptions = {
      from: fromAddress(config, 'GORE Lambayeque - Registro de Asientos'),
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
