'use client';

import { useEffect } from 'react';
import { INITIAL_REGISTERED_USERS } from '@/lib/users';

const CLEAN_VERSION = '5.0_clean_only_admin';

export default function CleanStorageInitializer() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dataVersion = localStorage.getItem('app_data_version');
      if (dataVersion !== CLEAN_VERSION) {
        // 1. Eliminar listas de proyectos y asientos
        localStorage.removeItem('app_projects_list');
        localStorage.removeItem('app_incidences_list');
        localStorage.removeItem('last_selected_project_id');

        // 2. Eliminar asignaciones de proyectos a usuarios
        localStorage.removeItem('app_user_project_assignments');
        localStorage.removeItem('app_user_assignments');

        // 3. Eliminar hitos de storyboard y archivos
        localStorage.removeItem('app_storyboard_milestones');
        localStorage.removeItem('app_storyboard_list');
        localStorage.removeItem('app_archivos_list');

        // 4. Eliminar notificaciones
        localStorage.removeItem('app_notifications_list');
        localStorage.removeItem('admin_notifications');

        // 5. Limpiar cualquier incidencia personalizada, archivos temporales, respaldos y solicitudes
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith('custom_incidences_') ||
            key.startsWith('app_archived_') ||
            key.startsWith('mock_incidences_') ||
            key.startsWith('seat_edit_req_') ||
            key.startsWith('otp_')
          ) {
            localStorage.removeItem(key);
          }
        });

        // 6. Dejar ÚNICAMENTE al usuario Administrador en la lista de usuarios registrados
        localStorage.setItem('app_registered_users', JSON.stringify(INITIAL_REGISTERED_USERS));

        // 7. Si el usuario actual en sesión no es el administrador, resetear sesión al Administrador
        const currentDni = localStorage.getItem('user_dni');
        if (currentDni && currentDni !== '70123456') {
          localStorage.setItem('user_role', 'ADMINISTRADOR');
          localStorage.setItem('user_dni', '70123456');
          localStorage.setItem('user_name', 'Carlos Mendoza Silva');
          localStorage.setItem('user_account', 'admin');
          localStorage.setItem('user_id', 'u-1');
          localStorage.setItem('user_email', 'administrador@regionlambayeque.gob.pe');
        }

        // 8. Marcar versión de datos limpia
        localStorage.setItem('app_data_version', CLEAN_VERSION);
      }

      // Salvaguarda continua: asegurar que la lista de usuarios siempre tenga al menos al Administrador
      const savedUsers = localStorage.getItem('app_registered_users');
      if (!savedUsers) {
        localStorage.setItem('app_registered_users', JSON.stringify(INITIAL_REGISTERED_USERS));
      }

      // Salvaguarda continua: eliminar notificaciones huérfanas
      const notifStr = localStorage.getItem('app_notifications_list');
      if (notifStr) {
        try {
          const parsed = JSON.parse(notifStr);
          if (!Array.isArray(parsed) || parsed.length === 0) {
            localStorage.removeItem('app_notifications_list');
          }
        } catch {
          localStorage.removeItem('app_notifications_list');
        }
      }
    }
  }, []);

  return null;
}

