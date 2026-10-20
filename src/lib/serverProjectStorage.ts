import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { MockProject } from '@/lib/mockData';
import { fixUtf8Mojibake } from '@/lib/utf8Utils';

const STORAGE_DIR = path.join(process.cwd(), 'storage');
const PROJECTS_FILE = path.join(STORAGE_DIR, 'projects.json');
const ASSIGNMENTS_FILE = path.join(STORAGE_DIR, 'assignments.json');

let isDbAvailable = true;
let lastDbAttempt = 0;
const DB_RETRY_COOLDOWN_MS = 60000;

function canAttemptDb(): boolean {
  if (isDbAvailable) return true;
  return Date.now() - lastDbAttempt > DB_RETRY_COOLDOWN_MS;
}

function markDbSuccess() {
  isDbAvailable = true;
}

function markDbFailure() {
  isDbAvailable = false;
  lastDbAttempt = Date.now();
}

// Lectura de archivo local de proyectos
async function readProjectsFile(): Promise<MockProject[]> {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    if (!fs.existsSync(PROJECTS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(PROJECTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Error al leer storage/projects.json:', err);
  }
  return [];
}

// Escritura de archivo local de proyectos
async function writeProjectsFile(projects: MockProject[]): Promise<void> {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error al guardar en storage/projects.json:', err);
  }
}

// Lectura de archivo local de asignaciones
export async function readAssignmentsFile(): Promise<any[]> {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    if (!fs.existsSync(ASSIGNMENTS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(ASSIGNMENTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Error al leer storage/assignments.json:', err);
  }
  return [];
}

// Escritura de archivo local de asignaciones
export async function writeAssignmentsFile(assignments: any[]): Promise<void> {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    fs.writeFileSync(ASSIGNMENTS_FILE, JSON.stringify(assignments, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error al guardar en storage/assignments.json:', err);
  }
}

function normalizeState(st?: string): 'ACTIVO' | 'PAUSADO' | 'CONCLUIDO' {
  const upper = String(st || '').toUpperCase().trim();
  if (upper === 'CONCLUIDO' || upper.includes('CONCLU') || upper.includes('ARCHIV')) return 'CONCLUIDO';
  if (upper === 'PAUSADO' || upper.includes('PAUSA')) return 'PAUSADO';
  return 'ACTIVO';
}

// Obtener todos los proyectos del servidor con filtrado RBAC
export async function getServerProjects(filters?: { userDni?: string; role?: string }): Promise<MockProject[]> {
  const projectMap = new Map<string, MockProject>();
  // DNIs asignados a cada proyecto en la tabla UserProjectAssignment (clave: cui o id)
  const dbAssignedDnis = new Map<string, Set<string>>();

  // 1. Cargar proyectos desde archivo persistente
  const fileProjects = await readProjectsFile();
  for (const p of fileProjects) {
    if (p.cui || p.id) {
      projectMap.set(p.cui || p.id, {
        ...p,
        nombre: fixUtf8Mojibake(p.nombre),
        fase: fixUtf8Mojibake(p.fase),
        entidadEjecutora: fixUtf8Mojibake(p.entidadEjecutora),
        entidadSupervisora: p.entidadSupervisora ? fixUtf8Mojibake(p.entidadSupervisora) : undefined,
        distrito: p.distrito ? fixUtf8Mojibake(p.distrito) : undefined,
        localidad: p.localidad ? fixUtf8Mojibake(p.localidad) : undefined,
        residenteNombre: p.residenteNombre ? fixUtf8Mojibake(p.residenteNombre) : null,
        supervisorNombre: p.supervisorNombre ? fixUtf8Mojibake(p.supervisorNombre) : null,
        supervisorEmpresa: p.supervisorEmpresa ? fixUtf8Mojibake(p.supervisorEmpresa) : undefined,
        provincia: p.provincia ? fixUtf8Mojibake(p.provincia) : 'Chiclayo',
        estadoObra: fixUtf8Mojibake(p.estadoObra),
      });
    }
  }

  // 2. Cargar proyectos desde base de datos PostgreSQL Prisma (si está disponible)
  if (canAttemptDb()) {
    try {
      const dbProjects = await prisma.project.findMany({
        include: {
          asientos: {
            select: { id: true },
          },
          asignaciones: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      markDbSuccess();

      for (const dp of dbProjects) {
        const mapped: MockProject = {
          id: dp.id,
          cui: dp.cui,
          nombre: fixUtf8Mojibake(dp.nombre),
          nConvenio: fixUtf8Mojibake(dp.nConvenio),
          modalidad: dp.modalidad || 'OxI LEY 29230',
          fase: fixUtf8Mojibake(dp.fase || 'Ejecución Física'),
          entidadEjecutora: fixUtf8Mojibake(dp.entidadEjecutora),
          entidadSupervisora: dp.entidadSupervisora ? fixUtf8Mojibake(dp.entidadSupervisora) : undefined,
          montoInversion: dp.montoInversion || undefined,
          monto: dp.monto || dp.montoInversion || undefined,
          plazoDias: dp.plazoDias || undefined,
          plazo: dp.plazo || dp.plazoDias || undefined,
          fechaInicio: dp.fechaInicio || undefined,
          distrito: dp.distrito ? fixUtf8Mojibake(dp.distrito) : undefined,
          localidad: dp.localidad ? fixUtf8Mojibake(dp.localidad) : undefined,
          residenteNombre: dp.residenteNombre ? fixUtf8Mojibake(dp.residenteNombre) : null,
          residenteCIP: dp.residenteCIP,
          residenteDni: dp.residenteDni || undefined,
          residenteCelular: dp.residenteCelular || undefined,
          residenteEmail: dp.residenteEmail || undefined,
          supervisorNombre: dp.supervisorNombre ? fixUtf8Mojibake(dp.supervisorNombre) : null,
          supervisorCIP: dp.supervisorCIP,
          supervisorDni: dp.supervisorDni || undefined,
          supervisorEmpresa: dp.supervisorEmpresa ? fixUtf8Mojibake(dp.supervisorEmpresa) : undefined,
          supervisorEmail: dp.supervisorEmail || undefined,
          estado: normalizeState(dp.estado),
          provincia: dp.provincia ? fixUtf8Mojibake(dp.provincia) : 'Chiclayo',
          estadoObra: fixUtf8Mojibake(dp.estadoObra || 'En Ejecución'),
          asientosCount: dp.asientos?.length || 0,
          archivado: Boolean(dp.archivado),
          fechaArchivado: dp.fechaArchivado || undefined,
          archivadoPor: dp.archivadoPor ? fixUtf8Mojibake(dp.archivadoPor) : undefined,
        };

        projectMap.set(mapped.cui || mapped.id, mapped);
        dbAssignedDnis.set(
          mapped.cui || mapped.id,
          new Set((dp.asignaciones || []).map((a) => String(a.user?.dni || '').trim().toLowerCase()))
        );
      }
    } catch (dbErr) {
      console.warn('Prisma DB no disponible al consultar proyectos, usando archivo persistente:', dbErr);
      markDbFailure();
    }
  }

  const allProjects = Array.from(projectMap.values());

  // 3. Filtrado por rol y asignaciones del usuario
  const roleUpper = String(filters?.role || '').toUpperCase().trim();
  const cleanDni = String(filters?.userDni || '').trim().toLowerCase();

  const isFullAdmin =
    roleUpper.includes('ADMIN') ||
    roleUpper.includes('JEFE') ||
    roleUpper === 'ADMINISTRADOR';

  // Administradores y Jefes de Proyecto ven TODOS los proyectos
  if (isFullAdmin) {
    return allProjects;
  }

  // Para usuarios con rol específico (Residente, Supervisor, etc.): solo proyectos asignados
  // o donde figuran como residente/supervisor. Sin coincidencias no se muestra ninguno.
  if (!cleanDni) return [];

  const fileAssignments = await readAssignmentsFile();
  const userAssignment = fileAssignments.find(
    (a: any) =>
      (a.dni && String(a.dni).trim().toLowerCase() === cleanDni) ||
      (a.userId && String(a.userId).trim().toLowerCase() === cleanDni)
  );
  const fileAssignedIds = new Set<string>(
    Array.isArray(userAssignment?.assignedProjectIds)
      ? userAssignment.assignedProjectIds.map((id: string) => String(id).toLowerCase())
      : []
  );

  return allProjects.filter((p) => {
    const isFileAssigned = fileAssignedIds.has(String(p.id).toLowerCase()) || fileAssignedIds.has(String(p.cui).toLowerCase());
    const isDbAssigned = dbAssignedDnis.get(p.cui || p.id)?.has(cleanDni) ?? false;
    const isResident = p.residenteDni && String(p.residenteDni).trim().toLowerCase() === cleanDni;
    const isSupervisor = p.supervisorDni && String(p.supervisorDni).trim().toLowerCase() === cleanDni;
    return isFileAssigned || isDbAssigned || isResident || isSupervisor;
  });
}

// Guardar o actualizar un proyecto en el servidor y en la base de datos
export async function saveServerProject(projectData: Partial<MockProject>): Promise<MockProject> {
  const cleanCui = String(projectData.cui || '').trim();
  if (!cleanCui) {
    throw new Error('El CUI del proyecto es obligatorio.');
  }

  const cleanNombre = fixUtf8Mojibake(String(projectData.nombre || '').trim().toUpperCase() || 'PROYECTO DE INVERSIÓN');
  const cleanConvenio = fixUtf8Mojibake(String(projectData.nConvenio || '').trim() || `CONVENIO OXI-${cleanCui}`);
  const cleanModalidad = fixUtf8Mojibake(String(projectData.modalidad || 'OxI LEY 29230').trim());
  const cleanFase = fixUtf8Mojibake(String(projectData.fase || 'Ejecución Física').trim());
  const cleanEjecutora = fixUtf8Mojibake(String(projectData.entidadEjecutora || 'Entidad Ejecutora S.A.C.').trim());
  const cleanEstado = normalizeState(projectData.estado);
  const cleanProvincia = fixUtf8Mojibake(String(projectData.provincia || 'Chiclayo').trim());
  const cleanEstadoObra = fixUtf8Mojibake(String(projectData.estadoObra || 'En Ejecución').trim());

  const allProjects = await readProjectsFile();
  const existingIndex = allProjects.findIndex((p) => p.cui === cleanCui || (projectData.id && p.id === projectData.id));

  const projectId = projectData.id || (existingIndex >= 0 ? allProjects[existingIndex].id : `p-${cleanCui}`);

  const fullProject: MockProject = {
    id: projectId,
    cui: cleanCui,
    nombre: cleanNombre,
    nConvenio: cleanConvenio,
    modalidad: cleanModalidad,
    fase: cleanFase,
    entidadEjecutora: cleanEjecutora,
    entidadSupervisora: projectData.entidadSupervisora ? fixUtf8Mojibake(String(projectData.entidadSupervisora).trim()) : undefined,
    montoInversion: projectData.montoInversion ? String(projectData.montoInversion).trim() : undefined,
    monto: projectData.monto || projectData.montoInversion ? String(projectData.monto || projectData.montoInversion).trim() : undefined,
    plazoDias: projectData.plazoDias ? String(projectData.plazoDias).trim() : undefined,
    plazo: projectData.plazo || projectData.plazoDias ? String(projectData.plazo || projectData.plazoDias).trim() : undefined,
    fechaInicio: projectData.fechaInicio ? String(projectData.fechaInicio).trim() : undefined,
    distrito: projectData.distrito ? fixUtf8Mojibake(String(projectData.distrito).trim()) : undefined,
    localidad: projectData.localidad ? fixUtf8Mojibake(String(projectData.localidad).trim()) : undefined,
    residenteNombre: projectData.residenteNombre ? fixUtf8Mojibake(String(projectData.residenteNombre).trim()) : null,
    residenteCIP: projectData.residenteCIP ? String(projectData.residenteCIP).trim() : null,
    residenteDni: projectData.residenteDni ? String(projectData.residenteDni).trim() : null,
    residenteCelular: projectData.residenteCelular ? String(projectData.residenteCelular).trim() : null,
    residenteEmail: projectData.residenteEmail ? String(projectData.residenteEmail).trim() : null,
    supervisorNombre: projectData.supervisorNombre ? fixUtf8Mojibake(String(projectData.supervisorNombre).trim()) : null,
    supervisorCIP: projectData.supervisorCIP ? String(projectData.supervisorCIP).trim() : null,
    supervisorDni: projectData.supervisorDni ? String(projectData.supervisorDni).trim() : null,
    supervisorEmpresa: projectData.supervisorEmpresa ? fixUtf8Mojibake(String(projectData.supervisorEmpresa).trim()) : null,
    supervisorEmail: projectData.supervisorEmail ? String(projectData.supervisorEmail).trim() : null,
    estado: cleanEstado,
    provincia: cleanProvincia,
    estadoObra: cleanEstadoObra,
    asientosCount: projectData.asientosCount !== undefined ? Number(projectData.asientosCount) : (existingIndex >= 0 ? allProjects[existingIndex].asientosCount || 0 : 0),
    archivado: Boolean(projectData.archivado),
    fechaArchivado: projectData.fechaArchivado ? String(projectData.fechaArchivado).trim() : undefined,
    archivadoPor: projectData.archivadoPor ? fixUtf8Mojibake(String(projectData.archivadoPor).trim()) : undefined,
  };

  // 1. Guardar en almacenamiento de archivo persistente del servidor
  if (existingIndex >= 0) {
    allProjects[existingIndex] = fullProject;
  } else {
    allProjects.unshift(fullProject);
  }
  await writeProjectsFile(allProjects);

  // 2. Guardar en Base de Datos PostgreSQL Prisma
  if (canAttemptDb()) {
    try {
      await prisma.project.upsert({
        where: { cui: cleanCui },
        update: {
          nombre: fullProject.nombre,
          nConvenio: fullProject.nConvenio,
          modalidad: fullProject.modalidad,
          fase: fullProject.fase,
          entidadEjecutora: fullProject.entidadEjecutora,
          entidadSupervisora: fullProject.entidadSupervisora || null,
          montoInversion: fullProject.montoInversion ? String(fullProject.montoInversion) : null,
          monto: fullProject.monto ? String(fullProject.monto) : null,
          plazoDias: fullProject.plazoDias ? String(fullProject.plazoDias) : null,
          plazo: fullProject.plazo ? String(fullProject.plazo) : null,
          fechaInicio: fullProject.fechaInicio || null,
          distrito: fullProject.distrito || null,
          localidad: fullProject.localidad || null,
          residenteNombre: fullProject.residenteNombre,
          residenteCIP: fullProject.residenteCIP,
          residenteDni: fullProject.residenteDni,
          residenteCelular: fullProject.residenteCelular,
          residenteEmail: fullProject.residenteEmail,
          supervisorNombre: fullProject.supervisorNombre,
          supervisorCIP: fullProject.supervisorCIP,
          supervisorDni: fullProject.supervisorDni,
          supervisorEmpresa: fullProject.supervisorEmpresa,
          supervisorEmail: fullProject.supervisorEmail,
          estado: fullProject.estado,
          provincia: fullProject.provincia,
          estadoObra: fullProject.estadoObra,
          archivado: fullProject.archivado,
          fechaArchivado: fullProject.fechaArchivado || null,
          archivadoPor: fullProject.archivadoPor || null,
        },
        create: {
          id: fullProject.id,
          cui: cleanCui,
          nombre: fullProject.nombre,
          nConvenio: fullProject.nConvenio,
          modalidad: fullProject.modalidad,
          fase: fullProject.fase,
          entidadEjecutora: fullProject.entidadEjecutora,
          entidadSupervisora: fullProject.entidadSupervisora || null,
          montoInversion: fullProject.montoInversion ? String(fullProject.montoInversion) : null,
          monto: fullProject.monto ? String(fullProject.monto) : null,
          plazoDias: fullProject.plazoDias ? String(fullProject.plazoDias) : null,
          plazo: fullProject.plazo ? String(fullProject.plazo) : null,
          fechaInicio: fullProject.fechaInicio || null,
          distrito: fullProject.distrito || null,
          localidad: fullProject.localidad || null,
          residenteNombre: fullProject.residenteNombre,
          residenteCIP: fullProject.residenteCIP,
          residenteDni: fullProject.residenteDni,
          residenteCelular: fullProject.residenteCelular,
          residenteEmail: fullProject.residenteEmail,
          supervisorNombre: fullProject.supervisorNombre,
          supervisorCIP: fullProject.supervisorCIP,
          supervisorDni: fullProject.supervisorDni,
          supervisorEmpresa: fullProject.supervisorEmpresa,
          supervisorEmail: fullProject.supervisorEmail,
          estado: fullProject.estado,
          provincia: fullProject.provincia,
          estadoObra: fullProject.estadoObra,
          archivado: fullProject.archivado,
          fechaArchivado: fullProject.fechaArchivado || null,
          archivadoPor: fullProject.archivadoPor || null,
        },
      });

      // 3. Asignación automática RBAC en DB si el Residente o Supervisor tienen usuario registrado
      const dnisToAssign = [fullProject.residenteDni, fullProject.supervisorDni].filter(Boolean) as string[];
      for (const dni of dnisToAssign) {
        try {
          const matchedUser = await prisma.user.findFirst({
            where: { dni: dni.trim() },
          });
          if (matchedUser) {
            await prisma.userProjectAssignment.upsert({
              where: {
                userId_projectId: {
                  userId: matchedUser.id,
                  projectId: fullProject.id,
                },
              },
              update: {},
              create: {
                userId: matchedUser.id,
                projectId: fullProject.id,
              },
            });
          }
        } catch (assignErr) {
          console.warn(`No se pudo auto-asignar usuario DNI ${dni} al proyecto:`, assignErr);
        }
      }

      markDbSuccess();
    } catch (dbErr) {
      console.warn('Error al persistir proyecto en Prisma DB, guardado en archivo local:', dbErr);
      markDbFailure();
    }
  }

  // 4. Actualizar asignaciones en archivo local para el Residente y Supervisor
  try {
    const currentAssignments = await readAssignmentsFile();
    let assignmentsUpdated = false;
    const dnis = [fullProject.residenteDni, fullProject.supervisorDni].filter(Boolean) as string[];

    for (const d of dnis) {
      const match = currentAssignments.find(
        (a: any) => a.dni && String(a.dni).trim().toLowerCase() === d.trim().toLowerCase()
      );
      if (match) {
        if (!Array.isArray(match.assignedProjectIds)) match.assignedProjectIds = [];
        if (!match.assignedProjectIds.includes(fullProject.id)) {
          match.assignedProjectIds.push(fullProject.id);
          assignmentsUpdated = true;
        }
      }
    }

    if (assignmentsUpdated) {
      await writeAssignmentsFile(currentAssignments);
    }
  } catch (err) {
    console.warn('Error al actualizar asignaciones locales:', err);
  }

  return fullProject;
}

// Guardar múltiples proyectos en lote
export async function saveServerProjectsBatch(projects: Partial<MockProject>[]): Promise<MockProject[]> {
  const savedList: MockProject[] = [];
  for (const p of projects) {
    try {
      const saved = await saveServerProject(p);
      savedList.push(saved);
    } catch (err) {
      console.error('Error al guardar proyecto en lote:', err);
    }
  }
  return savedList;
}

// Eliminar proyecto en el servidor y base de datos
export async function deleteServerProject(idOrCui: string): Promise<boolean> {
  const cleanTarget = String(idOrCui || '').trim().toLowerCase();
  if (!cleanTarget) return false;

  const allProjects = await readProjectsFile();
  const filtered = allProjects.filter(
    (p) => p.id.toLowerCase() !== cleanTarget && p.cui.toLowerCase() !== cleanTarget
  );
  await writeProjectsFile(filtered);

  if (canAttemptDb()) {
    try {
      await prisma.project.deleteMany({
        where: {
          OR: [{ id: idOrCui }, { cui: idOrCui }],
        },
      });
      markDbSuccess();
    } catch (dbErr) {
      console.warn('Error al eliminar proyecto en base de datos:', dbErr);
      markDbFailure();
    }
  }

  return true;
}
