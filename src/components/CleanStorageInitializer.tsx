'use client';

import { useEffect } from 'react';

export default function CleanStorageInitializer() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dataVersion = localStorage.getItem('app_data_version');
      if (dataVersion !== '3.0_clean') {
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
        
        localStorage.setItem('app_data_version', '3.0_clean');
      }

      // Garantizar que no queden notificaciones obsoletas que apuntan a proyectos inexistentes
      const savedProjectsStr = localStorage.getItem('app_projects_list');
      const validProjectIds = new Set<string>();
      if (savedProjectsStr) {
        try {
          const parsedProj = JSON.parse(savedProjectsStr);
          if (Array.isArray(parsedProj)) {
            parsedProj.forEach((p: any) => {
              if (p.id) validProjectIds.add(p.id);
              if (p.cui) validProjectIds.add(p.cui);
            });
          }
        } catch (e) {}
      }

      const notifStr = localStorage.getItem('app_notifications_list');
      if (notifStr) {
        try {
          const parsedNotifs = JSON.parse(notifStr);
          if (Array.isArray(parsedNotifs)) {
            const validNotifs = parsedNotifs.filter((n: any) =>
              n.proyectoId && validProjectIds.has(n.proyectoId) && !n.id.startsWith('notif-10')
            );
            if (validNotifs.length !== parsedNotifs.length) {
              localStorage.setItem('app_notifications_list', JSON.stringify(validNotifs));
            }
          } else {
            localStorage.removeItem('app_notifications_list');
          }
        } catch (e) {
          localStorage.removeItem('app_notifications_list');
        }
      }
    }
  }, []);

  return null;
}
