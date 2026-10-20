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
  // Solo existe en el servidor (hash). Nunca se envía al navegador.
  contrasena: string;
  rol: 'ADMINISTRADOR' | 'RESIDENTE' | 'SUPERVISOR_DE_OBRA' | 'JEFE_DE_PROYECTO' | 'SUPERVISOR_DE_PROYECTO';
  rolDisplay?: string;
  otpEnabled?: boolean;
}

/**
 * Usuarios conocidos por este navegador (caché que llena la Administración de Usuarios),
 * usada solo para autocompletar datos de residente/supervisor en los formularios.
 * No contiene contraseñas.
 */
export function getRegisteredUsers(): Omit<AppUser, 'contrasena'>[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('app_registered_users');
    const parsed = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return parsed.map(({ contrasena, ...rest }: AppUser) => rest);
  } catch {
    return [];
  }
}
