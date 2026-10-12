import fs from 'fs';
import path from 'path';

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  folderId?: string;
  folderName: string;
  autoBackupEnabled: boolean;
}

export const DEFAULT_GDRIVE_CONFIG: GoogleDriveConfig = {
  clientId: '',
  clientSecret: '',
  refreshToken: '',
  folderId: '',
  folderName: 'Backups_Cuaderno_Obra_GORE',
  autoBackupEnabled: false,
};

const CONFIG_PATH = path.join(process.cwd(), 'storage', 'gdrive_config.json');

/**
 * Carga la configuración de Google Drive desde el servidor.
 */
export function getGDriveConfig(): GoogleDriveConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      return { ...DEFAULT_GDRIVE_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Error al leer configuración de Google Drive:', e);
  }
  return DEFAULT_GDRIVE_CONFIG;
}

/**
 * Guarda la configuración de Google Drive en el servidor.
 */
export function saveGDriveConfig(config: GoogleDriveConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Obtiene un Access Token fresco utilizando el Refresh Token de OAuth2.
 */
export async function getAccessToken(config: GoogleDriveConfig): Promise<string> {
  if (!config.clientId || !config.clientSecret || !config.refreshToken) {
    throw new Error('Faltan credenciales de Google Drive (Client ID, Client Secret o Refresh Token).');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(`Google OAuth error: ${data.error_description || data.error || 'Token inválido'}`);
  }

  return data.access_token;
}

/**
 * Prueba la conexión con Google Drive verificando las credenciales.
 */
export async function testGDriveConnection(config: GoogleDriveConfig): Promise<{ success: boolean; message: string }> {
  try {
    const accessToken = await getAccessToken(config);
    // Probar consultar información del usuario / archivos
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json();
      return {
        success: false,
        message: `Conexión fallida: ${errData.error?.message || res.statusText}`,
      };
    }

    const data = await res.json();
    const userEmail = data.user?.emailAddress || 'Desconocido';
    return {
      success: true,
      message: `Conexión exitosa con Google Drive. Cuenta: ${userEmail}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Error al conectar con Google Drive.',
    };
  }
}

/**
 * Busca o crea la carpeta de respaldos en Google Drive.
 */
async function getOrCreateBackupFolder(accessToken: string, folderName: string, customFolderId?: string): Promise<string> {
  if (customFolderId && customFolderId.trim() !== '') {
    return customFolderId.trim();
  }

  // Buscar si ya existe la carpeta por nombre
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
  }

  // Crear carpeta si no existe
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error('No se pudo crear la carpeta de respaldos en Google Drive.');
  }

  const folderData = await createRes.json();
  return folderData.id;
}

/**
 * Sube un archivo Buffer (ZIP/SQL) a Google Drive.
 */
export async function uploadFileToGDrive(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  config?: GoogleDriveConfig
): Promise<{ fileId: string; webViewLink: string }> {
  const cfg = config || getGDriveConfig();
  const accessToken = await getAccessToken(cfg);
  const targetFolderId = await getOrCreateBackupFolder(accessToken, cfg.folderName, cfg.folderId);

  const metadata = {
    name: filename,
    parents: [targetFolderId],
    mimeType: mimeType,
  };

  const boundary = 'foo_bar_baz_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body = Buffer.concat([
    Buffer.from(
      `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`
    ),
    Buffer.from(
      `${delimiter}Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`
    ),
    Buffer.from(fileBuffer.toString('base64')),
    Buffer.from(closeDelimiter),
  ]);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body,
    }
  );

  if (!uploadRes.ok) {
    const errData = await uploadRes.json();
    throw new Error(`Error al subir a Google Drive: ${errData.error?.message || uploadRes.statusText}`);
  }

  const fileData = await uploadRes.json();
  return {
    fileId: fileData.id,
    webViewLink: fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`,
  };
}
