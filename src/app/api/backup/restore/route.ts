import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import unzipper from 'zlib';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const filename = formData.get('filename') as string | null;

    let sqlContent = '';

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (file.name.endsWith('.sql')) {
        sqlContent = buffer.toString('utf-8');
      } else {
        return NextResponse.json(
          { success: false, error: 'Por razones de seguridad, suba directamente el archivo .sql extraído.' },
          { status: 400 }
        );
      }
    } else if (filename) {
      const safeFilename = path.basename(filename);
      const filePath = path.join(process.cwd(), 'storage', 'backups', safeFilename);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ success: false, error: 'El archivo de backup no existe en el servidor.' }, { status: 404 });
      }
      if (safeFilename.endsWith('.sql')) {
        sqlContent = await fs.promises.readFile(filePath, 'utf-8');
      } else {
        return NextResponse.json(
          { success: false, error: 'Extraiga el archivo .sql del archivo .zip antes de restaurar.' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json({ success: false, error: 'No se proporcionó ningún archivo ni nombre de backup.' }, { status: 400 });
    }

    if (!sqlContent || sqlContent.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'El contenido SQL del backup está vacío.' }, { status: 400 });
    }

    // Ejecutar sentencias SQL separadas por ;
    const statements = sqlContent
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--') && !s.startsWith('SET ') && !s.startsWith('SELECT '));

    let executedCount = 0;
    for (const stmt of statements) {
      if (stmt.toUpperCase() === 'BEGIN' || stmt.toUpperCase() === 'COMMIT') continue;
      try {
        await prisma.$executeRawUnsafe(stmt);
        executedCount++;
      } catch (err: any) {
        console.warn(`[WARN] Error ejecutando sentencia de restauración: ${stmt.slice(0, 80)}...`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Base de datos procesada correctamente. Sentencias ejecutadas: ${executedCount}.`,
    });
  } catch (error: any) {
    console.error('Error restaurando base de datos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al ejecutar la restauración.' },
      { status: 500 }
    );
  }
}
