'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CuadernoRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastId = localStorage.getItem('last_selected_project_id');
      if (lastId) {
        router.replace(`/proyectos/${lastId}`);
        return;
      }
      const savedProjects = localStorage.getItem('app_projects_list');
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id) {
            router.replace(`/proyectos/${parsed[0].id}`);
            return;
          }
        } catch (e) {}
      }
      router.replace('/proyectos');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F9F9]">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-8 h-8 border-4 border-[#91000A] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-gray-500 font-semibold font-display">Redirigiendo al Cuaderno Digital...</p>
      </div>
    </div>
  );
}
