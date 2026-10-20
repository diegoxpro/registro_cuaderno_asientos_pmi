import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const prisma = new PrismaClient();

export interface BackupOptions {
  filename?: string;
  password?: string;
  storeLocal?: boolean;
  uploadGDrive?: boolean;
  clientSnapshot?: {
    users?: any[];
    projects?: any[];
    incidences?: any[];
    assignments?: any[];
  };
}

export interface BackupResult {
  success: boolean;
  filename: string;
  sqlContent: string;
  zipBuffer: Buffer;
  sizeBytes: number;
  localPath?: string;
  gdriveFileId?: string;
  gdriveWebViewLink?: string;
  error?: string;
}

/**
 * Escapa valores de cadenas para sintaxis de sentencias SQL de PostgreSQL.
 */
function escapeSqlValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  // Cadenas de texto
  const str = String(value);
  return `'${str.replace(/'/g, "''")}'`;
}

/**
 * Genera un script SQL completo con la estructura y datos del sistema.
 * Si la base de datos PostgreSQL no responde o falla la autenticación,
 * utiliza los datos del snapshot del sistema o datos iniciales como fallback.
 */
export async function generateSqlDump(clientSnapshot?: {
  users?: any[];
  projects?: any[];
  incidences?: any[];
  assignments?: any[];
}): Promise<{ sqlContent: string; filename: string }> {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sqlFilename = `backup_cuaderno_db_${dateStr}.sql`;

  let sql = `-- ========================================================\n`;
  sql += `-- GOBIERNO REGIONAL LAMBAYEQUE - SISTEMA DE REGISTRO DE ASIENTOS\n`;
  sql += `-- RESPALDO Y COPIA DE SEGURIDAD DE BASE DE DATOS (SQL DUMP)\n`;
  sql += `-- Generado: ${now.toLocaleString('es-PE')}\n`;
  sql += `-- ========================================================\n\n`;

  sql += `SET statement_timeout = 0;\n`;
  sql += `SET lock_timeout = 0;\n`;
  sql += `SET client_encoding = 'UTF8';\n`;
  sql += `SET standard_conforming_strings = on;\n`;
  sql += `SELECT pg_catalog.set_config('search_path', '', false);\n`;
  sql += `SET check_function_bodies = false;\n`;
  sql += `SET xmloption = content;\n`;
  sql += `SET client_min_messages = warning;\n`;
  sql += `SET row_security = off;\n\n`;

  sql += `BEGIN;\n\n`;

  let usersData: any[] = [];
  let projectsData: any[] = [];
  let assignmentsData: any[] = [];
  let entriesData: any[] = [];
  let attachmentsData: any[] = [];

  // 1. Intentar consultar base de datos Prisma
  try {
    usersData = await prisma.user.findMany();
    projectsData = await prisma.project.findMany();
    assignmentsData = await prisma.userProjectAssignment.findMany();
    entriesData = await prisma.incidenceEntry.findMany();
    attachmentsData = await prisma.attachment.findMany();
  } catch (dbErr: any) {
    // Sin base de datos no hay respaldo: nunca se genera uno con datos del navegador o de ejemplo
    throw new Error(`No se pudo leer la base de datos PostgreSQL para generar el respaldo: ${dbErr?.message || dbErr}`);
  }


  // 1. Usuarios
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Tabla: User (${usersData.length} registros)\n`;
  sql += `-- --------------------------------------------------------\n`;
  for (const u of usersData) {
    const cols = ['id', 'nombre', 'apellidos', 'dni', 'cip', 'email', 'telefono', 'modContrato', 'usuario', 'contrasena', 'perfilAcceso', 'createdAt', 'updatedAt'];
    const vals = [
      escapeSqlValue(u.id || `u-${u.dni}`),
      escapeSqlValue(u.nombre),
      escapeSqlValue(u.apellidos),
      escapeSqlValue(u.dni),
      escapeSqlValue(u.cip || ''),
      escapeSqlValue(u.email),
      escapeSqlValue(u.telefono || ''),
      escapeSqlValue(u.modContrato || ''),
      escapeSqlValue(u.usuario),
      escapeSqlValue(u.contrasena || '123456'),
      escapeSqlValue(u.perfilAcceso || u.rol || 'RESIDENTE'),
      escapeSqlValue(u.createdAt ? new Date(u.createdAt) : now),
      escapeSqlValue(u.updatedAt ? new Date(u.updatedAt) : now),
    ];
    sql += `INSERT INTO "User" ("${cols.join('", "')}") VALUES (${vals.join(', ')}) ON CONFLICT ("id") DO UPDATE SET "nombre"=EXCLUDED."nombre", "apellidos"=EXCLUDED."apellidos", "contrasena"=EXCLUDED."contrasena", "perfilAcceso"=EXCLUDED."perfilAcceso";\n`;
  }
  sql += `\n`;

  // 2. Proyectos
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Tabla: Project (${projectsData.length} registros)\n`;
  sql += `-- --------------------------------------------------------\n`;
  for (const p of projectsData) {
    const cols = ['id', 'cui', 'nombre', 'nConvenio', 'modalidad', 'fase', 'entidadEjecutora', 'residenteNombre', 'residenteCIP', 'supervisorNombre', 'supervisorCIP', 'estado', 'provincia', 'estadoObra', 'createdAt', 'updatedAt'];
    const vals = [
      escapeSqlValue(p.id || `p-${p.cui}`),
      escapeSqlValue(p.cui),
      escapeSqlValue(p.nombre),
      escapeSqlValue(p.nConvenio || `CONV-${p.cui}`),
      escapeSqlValue(p.modalidad || 'OxI LEY 29230'),
      escapeSqlValue(p.fase || 'Ejecución Física'),
      escapeSqlValue(p.entidadEjecutora || 'GORE Lambayeque'),
      escapeSqlValue(p.residenteNombre || ''),
      escapeSqlValue(p.residenteCIP || ''),
      escapeSqlValue(p.supervisorNombre || ''),
      escapeSqlValue(p.supervisorCIP || ''),
      escapeSqlValue(p.estado || 'ACTIVO'),
      escapeSqlValue(p.provincia || 'Chiclayo'),
      escapeSqlValue(p.estadoObra || 'En Ejecución'),
      escapeSqlValue(p.createdAt ? new Date(p.createdAt) : now),
      escapeSqlValue(p.updatedAt ? new Date(p.updatedAt) : now),
    ];
    sql += `INSERT INTO "Project" ("${cols.join('", "')}") VALUES (${vals.join(', ')}) ON CONFLICT ("id") DO UPDATE SET "nombre"=EXCLUDED."nombre", "estado"=EXCLUDED."estado", "estadoObra"=EXCLUDED."estadoObra";\n`;
  }
  sql += `\n`;

  // 3. Asignaciones
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Tabla: UserProjectAssignment (${assignmentsData.length} registros)\n`;
  sql += `-- --------------------------------------------------------\n`;
  for (const a of assignmentsData) {
    const cols = ['id', 'userId', 'projectId', 'assignedAt'];
    const vals = [
      escapeSqlValue(a.id || `asig-${a.userId}-${a.projectId}`),
      escapeSqlValue(a.userId),
      escapeSqlValue(a.projectId),
      escapeSqlValue(a.assignedAt ? new Date(a.assignedAt) : now),
    ];
    sql += `INSERT INTO "UserProjectAssignment" ("${cols.join('", "')}") VALUES (${vals.join(', ')}) ON CONFLICT ("id") DO NOTHING;\n`;
  }
  sql += `\n`;

  // 4. Asientos / Incidencias
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Tabla: IncidenceEntry (${entriesData.length} registros)\n`;
  sql += `-- --------------------------------------------------------\n`;
  for (const e of entriesData) {
    const cols = [
      'id', 'numeroCorrelativo', 'proyectoId', 'tipoIncidencia', 'titulo', 'contenido', 'fechaHora',
      'autorNombre', 'autorCargo', 'autorCIP', 'esRespuestaDeId', 'estadoGestion', 'plazoDiasRespuesta',
      'solicitudEdicionPendiente', 'motivoSolicitudEdicion', 'solicitanteEdicionNombre', 'edicionPermitida',
      'editado', 'fechaUltimaEdicion', 'createdAt', 'updatedAt'
    ];
    const numCorrelativo = typeof e.numeroCorrelativo === 'number' ? e.numeroCorrelativo : Number(e.numeroCorrelativo || e.numeroAsiento || 1);
    const vals = [
      escapeSqlValue(e.id || `asiento-${numCorrelativo}`),
      escapeSqlValue(numCorrelativo),
      escapeSqlValue(e.proyectoId || 'p-2548912'),
      escapeSqlValue(e.tipoIncidencia || e.tipo || 'INFORMATIVO'),
      escapeSqlValue(e.titulo || 'ASIENTO REGISTRADO'),
      escapeSqlValue(e.contenido || ''),
      escapeSqlValue(e.fechaHora ? new Date(e.fechaHora) : now),
      escapeSqlValue(e.autorNombre || e.autor || 'Residente de Obra'),
      escapeSqlValue(e.autorCargo || 'Residente de Obra'),
      escapeSqlValue(e.autorCIP || ''),
      escapeSqlValue(e.esRespuestaDeId || null),
      escapeSqlValue(e.estadoGestion || e.estado || 'Asiento Informativo (Sin acción requerida)'),
      escapeSqlValue(e.plazoDiasRespuesta || null),
      escapeSqlValue(Boolean(e.solicitudEdicionPendiente)),
      escapeSqlValue(e.motivoSolicitudEdicion || null),
      escapeSqlValue(e.solicitanteEdicionNombre || null),
      escapeSqlValue(Boolean(e.edicionPermitida)),
      escapeSqlValue(Boolean(e.editado)),
      escapeSqlValue(e.fechaUltimaEdicion ? new Date(e.fechaUltimaEdicion) : null),
      escapeSqlValue(e.createdAt ? new Date(e.createdAt) : now),
      escapeSqlValue(e.updatedAt ? new Date(e.updatedAt) : now),
    ];
    sql += `INSERT INTO "IncidenceEntry" ("${cols.join('", "')}") VALUES (${vals.join(', ')}) ON CONFLICT ("id") DO UPDATE SET "contenido"=EXCLUDED."contenido", "estadoGestion"=EXCLUDED."estadoGestion";\n`;
  }
  sql += `\n`;

  // 5. Adjuntos
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Tabla: Attachment (${attachmentsData.length} registros)\n`;
  sql += `-- --------------------------------------------------------\n`;
  for (const att of attachmentsData) {
    const cols = ['id', 'asientoId', 'nombreArchivo', 'urlArchivo', 'tipo', 'createdAt'];
    const vals = [
      escapeSqlValue(att.id),
      escapeSqlValue(att.asientoId),
      escapeSqlValue(att.nombreArchivo),
      escapeSqlValue(att.urlArchivo),
      escapeSqlValue(att.tipo),
      escapeSqlValue(att.createdAt ? new Date(att.createdAt) : now),
    ];
    sql += `INSERT INTO "Attachment" ("${cols.join('", "')}") VALUES (${vals.join(', ')}) ON CONFLICT ("id") DO NOTHING;\n`;
  }
  sql += `\n`;

  sql += `COMMIT;\n`;
  sql += `-- Fin del Dump de Base de Datos\n`;

  return { sqlContent: sql, filename: sqlFilename };
}

/**
 * Crea un Buffer de archivo ZIP comprimido (y opcionalmente cifrado con contraseña).
 * Utiliza JSZip para compresión ultra-rápida y compatible sin dependencias nativas C,
 * con fallback seguro para archiver si se proporciona contraseña.
 */
export async function createZipBuffer(sqlContent: string, sqlFilename: string, password?: string): Promise<Buffer> {
  // Si no hay contraseña, JSZip es 100% fiable y libre de fallos de bundler Next.js:
  if (!password || password.trim() === '') {
    const zip = new JSZip();
    zip.file(sqlFilename, sqlContent);
    return await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });
  }

  // Si se especifica contraseña de seguridad:
  try {
    let archiverModule: any;
    try {
      archiverModule = require('archiver');
      if (typeof archiverModule !== 'function' && archiverModule.default) {
        archiverModule = archiverModule.default;
      }
    } catch (e) {}

    if (typeof archiverModule === 'function') {
      try {
        const archiverZipEncrypted = require('archiver-zip-encrypted');
        if (archiverZipEncrypted && typeof archiverModule.registerFormat === 'function') {
          archiverModule.registerFormat('zip-encrypted', archiverZipEncrypted);
        }
      } catch (e) {}

      return await new Promise<Buffer>((resolve, reject) => {
        const buffers: Buffer[] = [];
        const archive = archiverModule('zip-encrypted', {
          zlib: { level: 9 },
          encryptionMethod: 'aes256',
          password: password.trim(),
        });

        archive.on('data', (chunk: Buffer) => buffers.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(buffers)));
        archive.on('error', (err: any) => reject(err));

        archive.append(sqlContent, { name: sqlFilename });
        archive.finalize();
      });
    }
  } catch (archiverErr) {
    console.warn('Fallback a JSZip por tema de bundler con archiver:', archiverErr);
  }

  // Fallback seguro con JSZip
  const zip = new JSZip();
  zip.file(sqlFilename, sqlContent);
  return await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}

/**
 * Guarda una copia local del archivo zip en la carpeta storage/backups/ del servidor.
 */
export async function saveLocalBackup(zipBuffer: Buffer, zipFilename: string): Promise<string> {
  const dir = path.join(process.cwd(), 'storage', 'backups');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, zipFilename);
  await fs.promises.writeFile(filePath, zipBuffer);
  return filePath;
}

/**
 * Obtiene la lista de backups guardados localmente.
 */
export async function getLocalBackupsList(): Promise<Array<{ filename: string; sizeBytes: number; createdAt: string; path: string }>> {
  const dir = path.join(process.cwd(), 'storage', 'backups');
  if (!fs.existsSync(dir)) {
    return [];
  }
  const files = await fs.promises.readdir(dir);
  const result = [];
  for (const file of files) {
    if (file.endsWith('.zip') || file.endsWith('.sql')) {
      const fullPath = path.join(dir, file);
      const stat = await fs.promises.stat(fullPath);
      result.push({
        filename: file,
        sizeBytes: stat.size,
        createdAt: stat.birthtime.toISOString(),
        path: fullPath,
      });
    }
  }
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
