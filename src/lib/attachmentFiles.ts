/**
 * Archivos adjuntos de los asientos, guardados en el disco del servidor.
 * El registro de cada archivo vive en la tabla Attachment (PostgreSQL);
 * el contenido, en UPLOAD_DIR (fuera de /public: solo se sirve vía /api/attachments/[id]).
 */
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export { MAX_ATTACHMENT_BYTES, ALLOWED_EXTENSIONS, getExtension, canDisplayInline, validateUpload } from '@/lib/attachmentRules';

export function getUploadRoot(): string {
  return path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'adjuntos'));
}

/** Nombre limpio para mostrar/descargar (sin rutas ni caracteres de control). */
export function sanitizeDisplayName(fileName: string): string {
  const base = path.basename(String(fileName || 'archivo')).replace(/[\u0000-\u001f\u007f"\\/]/g, '_').trim();
  return base.slice(0, 200) || 'archivo';
}

/**
 * Guarda el contenido en disco y devuelve la ruta relativa a UPLOAD_DIR.
 * El nombre en disco es aleatorio: nunca se usa el nombre enviado por el usuario.
 */
export async function writeAttachmentFile(projectFolder: string, ext: string, data: Buffer): Promise<string> {
  const folder = String(projectFolder || 'sin-proyecto').replace(/[^a-zA-Z0-9_-]/g, '_');
  const relative = path.join(folder, `${randomUUID()}.${ext}`);
  const absolute = path.join(getUploadRoot(), relative);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, data, { flag: 'wx' });
  return relative.split(path.sep).join('/');
}

/** Ruta absoluta de un archivo guardado, verificando que no salga de UPLOAD_DIR. */
export function resolveStoredPath(relative: string): string | null {
  const root = getUploadRoot();
  const absolute = path.resolve(root, relative);
  if (absolute !== root && absolute.startsWith(root + path.sep)) return absolute;
  return null;
}

/** Elimina archivos del disco; ignora los que ya no existen. */
export async function removeAttachmentFiles(relativePaths: string[]): Promise<void> {
  for (const rel of relativePaths) {
    const absolute = rel ? resolveStoredPath(rel) : null;
    if (!absolute) continue;
    try {
      await fs.unlink(absolute);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('No se pudo eliminar el adjunto del disco:', rel, err);
      }
    }
  }
}
