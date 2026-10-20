import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { prisma } from '@/lib/prisma';
import { getAccessibleProjectKeys, normKey } from '@/lib/projectAccess';
import { canDisplayInline, resolveStoredPath } from '@/lib/attachmentFiles';

// GET /api/attachments/[id] - Descarga/visualiza un adjunto (requiere acceso al proyecto)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const allowed = await getAccessibleProjectKeys(req);
  if (!allowed) return NextResponse.json({ success: false, error: 'Sesión no válida.' }, { status: 401 });

  const att = await prisma.attachment.findUnique({
    where: { id },
    include: { asiento: { select: { proyectoId: true } } },
  });
  if (!att || !att.rutaArchivo) {
    return NextResponse.json({ success: false, error: 'El adjunto no existe o fue eliminado.' }, { status: 404 });
  }
  if (!allowed.has(normKey(att.asiento.proyectoId))) {
    return NextResponse.json({ success: false, error: 'No tiene acceso a este adjunto.' }, { status: 403 });
  }

  const absolute = resolveStoredPath(att.rutaArchivo);
  let data: Buffer;
  try {
    if (!absolute) throw new Error('Ruta inválida');
    data = await fs.readFile(absolute);
  } catch {
    return NextResponse.json({ success: false, error: 'El archivo no se encuentra en el servidor.' }, { status: 404 });
  }

  const forceDownload = new URL(req.url).searchParams.get('download') === '1';
  const disposition = !forceDownload && canDisplayInline(att.tipo) ? 'inline' : 'attachment';
  const encodedName = encodeURIComponent(att.nombreArchivo);
  const asciiName = att.nombreArchivo.replace(/[^\x20-\x7e]/g, '_');

  const headers: Record<string, string> = {
    'Content-Type': att.tipo || 'application/octet-stream',
    'Content-Length': String(data.length),
    'Content-Disposition': `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  // Aislar el contenido servido; el visor PDF de Chrome no funciona en modo sandbox
  if (att.tipo !== 'application/pdf') {
    headers['Content-Security-Policy'] = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox";
  }

  return new NextResponse(new Uint8Array(data), { headers });
}
