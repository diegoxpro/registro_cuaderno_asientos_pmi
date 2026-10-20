/**
 * Reglas de adjuntos compartidas por el navegador y el servidor.
 */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB por archivo
export const MAX_UPLOAD_REQUEST_BYTES = 100 * 1024 * 1024; // 100 MB por envío (varios archivos); nginx admite 100M

// Extensiones permitidas y su tipo MIME (lista blanca)
export const ALLOWED_EXTENSIONS: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  dwg: 'application/acad',
  dxf: 'application/dxf',
  kml: 'application/vnd.google-earth.kml+xml',
  kmz: 'application/vnd.google-earth.kmz',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
};

// Tipos que el navegador puede mostrar sin riesgo dentro del visor (el resto se descarga)
const INLINE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']);

export function getExtension(fileName: string): string {
  return (fileName.split('.').pop() || '').toLowerCase().trim();
}

export function canDisplayInline(mime: string): boolean {
  return INLINE_TYPES.has(mime);
}

/** Valida nombre y tamaño. Devuelve el mensaje de error o null si es válido. */
export function validateUpload(fileName: string, size: number): string | null {
  const ext = getExtension(fileName);
  if (!ALLOWED_EXTENSIONS[ext]) {
    return `"${fileName}": tipo de archivo no permitido. Formatos aceptados: ${Object.keys(ALLOWED_EXTENSIONS).join(', ')}.`;
  }
  if (size <= 0) return `"${fileName}": el archivo está vacío.`;
  if (size > MAX_ATTACHMENT_BYTES) {
    return `"${fileName}": supera el tamaño máximo de ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB.`;
  }
  return null;
}
