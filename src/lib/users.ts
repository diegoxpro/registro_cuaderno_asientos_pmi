export interface AppUser {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  cip?: string;
  email: string;
  telefono: string;
  modContrato?: string;
  usuario: string;
  contrasena: string;
  rol: 'ADMINISTRADOR' | 'RESIDENTE' | 'SUPERVISOR_DE_OBRA' | 'JEFE_DE_PROYECTO' | 'SUPERVISOR_DE_PROYECTO';
  rolDisplay?: string;
  otpEnabled?: boolean;
}

export const INITIAL_REGISTERED_USERS: AppUser[] = [
  {
    id: 'u-1',
    nombre: 'Carlos',
    apellidos: 'Mendoza Silva',
    dni: '70123456',
    cip: 'CIP-112233',
    email: 'administrador@regionlambayeque.gob.pe',
    telefono: '912345678',
    modContrato: 'Nombrado 276',
    usuario: 'admin',
    contrasena: 'admin123',
    rol: 'ADMINISTRADOR',
    rolDisplay: 'Administrador',
    otpEnabled: true,
  },
  {
    id: 'u-jleon',
    nombre: 'Jorge',
    apellidos: 'León',
    dni: '74859612',
    cip: 'CIP-234567',
    email: 'jleon@regionlambayeque.gob.pe',
    telefono: '987654321',
    modContrato: 'CAS',
    usuario: 'jleon',
    contrasena: 'Jleon26',
    rol: 'RESIDENTE',
    rolDisplay: 'Residente',
    otpEnabled: false,
  },
];

export function getRegisteredUsers(): AppUser[] {
  if (typeof window === 'undefined') {
    return INITIAL_REGISTERED_USERS;
  }
  try {
    const saved = localStorage.getItem('app_registered_users');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Garantizar que los usuarios semilla siempre estén presentes
        const idSet = new Set(parsed.map((u: AppUser) => (u.usuario || u.dni || '').toLowerCase()));
        const missingSeeds = INITIAL_REGISTERED_USERS.filter(
          (seed) => !idSet.has(seed.usuario.toLowerCase()) && !idSet.has(seed.dni.toLowerCase())
        );
        return [...parsed, ...missingSeeds];
      }
    }
  } catch (e) {
    console.error('Error al leer usuarios de localStorage', e);
  }
  return INITIAL_REGISTERED_USERS;
}

export function saveRegisteredUsers(users: AppUser[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('app_registered_users', JSON.stringify(users));
    } catch (e) {
      console.error('Error al guardar usuarios en localStorage', e);
    }
  }
}

export interface ValidationResult {
  success: boolean;
  errorType?: 'USER_NOT_FOUND' | 'INVALID_PASSWORD' | 'UNKNOWN';
  message?: string;
  user?: AppUser;
}

export function validateLoginCredentials(identifier: string, passwordAttempt: string): ValidationResult {
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanPassword = String(passwordAttempt || '').trim();
  const users = getRegisteredUsers();

  const foundUser = users.find(
    (u) =>
      (u.dni && u.dni.trim().toLowerCase() === cleanId) ||
      (u.usuario && u.usuario.trim().toLowerCase() === cleanId) ||
      (u.email && u.email.trim().toLowerCase() === cleanId)
  );

  if (!foundUser) {
    return {
      success: false,
      errorType: 'USER_NOT_FOUND',
      message: 'El DNI o usuario ingresado no se encuentra registrado en el sistema.',
    };
  }

  if (String(foundUser.contrasena || '').trim() !== cleanPassword) {
    return {
      success: false,
      errorType: 'INVALID_PASSWORD',
      message: 'La contraseña ingresada es incorrecta. Por favor intente nuevamente.',
    };
  }

  return {
    success: true,
    user: foundUser,
  };
}
