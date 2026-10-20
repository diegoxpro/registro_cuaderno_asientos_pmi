import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/session';
import { getPublicSmtpSettings, saveSmtpSettings } from '@/lib/smtpSettings';

// Ruta exclusiva de ADMINISTRADOR (restringida por el middleware para /api/smtp/*)
const NO_STORE = { 'Cache-Control': 'no-store' };

// GET /api/smtp/config - Configuración SMTP general (sin contraseña)
export async function GET() {
  try {
    return NextResponse.json({ success: true, config: await getPublicSmtpSettings() }, { headers: NO_STORE });
  } catch (error) {
    console.error('Error al leer configuración SMTP:', error);
    return NextResponse.json({ success: false, error: 'No se pudo leer la configuración SMTP.' }, { status: 500, headers: NO_STORE });
  }
}

// POST /api/smtp/config - Guarda la configuración SMTP general (contraseña vacía = conservar la actual)
export async function POST(req: Request) {
  try {
    const session = getRequestSession(req);
    const body = await req.json();
    const input = body?.config ?? body;
    if (!input?.host || !input?.user || !input?.fromEmail) {
      return NextResponse.json(
        { success: false, error: 'Complete el servidor (host), el usuario y el correo remitente.' },
        { status: 400, headers: NO_STORE }
      );
    }
    const config = await saveSmtpSettings(input, session?.usuario || 'admin');
    return NextResponse.json({ success: true, message: 'Configuración SMTP guardada para todo el sistema.', config }, { headers: NO_STORE });
  } catch (error) {
    console.error('Error al guardar configuración SMTP:', error);
    return NextResponse.json({ success: false, error: 'No se pudo guardar la configuración SMTP.' }, { status: 500, headers: NO_STORE });
  }
}
