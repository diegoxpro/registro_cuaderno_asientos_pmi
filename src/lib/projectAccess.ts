import { getServerProjects } from '@/lib/serverProjectStorage';
import { getRequestSession, type SessionPayload } from '@/lib/session';

export const normKey = (v: unknown) => String(v || '').toLowerCase().trim();

/** Identificadores (id y CUI) de los proyectos visibles para el usuario de la sesión, o null sin sesión. */
export async function getAccessibleProjectKeys(
  req: Request,
  knownSession?: Omit<SessionPayload, 'exp'> | null
): Promise<Set<string> | null> {
  const session = knownSession ?? getRequestSession(req);
  if (!session) return null;
  const projects = await getServerProjects({ userDni: session.dni, role: session.rol });
  const keys = new Set<string>();
  for (const p of projects) {
    if (p.id) keys.add(normKey(p.id));
    if (p.cui) keys.add(normKey(p.cui));
  }
  return keys;
}
