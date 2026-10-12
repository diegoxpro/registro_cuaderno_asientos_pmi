/**
 * Gestor de Autenticación de Doble Factor OTP (One-Time Password)
 * Sistema de Cuaderno de Incidencias Digital — GORE Lambayeque
 */

export interface OtpRecord {
  userId: string;
  identifier: string;
  email: string;
  code: string;
  createdAt: number;
  expiresAt: number; // Timestamp en milisegundos
  attempts: number;
}

// Almacenamiento en memoria global para el servidor Next.js
const globalForOtp = globalThis as unknown as {
  otpStore: Map<string, OtpRecord> | undefined;
};

const otpStore = globalForOtp.otpStore ?? new Map<string, OtpRecord>();
if (process.env.NODE_ENV !== 'production') globalForOtp.otpStore = otpStore;

/**
 * Genera un código numérico aleatorio de N dígitos (por defecto 6)
 */
export function generateRandomOtpCode(length: number = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

/**
 * Crea o actualiza un registro OTP para un usuario dado.
 * Duración por defecto: 5 minutos (300,000 ms)
 */
export function createOtpSession(params: {
  userId: string;
  identifier: string;
  email: string;
  durationMinutes?: number;
}): OtpRecord {
  const { userId, identifier, email, durationMinutes = 5 } = params;
  const cleanId = identifier.trim().toLowerCase();
  const code = generateRandomOtpCode(6);
  const now = Date.now();
  const expiresAt = now + durationMinutes * 60 * 1000;

  const record: OtpRecord = {
    userId,
    identifier: cleanId,
    email,
    code,
    createdAt: now,
    expiresAt,
    attempts: 0,
  };

  otpStore.set(cleanId, record);
  return record;
}

/**
 * Obtiene la sesión OTP activa para un usuario (si existe y no ha expirado)
 */
export function getActiveOtpSession(identifier: string): OtpRecord | null {
  const cleanId = identifier.trim().toLowerCase();
  const record = otpStore.get(cleanId);
  if (!record) return null;

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanId);
    return null;
  }

  return record;
}

/**
 * Verifica un código OTP ingresado por el usuario
 */
export function verifyOtpCode(identifier: string, inputCode: string): {
  success: boolean;
  message: string;
  expired?: boolean;
} {
  const cleanId = identifier.trim().toLowerCase();
  const cleanCode = inputCode.trim();
  const record = otpStore.get(cleanId);

  if (!record) {
    return {
      success: false,
      message: 'No hay un código OTP activo para esta cuenta o ha sido consumido. Solicite un nuevo código.',
    };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanId);
    return {
      success: false,
      expired: true,
      message: 'El código OTP ha expirado (validez de 5 minutos). Por favor solicite uno nuevo.',
    };
  }

  if (record.attempts >= 5) {
    otpStore.delete(cleanId);
    return {
      success: false,
      message: 'Ha superado el número máximo de intentos fallidos (5). Por seguridad, solicite un nuevo código.',
    };
  }

  record.attempts += 1;

  if (record.code !== cleanCode) {
    return {
      success: false,
      message: `El código ingresado es incorrecto. Intentos restantes: ${5 - record.attempts}`,
    };
  }

  // Éxito: Eliminar token usado para evitar reutilización (One Time)
  otpStore.delete(cleanId);
  return {
    success: true,
    message: 'Código de verificación OTP validado con éxito.',
  };
}

/**
 * Utilidades para almacenamiento local en el navegador (Fallback de testing offline / LocalStorage)
 */
const LOCAL_STORAGE_OTP_KEY = 'app_active_otp_session';

export function saveLocalOtpSession(record: OtpRecord): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_OTP_KEY, JSON.stringify(record));
    } catch (e) {
      console.error('Error al guardar sesión OTP local:', e);
    }
  }
}

export function getLocalOtpSession(identifier: string): OtpRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_OTP_KEY);
    if (saved) {
      const record: OtpRecord = JSON.parse(saved);
      if (record.identifier === identifier.trim().toLowerCase() && Date.now() <= record.expiresAt) {
        return record;
      }
    }
  } catch (e) {
    console.error('Error al obtener sesión OTP local:', e);
  }
  return null;
}

export function verifyLocalOtpCode(identifier: string, inputCode: string): { success: boolean; message: string } {
  const localRecord = getLocalOtpSession(identifier);
  if (!localRecord) {
    return {
      success: false,
      message: 'No existe un código OTP activo localmente o ha expirado. Reenvíe el código.',
    };
  }

  if (localRecord.code !== inputCode.trim()) {
    return {
      success: false,
      message: 'El código OTP de verificación es incorrecto.',
    };
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_OTP_KEY);
  }

  return {
    success: true,
    message: 'Código de verificación OTP validado con éxito.',
  };
}
