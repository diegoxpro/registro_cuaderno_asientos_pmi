'use client';

/**
 * Acceso del cliente a los proyectos: siempre vía /api/projects (PostgreSQL).
 * La copia en localStorage ('app_projects_list') es solo una caché para otras pantallas;
 * nunca se usa como fuente de datos.
 */
import type { MockProject } from '@/lib/mockData';

const CACHE_KEY = 'app_projects_list';

function updateCache(projects: MockProject[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(projects));
  } catch {}
}

/** Proyectos visibles para el usuario de la sesión. Lanza un error si el servidor no responde. */
export async function fetchProjects(): Promise<MockProject[]> {
  const res = await fetch('/api/projects', { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'No se pudieron obtener los proyectos del servidor.');
  }
  const projects: MockProject[] = Array.isArray(data.projects) ? data.projects : [];
  updateCache(projects);
  return projects;
}

/** Crea (sin id existente) o actualiza un proyecto. Lanza un error con el mensaje del servidor. */
export async function saveProject(project: Partial<MockProject>): Promise<MockProject> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success || !data.project) {
    throw new Error(data.error || 'El proyecto no se pudo guardar en la base de datos.');
  }
  return data.project;
}

/** Carga masiva: crea o actualiza por CUI. Devuelve guardados y errores por proyecto. */
export async function saveProjectsBulk(
  projects: Partial<MockProject>[]
): Promise<{ saved: MockProject[]; errors: { cui: string; error: string }[] }> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projects }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 207) {
    throw new Error(data.error || 'No se pudo realizar la carga masiva.');
  }
  return { saved: data.projects || [], errors: data.errors || [] };
}
