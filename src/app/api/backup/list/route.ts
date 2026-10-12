import { NextRequest, NextResponse } from 'next/server';
import { getLocalBackupsList } from '@/lib/dbBackup';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const backups = await getLocalBackupsList();
    return NextResponse.json({ success: true, backups });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener la lista de backups.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ success: false, error: 'Nombre de archivo no especificado.' }, { status: 400 });
    }

    // Sanitizar nombre de archivo contra path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'storage', 'backups', safeFilename);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return NextResponse.json({ success: true, message: `Backup ${safeFilename} eliminado correctamente.` });
    } else {
      return NextResponse.json({ success: false, error: 'El archivo no existe.' }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Error eliminando backup.' }, { status: 500 });
  }
}
