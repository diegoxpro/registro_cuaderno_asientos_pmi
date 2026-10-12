import { NextRequest, NextResponse } from 'next/server';
import { generateSqlDump, createZipBuffer, saveLocalBackup } from '@/lib/dbBackup';
import { uploadFileToGDrive, getGDriveConfig } from '@/lib/gdrive';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, storeLocal = true, uploadGDrive = false, downloadDirect = false, clientSnapshot } = body;

    // 1. Generar la extracción SQL
    const { sqlContent, filename: sqlFilename } = await generateSqlDump(clientSnapshot);

    // 2. Comprimir en ZIP (cifrado con contraseña si se especifica)
    const zipFilename = sqlFilename.replace(/\.sql$/, '.zip');
    const zipBuffer = await createZipBuffer(sqlContent, sqlFilename, password);

    let localPath: string | undefined;
    let gdriveResult: { fileId: string; webViewLink: string } | undefined;
    let gdriveError: string | undefined;

    // 3. Guardar en almacenamiento local del servidor
    if (storeLocal) {
      localPath = await saveLocalBackup(zipBuffer, zipFilename);
    }

    // 4. Subir a Google Drive si se solicitó
    if (uploadGDrive) {
      try {
        const gconfig = getGDriveConfig();
        gdriveResult = await uploadFileToGDrive(zipBuffer, zipFilename, 'application/zip', gconfig);
      } catch (err: any) {
        console.error('Error subiendo backup a Google Drive:', err);
        gdriveError = err.message || 'Falló la carga a Google Drive';
      }
    }

    // 5. Retornar respuesta
    if (downloadDirect) {
      return new NextResponse(zipBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${zipFilename}"`,
          'Content-Length': zipBuffer.length.toString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      filename: zipFilename,
      sizeBytes: zipBuffer.length,
      localPath,
      gdriveFileId: gdriveResult?.fileId,
      gdriveWebViewLink: gdriveResult?.webViewLink,
      gdriveError,
      isEncrypted: Boolean(password && password.trim().length > 0),
    });
  } catch (error: any) {
    console.error('Error procesando backup de base de datos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno al generar el backup.' },
      { status: 500 }
    );
  }
}
