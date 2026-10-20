import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/serverSession';
import { getAccessibleProjectKeys, normKey } from '@/lib/projectAccess';
import {
  ALLOWED_EXTENSIONS,
  getExtension,
  sanitizeDisplayName,
  validateUpload,
  writeAttachmentFile,
  removeAttachmentFiles,
} from '@/lib/attachmentFiles';
import { MAX_UPLOAD_REQUEST_BYTES } from '@/lib/attachmentRules';

const NO_STORE = { 'Cache-Control': 'no-store' };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

// POST /api/attachments (multipart/form-data: asientoId, file[...]) - Sube adjuntos de un asiento
export async function POST(req: Request) {
  const writtenPaths: string[] = [];
  try {
    // Esta ruta está excluida del middleware (subidas grandes): verifica la sesión aquí mismo
    const session = await requireSession(req);
    const allowed = session ? await getAccessibleProjectKeys(req, session) : null;
    if (!session || !allowed) return json({ success: false, error: 'Sesión no válida.' }, 401);

    // Rechazar envíos demasiado grandes antes de leerlos
    const declaredSize = Number(req.headers.get('content-length') || 0);
    if (declaredSize > MAX_UPLOAD_REQUEST_BYTES) {
      return json(
        { success: false, error: `El envío supera ${MAX_UPLOAD_REQUEST_BYTES / (1024 * 1024)} MB. Suba los archivos en varias partes.` },
        413
      );
    }

    const form = await req.formData();
    const asientoId = String(form.get('asientoId') || '').trim();
    const files = form.getAll('file').filter((f): f is File => typeof f === 'object' && f !== null && 'arrayBuffer' in f);

    if (!asientoId) return json({ success: false, error: 'Debe indicar el asiento (asientoId).' }, 400);
    if (files.length === 0) return json({ success: false, error: 'No se recibió ningún archivo.' }, 400);

    const asiento = await prisma.incidenceEntry.findUnique({
      where: { id: asientoId },
      select: { id: true, proyecto: { select: { id: true, cui: true } } },
    });
    if (!asiento) {
      return json({ success: false, notFound: true, error: 'El asiento no existe o fue eliminado.' }, 404);
    }
    if (!allowed.has(normKey(asiento.proyecto.id))) {
      return json({ success: false, error: 'No tiene acceso a este proyecto.' }, 403);
    }

    // Validar todos antes de guardar ninguno
    for (const file of files) {
      const problem = validateUpload(file.name, file.size);
      if (problem) return json({ success: false, error: problem }, 400);
    }

    const saved = [];
    for (const file of files) {
      const ext = getExtension(file.name);
      const mime = ALLOWED_EXTENSIONS[ext];
      const rutaArchivo = await writeAttachmentFile(asiento.proyecto.cui, ext, Buffer.from(await file.arrayBuffer()));
      writtenPaths.push(rutaArchivo);

      const row = await prisma.attachment.create({
        data: {
          asientoId: asiento.id,
          nombreArchivo: sanitizeDisplayName(file.name),
          urlArchivo: '',
          tipo: mime,
          rutaArchivo,
          tamanoBytes: file.size,
          subidoPor: session.usuario || session.dni,
        },
      });
      const withUrl = await prisma.attachment.update({
        where: { id: row.id },
        data: { urlArchivo: `/api/attachments/${row.id}` },
      });
      saved.push({ id: withUrl.id, nombreArchivo: withUrl.nombreArchivo, urlArchivo: withUrl.urlArchivo, tipo: withUrl.tipo });
    }

    return json({ success: true, adjuntos: saved });
  } catch (error) {
    console.error('Error al subir adjuntos en /api/attachments:', error);
    // Si algo falló a mitad, no dejar archivos ni registros huérfanos de esta subida
    if (writtenPaths.length > 0) {
      await prisma.attachment.deleteMany({ where: { rutaArchivo: { in: writtenPaths } } }).catch(() => {});
      await removeAttachmentFiles(writtenPaths);
    }
    return json({ success: false, error: 'No se pudieron guardar los adjuntos en el servidor. Intente nuevamente.' }, 500);
  }
}
