export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  autoSendOnRegister: boolean;
}

export const DEFAULT_SMTP_CONFIG: SmtpConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  user: '',
  pass: '',
  fromName: 'GORE Lambayeque - Registro de Asientos y Cuadernos',
  fromEmail: 'notificaciones@regionlambayeque.gob.pe',
  autoSendOnRegister: true,
};

export const LOCAL_STORAGE_SMTP_KEY = 'app_smtp_config';

export function getSmtpConfig(): SmtpConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_SMTP_CONFIG;
  }
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_SMTP_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_SMTP_CONFIG,
        ...parsed,
        port: Number(parsed.port) || 587,
        secure: Boolean(parsed.secure),
        autoSendOnRegister: parsed.autoSendOnRegister !== undefined ? Boolean(parsed.autoSendOnRegister) : true,
      };
    }
  } catch (e) {
    console.error('Error al leer configuración SMTP de localStorage:', e);
  }
  return DEFAULT_SMTP_CONFIG;
}

export function saveSmtpConfig(config: SmtpConfig): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_SMTP_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Error al guardar configuración SMTP en localStorage:', e);
    }
  }
}

export function isSmtpConfigured(config: SmtpConfig): boolean {
  return Boolean(config.host && config.user && config.fromEmail);
}

export function generateUserCredentialsEmailHtml(params: {
  nombre: string;
  apellidos: string;
  usuario: string;
  contrasena: string;
  rol: string;
  email: string;
  dni: string;
  systemUrl?: string;
}): string {
  const { nombre, apellidos, usuario, contrasena, rol, dni, systemUrl } = params;
  const loginUrl = systemUrl || (typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://regionlambayeque.gob.pe/login');

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Credenciales de Acceso - GORE Lambayeque</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333333;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e0e0e0;">
      
      <!-- Header -->
      <tr>
        <td style="background-color: #91000A; padding: 25px 30px; text-align: left; color: #ffffff;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Gobierno Regional Lambayeque</h1>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #fcc0c4;">Sistema de Registro de Asientos y Cuadernos Digitales de Obra</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Body Content -->
      <tr>
        <td style="padding: 30px;">
          <h2 style="margin-top: 0; color: #91000A; font-size: 18px; font-weight: 600;">Bienvenido(a), ${nombre} ${apellidos}</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #4a4a4a;">
            Se ha creado exitosamente su cuenta de usuario en la plataforma digital oficial de seguimiento y registro de asientos de proyectos de inversión pública (Ley N° 29230 / OxI).
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #4a4a4a;">
            A continuación se detallan sus credenciales de acceso personales e intransferibles:
          </p>

          <!-- Credentials Box -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff8f8; border-left: 4px solid #91000A; border-top: 1px solid #f2d6d8; border-right: 1px solid #f2d6d8; border-bottom: 1px solid #f2d6d8; border-radius: 4px; margin: 20px 0; padding: 15px 20px;">
            <tr>
              <td style="padding: 6px 0; font-size: 14px;"><strong>DNI:</strong></td>
              <td style="padding: 6px 0; font-size: 14px; font-family: monospace; color: #1a1a1a;">${dni}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 14px;"><strong>Usuario de Acceso:</strong></td>
              <td style="padding: 6px 0; font-size: 14px; font-family: monospace; font-weight: bold; color: #91000A;">${usuario}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 14px;"><strong>Contraseña:</strong></td>
              <td style="padding: 6px 0; font-size: 14px; font-family: monospace; font-weight: bold; color: #91000A;">${contrasena}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 14px;"><strong>Rol Asignado:</strong></td>
              <td style="padding: 6px 0; font-size: 14px; color: #2c3e50; font-weight: 600;">${rol}</td>
            </tr>
          </table>

          <!-- Login CTA Button -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0 15px 0;">
            <tr>
              <td align="center">
                <a href="${loginUrl}" target="_blank" style="background-color: #91000A; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 5px rgba(145,0,10,0.3);">
                  Ingresar a la Plataforma
                </a>
              </td>
            </tr>
          </table>

          <p style="font-size: 12px; color: #777777; line-height: 1.5; margin-top: 25px;">
            * Por razones de seguridad, le sugerimos ingresar a la plataforma y actualizar su contraseña periódicamente. No comparta sus accesos con personal no autorizado.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background-color: #f8f9fa; padding: 15px 30px; text-align: center; border-top: 1px solid #eeeeee; font-size: 11px; color: #888888;">
          <p style="margin: 0;">Gobierno Regional Lambayeque &copy; ${new Date().getFullYear()} — Dirección Regional de Infraestructura</p>
          <p style="margin: 4px 0 0 0; color: #aaaaaa;">Este mensaje ha sido generado automáticamente por el sistema de notificaciones SMTP.</p>
        </td>
      </tr>

    </table>
  </body>
  </html>
  `;
}

export function generateOtpEmailHtml(params: {
  nombre: string;
  apellidos: string;
  otpCode: string;
  expiresMinutes?: number;
}): string {
  const { nombre, apellidos, otpCode, expiresMinutes = 5 } = params;

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Código de Seguridad 2FA OTP - GORE Lambayeque</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333333;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e0e0e0;">
      
      <!-- Header -->
      <tr>
        <td style="background-color: #91000A; padding: 25px 30px; text-align: left; color: #ffffff;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <h1 style="margin: 0; font-size: 19px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Gobierno Regional Lambayeque</h1>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #fcc0c4;">Autenticación de Doble Factor (2FA OTP) — Seguridad de Acceso</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Body Content -->
      <tr>
        <td style="padding: 30px;">
          <h2 style="margin-top: 0; color: #91000A; font-size: 17px; font-weight: 600;">Estimado(a) ${nombre} ${apellidos},</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #4a4a4a;">
            Se ha solicitado un inicio de sesión en su cuenta del **Sistema de Cuaderno de Incidencias Digital (Obras por Impuestos - Ley N° 29230)**.
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #4a4a4a;">
            Ingrese el siguiente código de verificación de 6 dígitos para completar su autenticación:
          </p>

          <!-- OTP Code Box -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0; text-align: center;">
            <tr>
              <td align="center">
                <div style="display: inline-block; background-color: #fff8f8; border: 2px dashed #91000A; border-radius: 8px; padding: 18px 36px;">
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #91000A;">
                    ${otpCode}
                  </span>
                </div>
              </td>
            </tr>
          </table>

          <p style="font-size: 13px; color: #555555; text-align: center; margin: 10px 0 20px 0;">
            ⏳ Este código es válido durante <strong>${expiresMinutes} minutos</strong> y es de un solo uso.
          </p>

          <div style="background-color: #fff3cd; border-left: 4px solid #ffebaa; padding: 12px 15px; border-radius: 4px; font-size: 12px; color: #856404; line-height: 1.5;">
            <strong>⚠️ ADVERTENCIA DE SEGURIDAD:</strong> Si usted no intentó iniciar sesión en la plataforma, por favor ignore este mensaje y notifique de inmediato al Administrador de Tecnologías de la Información.
          </div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background-color: #f8f9fa; padding: 15px 30px; text-align: center; border-top: 1px solid #eeeeee; font-size: 11px; color: #888888;">
          <p style="margin: 0;">Gobierno Regional Lambayeque &copy; ${new Date().getFullYear()} — Dirección Regional de Infraestructura</p>
          <p style="margin: 4px 0 0 0; color: #aaaaaa;">Sistema de Autenticación de Doble Factor 2FA OTP</p>
        </td>
      </tr>

    </table>
  </body>
  </html>
  `;
}

