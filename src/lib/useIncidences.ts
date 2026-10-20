'use client';

/**
 * Acceso del cliente a los asientos: siempre vía /api/incidences (PostgreSQL).
 * No se guarda nada en localStorage.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MockIncidenceEntry } from '@/lib/mockData';

const REFRESH_INTERVAL_MS = 15000;

export async function fetchIncidences(projectId: string): Promise<MockIncidenceEntry[]> {
  const res = await fetch(`/api/incidences?projectId=${encodeURIComponent(projectId)}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'No se pudieron obtener los asientos del servidor.');
  }
  return Array.isArray(data.incidences) ? data.incidences : [];
}

/** Crea o actualiza un asiento. Lanza un error con el mensaje del servidor si no se guardó. */
export async function saveIncidence(payload: Record<string, unknown>): Promise<MockIncidenceEntry> {
  const res = await fetch('/api/incidences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success || !data.incidence) {
    throw new Error(data.error || 'El asiento no se pudo guardar en la base de datos.');
  }
  return data.incidence;
}

/** Sube archivos adjuntos de un asiento ya guardado. Lanza un error con el mensaje del servidor. */
export async function uploadAttachments(asientoId: string, files: File[]): Promise<MockIncidenceEntry['adjuntos']> {
  if (files.length === 0) return [];
  const form = new FormData();
  form.append('asientoId', asientoId);
  files.forEach((f) => form.append('file', f, f.name));
  const res = await fetch('/api/attachments', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'No se pudieron subir los adjuntos.');
  }
  return data.adjuntos || [];
}

/**
 * Asientos de un proyecto leídos de la base de datos. Se recargan al volver a la pestaña
 * y cada 15 s, de modo que altas, cambios y eliminaciones hechas por otros (o directamente
 * en la BD) se reflejan sin recargar la página.
 */
export function useIncidences(projectId: string | undefined | null) {
  const [incidences, setIncidences] = useState<MockIncidenceEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(projectId));
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const reload = useCallback(async () => {
    if (!projectId) {
      setIncidences([]);
      setLoading(false);
      return;
    }
    const seq = ++requestSeq.current;
    try {
      const list = await fetchIncidences(projectId);
      if (seq !== requestSeq.current) return; // respuesta obsoleta
      list.sort((a, b) => a.numeroCorrelativo - b.numeroCorrelativo);
      setIncidences(list);
      setError(null);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err instanceof Error ? err.message : 'Error al cargar los asientos.');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    purgeLegacyIncidenceCache();
    setLoading(Boolean(projectId));
    setIncidences([]);
    reload();

    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', reload);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', reload);
    };
  }, [projectId, reload]);

  return { incidences, setIncidences, loading, error, reload };
}

/** Elimina del navegador las copias antiguas de asientos que guardaban versiones previas. */
export function purgeLegacyIncidenceCache() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('custom_incidences') || k === 'app_incidences_list')
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}
