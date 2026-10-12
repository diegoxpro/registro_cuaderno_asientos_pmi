/**
 * Módulo de almacenamiento de adjuntos usando IndexedDB.
 * Permite guardar y recuperar archivos adjuntos (como Data URLs)
 * sin las limitaciones de localStorage (~5MB).
 * IndexedDB puede almacenar hasta cientos de MB.
 */

const DB_NAME = 'gore_cuaderno_digital_db';
const DB_VERSION = 1;
const STORE_NAME = 'adjuntos';

// Abrir (o crear) la base de datos IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    req.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    req.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Guardar un adjunto en IndexedDB.
 * @param id - Identificador único del adjunto
 * @param dataUrl - Data URL (base64) del archivo
 */
export async function saveAttachment(id: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ id, dataUrl, savedAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error saving attachment to IndexedDB:', err);
  }
}

/**
 * Recuperar un adjunto de IndexedDB por su ID.
 * @param id - Identificador único del adjunto
 * @returns Data URL del archivo, o null si no existe
 */
export async function getAttachment(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const result = req.result;
        resolve(result ? result.dataUrl : null);
      };
      req.onerror = () => {
        reject(req.error);
      };
    });
  } catch (err) {
    console.error('Error getting attachment from IndexedDB:', err);
    return null;
  }
}

/**
 * Eliminar un adjunto de IndexedDB.
 * @param id - Identificador único del adjunto
 */
export async function deleteAttachment(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error deleting attachment from IndexedDB:', err);
  }
}

/**
 * Prefijo especial para URLs de adjuntos almacenados en IndexedDB.
 * Cuando urlArchivo empieza con este prefijo, el ID que sigue es la clave en IndexedDB.
 */
export const IDB_URL_PREFIX = 'idb://';

/**
 * Construir una URL de referencia a IndexedDB.
 */
export function makeIdbUrl(id: string): string {
  return `${IDB_URL_PREFIX}${id}`;
}

/**
 * Verificar si una URL es una referencia a IndexedDB.
 */
export function isIdbUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith(IDB_URL_PREFIX);
}

/**
 * Extraer el ID de una URL de referencia a IndexedDB.
 */
export function getIdbId(url: string): string {
  return url.replace(IDB_URL_PREFIX, '');
}

/**
 * Convierte un Data URL (base64 o urlencoded) a un objeto Blob nativo.
 * Esto es crítico para Chromium/Chrome: Chrome no muestra PDFs en <object>/<iframe> si son data: URLs,
 * pero sí los muestra perfectamente si son blob: URLs (same-origin).
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  try {
    if (!dataUrl || !dataUrl.includes(',')) {
      return new Blob([], { type: 'application/octet-stream' });
    }
    const [header, data] = dataUrl.split(',');
    const mimeMatch = header.match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

    if (header.includes(';base64')) {
      const binaryStr = atob(data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return new Blob([bytes], { type: mimeType });
    } else {
      const text = decodeURIComponent(data);
      return new Blob([text], { type: mimeType });
    }
  } catch (err) {
    console.error('Error al convertir dataUrl a Blob:', err);
    return new Blob([], { type: 'application/octet-stream' });
  }
}

/**
 * Descarga de manera segura un archivo en el navegador.
 * Si es un data: URL, lo convierte primero a Blob para evitar que Chrome
 * ignore el atributo download y guarde el archivo con un UUID (ej. b51d67d3-...) sin extensión.
 */
export function downloadAttachment(urlOrData: string, fileName: string): void {
  if (!urlOrData) return;

  const finalFileName = fileName || 'archivo_adjunto.pdf';

  if (urlOrData.startsWith('data:')) {
    try {
      const blob = dataUrlToBlob(urlOrData);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = finalFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Liberar memoria tras la descarga
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      return;
    } catch (e) {
      console.error('Error en descarga por Blob:', e);
    }
  }

  // Para blob: URLs o URLs HTTP directas
  const a = document.createElement('a');
  a.href = urlOrData;
  a.download = finalFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
