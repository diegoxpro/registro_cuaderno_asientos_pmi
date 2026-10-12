'use client';

import { useEffect } from 'react';

export default function CleanStorageInitializer() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dataVersion = localStorage.getItem('app_data_version');
      if (dataVersion !== '2.0_clean') {
        localStorage.removeItem('app_projects_list');
        localStorage.removeItem('app_storyboard_milestones');
        localStorage.removeItem('app_notifications_list');
        localStorage.removeItem('app_user_project_assignments');
        
        // Limpiar todas las incidencias y archivos en caché local
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('custom_incidences_') || key.startsWith('app_archived_')) {
            localStorage.removeItem(key);
          }
        });
        
        localStorage.setItem('app_data_version', '2.0_clean');
      }
    }
  }, []);

  return null;
}
