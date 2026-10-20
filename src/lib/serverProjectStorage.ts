/**
 * Proyectos y asignaciones usuario–proyecto — PostgreSQL (Prisma) como única fuente de verdad.
 * No se usa almacenamiento en archivos: si la base de datos falla, la operación falla.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { MockProject } from '@/lib/mockData';
import { fixUtf8Mojibake } from '@/lib/utf8Utils';
import { removeAttachmentFiles } from '@/lib/attachmentFiles';
import { roleToDisplay } from '@/lib/serverUserStorage';

export class ProjectConflictError extends Error {
  constructor(cui: string) {
    super(`Ya existe un proyecto registrado con el CUI ${cui}.`);
    this.name = 'ProjectConflictError';
  }
}

export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectValidationError';
  }
}

function normalizeState(st?: string): 'ACTIVO' | 'PAUSADO' | 'CONCLUIDO' {
  const upper = String(st || '').toUpperCase().trim();
  if (upper === 'CONCLUIDO' || upper.includes('CONCLU') || upper.includes('ARCHIV')) return 'CONCLUIDO';
  if (upper === 'PAUSADO' || upper.includes('PAUSA')) return 'PAUSADO';
  return 'ACTIVO';
}

const projectInclude = {
  _count: { select: { asientos: true } },
  asignaciones: { select: { user: { select: { dni: true } } } },
} satisfies Prisma.ProjectInclude;

type DbProject = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

const optText = (v: string | null | undefined) => (v ? fixUtf8Mojibake(v) : undefined);

function toProjectDto(dp: DbProject): MockProject {
  return {
    id: dp.id,
    cui: dp.cui,
    nombre: fixUtf8Mojibake(dp.nombre),
    nConvenio: fixUtf8Mojibake(dp.nConvenio),
    modalidad: dp.modalidad || 'OxI LEY 29230',
    fase: fixUtf8Mojibake(dp.fase || 'Ejecución Física'),
    entidadEjecutora: fixUtf8Mojibake(dp.entidadEjecutora),
    entidadSupervisora: optText(dp.entidadSupervisora),
    montoInversion: dp.montoInversion || undefined,
    monto: dp.monto || dp.montoInversion || undefined,
    plazoDias: dp.plazoDias || undefined,
    plazo: dp.plazo || dp.plazoDias || undefined,
    fechaInicio: dp.fechaInicio || undefined,
    distrito: optText(dp.distrito),
    localidad: optText(dp.localidad),
    residenteNombre: dp.residenteNombre ? fixUtf8Mojibake(dp.residenteNombre) : null,
    residenteCIP: dp.residenteCIP,
    residenteDni: dp.residenteDni || undefined,
    residenteCelular: dp.residenteCelular || undefined,
    residenteEmail: dp.residenteEmail || undefined,
    supervisorNombre: dp.supervisorNombre ? fixUtf8Mojibake(dp.supervisorNombre) : null,
    supervisorCIP: dp.supervisorCIP,
    supervisorDni: dp.supervisorDni || undefined,
    supervisorEmpresa: optText(dp.supervisorEmpresa),
    supervisorEmail: dp.supervisorEmail || undefined,
    estado: normalizeState(dp.estado),
    provincia: dp.provincia ? fixUtf8Mojibake(dp.provincia) : 'Chiclayo',
    estadoObra: fixUtf8Mojibake(dp.estadoObra || 'En Ejecución'),
    asientosCount: dp._count.asientos,
    archivado: Boolean(dp.archivado),
    fechaArchivado: dp.fechaArchivado || undefined,
    archivadoPor: optText(dp.archivadoPor),
  };
}

/** Administradores y Jefes de Proyecto ven todos los proyectos. */
export function canSeeAllProjects(role?: string): boolean {
  const upper = String(role || '').toUpperCase();
  return upper.includes('ADMIN') || upper.includes('JEFE');
}

// Proyectos visibles para el usuario: todos (admin/jefe) o los asignados / donde figura como residente o supervisor
export async function getServerProjects(filters?: { userDni?: string; role?: string }): Promise<MockProject[]> {
  let where: Prisma.ProjectWhereInput = {};
  if (!canSeeAllProjects(filters?.role)) {
    const dni = String(filters?.userDni || '').trim();
    if (!dni) return [];
    where = {
      OR: [
        { asignaciones: { some: { user: { dni } } } },
        { residenteDni: dni },
        { supervisorDni: dni },
      ],
    };
  }

  const rows = await prisma.project.findMany({ where, include: projectInclude, orderBy: { createdAt: 'desc' } });
  return rows.map(toProjectDto);
}

const clean = (v: unknown) => fixUtf8Mojibake(String(v ?? '').trim());
const cleanOrNull = (v: unknown) => {
  const s = String(v ?? '').trim();
  return s ? fixUtf8Mojibake(s) : null;
};

