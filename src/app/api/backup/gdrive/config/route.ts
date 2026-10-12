import { NextRequest, NextResponse } from 'next/server';
import { getGDriveConfig, saveGDriveConfig, testGDriveConnection, GoogleDriveConfig } from '@/lib/gdrive';

export async function GET() {
  try {
    const config = getGDriveConfig();
    // Ocultar datos muy sensibles parcialmente en la vista previa
    return NextResponse.json({
      success: true,
      config: {
        ...config,
        clientSecret: config.clientSecret ? '••••••••' + config.clientSecret.slice(-4) : '',
        refreshToken: config.refreshToken ? '••••••••' + config.refreshToken.slice(-4) : '',
      },
      hasCredentials: Boolean(config.clientId && config.refreshToken),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, config } = body;

    if (action === 'test') {
      const currentConfig = getGDriveConfig();
      // Si enviaron contraseñas enmascaradas, conservar las guardadas
      const fullConfig: GoogleDriveConfig = {
        ...config,
        clientSecret: config.clientSecret?.includes('••••') ? currentConfig.clientSecret : config.clientSecret,
        refreshToken: config.refreshToken?.includes('••••') ? currentConfig.refreshToken : config.refreshToken,
      };
      const result = await testGDriveConnection(fullConfig);
      return NextResponse.json(result);
    }

    // Guardar configuración
    const currentConfig = getGDriveConfig();
    const newConfig: GoogleDriveConfig = {
      clientId: config.clientId || '',
      clientSecret: config.clientSecret?.includes('••••') ? currentConfig.clientSecret : (config.clientSecret || ''),
      refreshToken: config.refreshToken?.includes('••••') ? currentConfig.refreshToken : (config.refreshToken || ''),
      folderId: config.folderId || '',
      folderName: config.folderName || 'Backups_Cuaderno_Obra_GORE',
      autoBackupEnabled: Boolean(config.autoBackupEnabled),
    };

    saveGDriveConfig(newConfig);

    return NextResponse.json({
      success: true,
      message: 'Configuración de Google Drive guardada correctamente.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
