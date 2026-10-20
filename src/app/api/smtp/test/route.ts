import { NextResponse } from 'next/server';
import { createTransport, fromAddress, isConfigComplete, mergeWithStored } from '@/lib/smtpSettings';

// POST /api/smtp/test - Prueba la configuración del formulario (o la guardada) sin guardarla.
// Si la contraseña viene vacía se usa la guardada.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { testRecipient } = body;
    const config = await mergeWithStored(body.config || {});

    if (!isConfigComplete(config)) {
      return NextResponse.json(
        { success: false, error: 'Configuración SMTP incompleta. Ingrese el Host, Usuario, Contraseña y Correo remitente.' },
        { status: 400 }
      );
    }

    const recipient = (testRecipient && String(testRecipient).trim()) || config.fromEmail || config.user;
    const transporter = createTransport(config);

    // Verificación de conexión con el servidor SMTP
    await transporter.verify();

    // Enviar correo de prueba
    const mailOptions = {
      from: fromAddress(config, 'GORE Lambayeque - Notificaciones'),
      to: recipient,
      subject: 'Prueba de Conexión SMTP - GORE Lambayeque',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 550px; margin: auto;">
          <h2 style="color: #91000A; margin-top: 0;">Prueba de Conexión Exitosa</h2>
          <p style="color: #333;">Este es un mensaje de prueba enviado desde el <strong>Sistema de Registro de Asientos y Cuadernos Digitales de Obra (GORE Lambayeque)</strong>.</p>
          <div style="background-color: #f9f9f9; padding: 12px; border-left: 4px solid #91000A; margin: 15px 0;">
            <p style="margin: 0; font-size: 13px;"><strong>Servidor Host:</strong> ${config.host}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px;"><strong>Puerto:</strong> ${config.port}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px;"><strong>Usuario:</strong> ${config.user}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px;"><strong>Fecha y Hora:</strong> ${new Date().toLocaleString('es-PE')}</p>
          </div>
          <p style="font-size: 12px; color: #777;">Si ha recibido este correo, la configuración SMTP funciona correctamente.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: `Correo de prueba enviado con éxito a ${recipient}`,
      messageId: info.messageId,
    });
  } catch (error: unknown) {
    console.error('Error al probar conexión SMTP:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al conectar con el servidor SMTP.';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
