'use client';

import { useEffect } from 'react';

// Al cambiar esta versión se ejecuta una limpieza única en cada navegador
const CLEAN_VERSION = '6.0_sin_credenciales';

export default function CleanStorageInitializer() {
  useEffect(() => {
    try {
      if (localStorage.getItem('app_data_version') !== CLEAN_VERSION) {
        // Versiones anteriores copiaban aquí usuarios con contraseñas en texto plano:
        // se descarta la lista completa (la Administración de Usuarios la vuelve a llenar sin contraseñas)
        localStorage.removeItem('app_registered_users');
        localStorage.removeItem('app_active_otp_session');

        // Claves obsoletas de versiones anteriores
        ['app_user_assignments', 'app_storyboard_list', 'app_archivos_list', 'admin_notifications'].forEach((k) =>
          localStorage.removeItem(k)
        );
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('mock_incidences_') || key.startsWith('seat_edit_req_') || key.startsWith('otp_')) {
            localStorage.removeItem(key);
          }
        });

        localStorage.setItem('app_data_version', CLEAN_VERSION);
      }

      // Salvaguarda continua: nunca conservar contraseñas en la lista de usuarios del navegador
      const savedUsers = localStorage.getItem('app_registered_users');
      if (savedUsers && savedUsers.includes('"contrasena"')) {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const clean = parsed.map(({ contrasena, ...rest }: Record<string, unknown>) => rest);
          localStorage.setItem('app_registered_users', JSON.stringify(clean));
        } else {
          localStorage.removeItem('app_registered_users');
        }
      }

      // Salvaguarda continua: eliminar notificaciones huérfanas
      const notifStr = localStorage.getItem('app_notifications_list');
      if (notifStr) {
        const parsed = JSON.parse(notifStr);
        if (!Array.isArray(parsed) || parsed.length === 0) localStorage.removeItem('app_notifications_list');
      }
    } catch {
      // localStorage no disponible o datos corruptos: no bloquear la aplicación
    }
  }, []);

  return null;
}