/** Campos editables del proyecto a partir de lo enviado por el formulario. */
function toProjectData(p: Partial<MockProject>) {
  return {
    nombre: clean(p.nombre).toUpperCase(),
    nConvenio: clean(p.nConvenio),
    modalidad: clean(p.modalidad) || 'OxI LEY 29230',
    fase: clean(p.fase) || 'Ejecución Física',
    entidadEjecutora: clean(p.entidadEjecutora),
    entidadSupervisora: cleanOrNull(p.entidadSupervisora),
    montoInversion: cleanOrNull(p.montoInversion ?? p.monto),
    monto: cleanOrNull(p.monto ?? p.montoInversion),
    plazoDias: cleanOrNull(p.plazoDias ?? p.plazo),
    plazo: cleanOrNull(p.plazo ?? p.plazoDias),
    fechaInicio: cleanOrNull(p.fechaInicio),
    distrito: cleanOrNull(p.distrito),
    localidad: cleanOrNull(p.localidad),
    residenteNombre: cleanOrNull(p.residenteNombre),
    residenteCIP: cleanOrNull(p.residenteCIP),
    residenteDni: cleanOrNull(p.residenteDni),
    residenteCelular: cleanOrNull(p.residenteCelular),
    residenteEmail: cleanOrNull(p.residenteEmail),
    supervisorNombre: cleanOrNull(p.supervisorNombre),
    supervisorCIP: cleanOrNull(p.supervisorCIP),
    supervisorDni: cleanOrNull(p.supervisorDni),
    supervisorEmpresa: cleanOrNull(p.supervisorEmpresa),
    supervisorEmail: cleanOrNull(p.supervisorEmail),
    estado: normalizeState(p.estado),
    provincia: clean(p.provincia) || 'Chiclayo',
    estadoObra: clean(p.estadoObra) || 'En Ejecución',
    archivado: Boolean(p.archivado),
    fechaArchivado: cleanOrNull(p.fechaArchivado),
    archivadoPor: cleanOrNull(p.archivadoPor),
  };
}

function validate(data: ReturnType<typeof toProjectData>, cui: string) {
  if (!/^\d{5,10}$/.test(cui)) throw new ProjectValidationError('El CUI es obligatorio y debe contener solo números (5 a 10 dígitos).');
  if (!data.nombre) throw new ProjectValidationError('El nombre del proyecto es obligatorio.');
  if (!data.entidadEjecutora) throw new ProjectValidationError('La entidad ejecutora es obligatoria.');
}

/** Asigna automáticamente el proyecto al residente y supervisor si tienen usuario registrado. */
async function autoAssignStaff(projectId: string, dnis: (string | null)[]) {
  for (const dni of dnis.filter(Boolean) as string[]) {
    const user = await prisma.user.findUnique({ where: { dni } });
    if (!user) continue;
    await prisma.userProjectAssignment.upsert({
      where: { userId_projectId: { userId: user.id, projectId } },
      update: {},
      create: { userId: user.id, projectId },
    });
  }
}

async function loadProject(id: string): Promise<MockProject> {
  const row = await prisma.project.findUniqueOrThrow({ where: { id }, include: projectInclude });
  return toProjectDto(row);
}

/** Busca un proyecto por id o CUI exactos. */
export async function findProjectByRef(ref: string) {
  const r = String(ref || '').trim();
  if (!r) return null;
  return prisma.project.findFirst({ where: { OR: [{ id: r }, { cui: r }] } });
}

/**
 * Crea un proyecto nuevo. Falla si el CUI ya existe (no sobrescribe).
 */
export async function createServerProject(projectData: Partial<MockProject>, creatorDni?: string): Promise<MockProject> {
  const cui = String(projectData.cui || '').trim();
  const data = toProjectData(projectData);
  if (!data.nConvenio) data.nConvenio = `CONVENIO OXI-${cui}`;
  validate(data, cui);

  if (await prisma.project.findUnique({ where: { cui } })) throw new ProjectConflictError(cui);

  try {
    const created = await prisma.project.create({ data: { id: `p-${cui}`, cui, ...data } });
    // El creador queda asignado para que pueda ver el proyecto que registró
    await autoAssignStaff(created.id, [data.residenteDni, data.supervisorDni, creatorDni || null]);
    return loadProject(created.id);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw new ProjectConflictError(cui);
    throw err;
  }
}

/**
 * Actualiza un proyecto existente (por id). Solo cambia los campos enviados.
 */
export async function updateServerProject(id: string, projectData: Partial<MockProject>): Promise<MockProject> {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) throw new ProjectValidationError('El proyecto no existe o fue eliminado.');

  const merged = toProjectData({ ...(toProjectDto({ ...existing, _count: { asientos: 0 }, asignaciones: [] })), ...projectData });
  const cui = String(projectData.cui ?? existing.cui).trim();
  validate(merged, cui);

  if (cui !== existing.cui && (await prisma.project.findUnique({ where: { cui } }))) throw new ProjectConflictError(cui);

  await prisma.project.update({ where: { id }, data: { cui, ...merged } });
  await autoAssignStaff(id, [merged.residenteDni, merged.supervisorDni]);
  return loadProject(id);
}

/**
 * Crea o actualiza (por CUI) — usado por la carga masiva desde Excel/CSV.
 */
export async function upsertServerProjectByCui(projectData: Partial<MockProject>): Promise<MockProject> {
  const existing = await prisma.project.findUnique({ where: { cui: String(projectData.cui || '').trim() } });
  return existing ? updateServerProject(existing.id, projectData) : createServerProject(projectData);
}

// Guardar múltiples proyectos en lote (carga masiva). Devuelve los guardados y los errores.
export async function saveServerProjectsBatch(
  projects: Partial<MockProject>[]
): Promise<{ saved: MockProject[]; errors: { cui: string; error: string }[] }> {
  const saved: MockProject[] = [];
  const errors: { cui: string; error: string }[] = [];
  for (const p of projects) {
    try {
      saved.push(await upsertServerProjectByCui(p));
    } catch (err) {
      errors.push({ cui: String(p.cui || '(sin CUI)'), error: err instanceof Error ? err.message : String(err) });
    }
  }
  return { saved, errors };
}

// Eliminar proyecto (asientos, adjuntos y asignaciones en cascada). Devuelve false si no existía.
export async function deleteServerProject(idOrCui: string): Promise<boolean> {
  const project = await findProjectByRef(idOrCui);
  if (!project) return false;
  const files = await prisma.attachment.findMany({
    where: { asiento: { proyectoId: project.id } },
    select: { rutaArchivo: true },
  });
  await prisma.project.delete({ where: { id: project.id } });
  await removeAttachmentFiles(files.map((f) => f.rutaArchivo || ''));
  return true;
}

// ---------------------------------------------------------------------------
// Asignaciones usuario–proyecto (tabla UserProjectAssignment)
// ---------------------------------------------------------------------------

export interface UserAssignmentDto {
  userId: string;
  dni: string;
  nombre: string;
  apellidos: string;
  rol: string;
  assignedProjectIds: string[];
  restrictVisibility: boolean;
}

export async function getAssignments(): Promise<UserAssignmentDto[]> {
  const users = await prisma.user.findMany({
    include: { asignaciones: { select: { projectId: true } } },
    orderBy: { nombre: 'asc' },
  });
  return users.map((u) => ({
    userId: u.id,
    dni: u.dni,
    nombre: fixUtf8Mojibake(u.nombre),
    apellidos: fixUtf8Mojibake(u.apellidos),
    rol: roleToDisplay(u.perfilAcceso),
    assignedProjectIds: u.asignaciones.map((a) => a.projectId),
    // La visibilidad siempre se limita a los proyectos asignados (salvo admin/jefe)
    restrictVisibility: true,
  }));
}

/**
 * Reemplaza las asignaciones de los usuarios enviados (identificados por DNI o id).
 * Devuelve los DNI/ids que no corresponden a un usuario de la base de datos.
 */
export async function saveAssignments(
  items: { userId?: string; dni?: string; assignedProjectIds?: string[] }[]
): Promise<{ updatedUsers: number; unknownUsers: string[]; unknownProjects: string[] }> {
  const unknownUsers: string[] = [];
  const unknownProjects = new Set<string>();
  let updatedUsers = 0;

  for (const item of items) {
    const dni = String(item.dni || '').trim();
    const user = dni
      ? await prisma.user.findUnique({ where: { dni } })
      : item.userId
        ? await prisma.user.findUnique({ where: { id: String(item.userId) } })
        : null;
    if (!user) {
      unknownUsers.push(dni || String(item.userId || '?'));
      continue;
    }

    const projectIds: string[] = [];
    for (const ref of item.assignedProjectIds || []) {
      const project = await findProjectByRef(ref);
      if (project) projectIds.push(project.id);
      else unknownProjects.add(String(ref));
    }

    await prisma.$transaction([
      prisma.userProjectAssignment.deleteMany({ where: { userId: user.id } }),
      prisma.userProjectAssignment.createMany({
        data: [...new Set(projectIds)].map((projectId) => ({ userId: user.id, projectId })),
      }),
    ]);
    updatedUsers++;
  }

  return { updatedUsers, unknownUsers, unknownProjects: [...unknownProjects] };
}
