'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  UserCheck,
  Search,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Bell,
  Settings,
  Users,
  Check,
  Lock,
  Save,
  Eye,
  ShieldAlert,
  User as UserIcon,
  FolderKanban,
  RefreshCw,
  Database,
  Tags
} from 'lucide-react';
import { INITIAL_PROJECTS, MockProject } from '@/lib/mockData';
import UserManagementModal from '@/components/UserManagementModal';
import IncidenceTypesModal from '@/components/IncidenceTypesModal';
import DatabaseBackupModal from '@/components/DatabaseBackupModal';
import { getRegisteredUsers, AppUser } from '@/lib/users';
import Sidebar from '@/components/Sidebar';
import NotificationsDropdown from '@/components/NotificationsDropdown';

interface UserAssignment {
  userId: string;
  nombre: string;
  apellidos: string;
  dni: string;
  rol: string;
  assignedProjectIds: string[];
  restrictVisibility: boolean;
}

const DEFAULT_USERS: UserAssignment[] = [
  {
    userId: 'u-1',
    nombre: 'Carlos',
    apellidos: 'Mendoza Silva',
    dni: '70123456',
    rol: 'Administrador',
    assignedProjectIds: [],
    restrictVisibility: false,
  },
];

export default function AsignacionProyectosPage() {
  const [projects, setProjects] = useState<MockProject[]>(INITIAL_PROJECTS);
  const [usersAssignments, setUsersAssignments] = useState<UserAssignment[]>(DEFAULT_USERS);

  // Usuario actualmente seleccionado para editar sus proyectos asignados
  const [selectedUserId, setSelectedUserId] = useState<string>('u-1');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [isIncidenceTypesOpen, setIsIncidenceTypesOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [userRole, setUserRole] = useState('ADMINISTRADOR');

  // Función para cargar y sincronizar los usuarios del registro con las asignaciones de proyectos
  const loadAndSyncUsers = useCallback(() => {
    if (typeof window === 'undefined') return;

    // 1. Obtener los usuarios registrados actuales desde localStorage o lib/users
    let registeredUsers: AppUser[] = getRegisteredUsers();
    const savedReg = localStorage.getItem('app_registered_users');
    if (savedReg) {
      try {
        const parsed = JSON.parse(savedReg);
        if (Array.isArray(parsed) && parsed.length > 0) {
          registeredUsers = parsed.map((u: Record<string, unknown>) => ({
            id: String(u.id || `u-${u.dni}`),
            nombre: String(u.nombre || ''),
            apellidos: String(u.apellidos || ''),
            dni: String(u.dni || ''),
            cip: u.cip ? String(u.cip) : undefined,
            email: String(u.email || ''),
            telefono: String(u.telefono || ''),
            usuario: String(u.usuario || u.dni || ''),
            contrasena: String(u.contrasena || '123456'),
            rol: (u.rol as AppUser['rol']) || 'RESIDENTE',
            rolDisplay: String(
              u.rolDisplay ||
              (u.rol === 'ADMINISTRADOR' ? 'Administrador' :
                u.rol === 'SUPERVISOR_DE_OBRA' ? 'Supervisor de obra' :
                  u.rol === 'JEFE_DE_PROYECTO' ? 'Jefe de Proyecto' :
                    u.rol === 'SUPERVISOR_DE_PROYECTO' ? 'Supervisor de Proyecto' : 'Residente')
            ),
          }));
        }
      } catch (e) {
        console.error('Error al leer app_registered_users:', e);
      }
    }

    // 2. Obtener asignaciones de proyectos guardadas previamente
    let storedAssignmentsMap: Record<string, { assignedProjectIds: string[]; restrictVisibility: boolean }> = {};
    const storedAssignments = localStorage.getItem('app_user_project_assignments');
    if (storedAssignments) {
      try {
        const parsedAssignments: UserAssignment[] = JSON.parse(storedAssignments);
        if (Array.isArray(parsedAssignments)) {
          parsedAssignments.forEach((a) => {
            storedAssignmentsMap[a.userId] = {
              assignedProjectIds: a.assignedProjectIds || [],
              restrictVisibility: a.restrictVisibility !== undefined ? a.restrictVisibility : true,
            };
            if (a.dni) {
              storedAssignmentsMap[a.dni] = storedAssignmentsMap[a.userId];
            }
          });
        }
      } catch (e) {
        console.error('Error al parsear app_user_project_assignments:', e);
      }
    }

    // 3. Mapear cada usuario del registro a la estructura de asignación
    const savedProjects = localStorage.getItem('app_projects_list');
    let currentProjects = INITIAL_PROJECTS;
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        if (Array.isArray(parsed) && parsed.length > 0) currentProjects = parsed;
      } catch (e) {}
    }

    const mergedAssignments: UserAssignment[] = registeredUsers.map((regUser) => {
      const uId = regUser.id || `u-${regUser.dni}`;
      const prev = storedAssignmentsMap[uId] || storedAssignmentsMap[regUser.dni];

      const rolText = regUser.rolDisplay || (
        regUser.rol === 'ADMINISTRADOR' ? 'Administrador' :
          regUser.rol === 'SUPERVISOR_DE_OBRA' ? 'Supervisor de obra' :
            regUser.rol === 'JEFE_DE_PROYECTO' ? 'Jefe de Proyecto' :
              regUser.rol === 'SUPERVISOR_DE_PROYECTO' ? 'Supervisor de Proyecto' : 'Residente'
      );

      const isAdmin = regUser.rol === 'ADMINISTRADOR' || rolText === 'Administrador';

      return {
        userId: uId,
        nombre: regUser.nombre,
        apellidos: regUser.apellidos,
        dni: regUser.dni,
        rol: rolText,
        assignedProjectIds: prev ? prev.assignedProjectIds : (isAdmin ? currentProjects.map((p) => p.id) : []),
        restrictVisibility: prev ? prev.restrictVisibility : !isAdmin,
      };
    });

    setUsersAssignments(mergedAssignments);

    // Asegurar que selectedUserId pertenezca a la lista actual
    if (mergedAssignments.length > 0) {
      setSelectedUserId((currentId) => {
        const exists = mergedAssignments.some((u) => u.userId === currentId);
        return exists ? currentId : mergedAssignments[0].userId;
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('user_role');
      if (role) setUserRole(role);

      const savedProjects = localStorage.getItem('app_projects_list');
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjects(parsed);
          }
        } catch (e) {
          console.error('Error al cargar proyectos en asignación:', e);
        }
      }

      loadAndSyncUsers();
    }
  }, [loadAndSyncUsers]);

  const handleManualSync = () => {
    loadAndSyncUsers();
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 2500);
  };

  const selectedUser = usersAssignments.find((u) => u.userId === selectedUserId) || usersAssignments[0] || {
    userId: '',
    nombre: 'Usuario',
    apellidos: '',
    dni: '',
    rol: 'Residente',
    assignedProjectIds: [],
    restrictVisibility: true,
  };

  // Alternar la asignación de un proyecto al usuario seleccionado
  const handleToggleProject = (projectId: string) => {
    setUsersAssignments((prev) =>
      prev.map((u) => {
        if (u.userId === selectedUserId) {
          const exists = u.assignedProjectIds.includes(projectId);
          const newIds = exists
            ? u.assignedProjectIds.filter((id) => id !== projectId)
            : [...u.assignedProjectIds, projectId];
          return { ...u, assignedProjectIds: newIds };
        }
        return u;
      })
    );
  };

  // Seleccionar o Deseleccionar Todos los Proyectos
  const handleSelectAllProjects = (selectAll: boolean) => {
    setUsersAssignments((prev) =>
      prev.map((u) => {
        if (u.userId === selectedUserId) {
          return {
            ...u,
            assignedProjectIds: selectAll ? projects.map((p) => p.id) : [],
          };
        }
        return u;
      })
    );
  };

  // Alternar restricción de visibilidad
  const handleToggleRestrict = (userId: string) => {
    setUsersAssignments((prev) =>
      prev.map((u) =>
        u.userId === userId ? { ...u, restrictVisibility: !u.restrictVisibility } : u
      )
    );
  };

  // Guardar Cambios en localStorage
  const handleSaveAssignments = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_user_project_assignments', JSON.stringify(usersAssignments));
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Proyectos filtrados en el buscador
  const filteredProjects = projects.filter((p) =>
    p.cui.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
    p.nombre.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
    p.provincia.toLowerCase().includes(projectSearchTerm.toLowerCase())
  );

  // Usuarios filtrados en la lista de selección
  const filteredUsers = usersAssignments.filter((u) => {
    const q = userSearchTerm.toLowerCase();
    const fullName = `${u.nombre} ${u.apellidos}`.toLowerCase();
    return fullName.includes(q) || u.dni.includes(q) || u.rol.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col text-[#1A1C1C]">
      {/* Header Corporativo Superior */}
      <header className="bg-[#91000A] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="/img/logo.png"
              alt="GORE Lambayeque"
              className="w-9 h-9 object-contain shrink-0 rounded-full bg-white p-0.5 shadow"
            />
            <div>
              <h1 className="text-sm font-bold tracking-wide font-display leading-tight">
                GOBIERNO REGIONAL DE LAMBAYEQUE
              </h1>

            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Centro de Notificaciones Interactivo */}
            <NotificationsDropdown />

            {/* Engranaje de Opciones */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSettingsDropdownOpen(!isSettingsDropdownOpen)}
                className="p-1.5 text-red-100 hover:text-white rounded-full hover:bg-white/10 transition-all focus:outline-none"
                title="Opciones y Configuración"
              >
                <Settings className="w-5 h-5" />
              </button>

              {isSettingsDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-xl border border-[#E2E2E2] py-1 text-xs text-[#1A1C1C] z-50">
                  <div className="px-3 py-2 border-b border-[#E2E2E2] font-bold text-[#5B403D]">
                    Opciones del Sistema
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsDropdownOpen(false);
                      setIsUserMgmtOpen(true);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-[#91000A] font-bold flex items-center space-x-2 transition-colors border-b border-gray-100"
                  >
                    <Users className="w-4 h-4 text-[#91000A]" />
                    <span>Administrar Usuarios</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsDropdownOpen(false);
                      setIsIncidenceTypesOpen(true);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-[#91000A] font-bold flex items-center space-x-2 transition-colors border-b border-gray-100"
                  >
                    <Tags className="w-4 h-4 text-[#91000A]" />
                    <span>Registrar Tipo de Incidencia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsDropdownOpen(false);
                      setIsBackupModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-[#91000A] font-bold flex items-center space-x-2 transition-colors"
                  >
                    <Database className="w-4 h-4 text-[#91000A]" />
                    <span>Copias de Seguridad (Backups)</span>
                  </button>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-red-800"></div>

            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold font-display uppercase">{userRole} - DEAT</p>
                <p className="text-[10px] text-red-200">GORE Lambayeque</p>
              </div>
              <Link
                href="/login"
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs text-white border border-white/20 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Layout Flex con Sidebar Desplegable Persistente */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Subheader Breadcrumbs */}
          <div className="bg-white border-b border-[#E2E2E2] py-2 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto flex items-center space-x-2 text-xs text-[#5B403D]">
              <Link href="/dashboard" className="hover:text-[#91000A]">Inicio</Link>
              <ChevronRight className="w-3 h-3 text-[#8F706C]" />
              <span className="font-semibold text-[#1A1C1C]">Asignación de Proyectos a Usuarios</span>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">

            {userRole.toUpperCase() !== 'ADMINISTRADOR' && userRole.toUpperCase() !== 'ADMIN' ? (
              <div className="bg-white p-8 rounded-lg border border-red-200 shadow-md text-center max-w-lg mx-auto space-y-4 my-12">
                <div className="w-14 h-14 bg-red-100 text-[#91000A] rounded-full mx-auto flex items-center justify-center">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold font-display text-[#91000A]">ACCESO RESTRINGIDO</h3>
                <p className="text-xs text-[#5B403D] leading-relaxed">
                  Solo los usuarios con rol de <strong>Administrador</strong> tienen privilegios para gestionar la asignación de proyectos y permisos en el sistema.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-block px-4 py-2 bg-[#91000A] text-white rounded font-bold text-xs uppercase hover:bg-[#B71C1C] transition-all"
                >
                  Volver al Inicio
                </Link>
              </div>
            ) : (
              <>
                {/* Header de Sección */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2 text-[#91000A]">
                      <UserCheck className="w-6 h-6 text-[#91000A]" />
                      <h2 className="text-2xl font-bold font-display text-[#1A1C1C]">
                        Asignación de Proyectos a Usuarios
                      </h2>
                    </div>

                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleManualSync}
                      className="px-3 py-2 bg-white hover:bg-gray-100 text-[#91000A] border border-[#91000A]/30 rounded text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all"
                      title="Sincronizar lista de usuarios desde el registro"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sincronizar Registro</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsUserMgmtOpen(true)}
                      className="px-3 py-2 bg-[#91000A] hover:bg-[#B71C1C] text-white rounded text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Registrar Nuevo Usuario</span>
                    </button>
                  </div>
                </div>

                {/* Notificaciones */}
                {savedSuccess && (
                  <div className="px-4 py-2.5 bg-green-100 border border-green-300 text-green-900 rounded-lg text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-green-700" />
                    <span>¡Asignaciones de proyectos guardadas correctamente!</span>
                  </div>
                )}

                {syncSuccess && (
                  <div className="px-4 py-2.5 bg-blue-100 border border-blue-300 text-blue-900 rounded-lg text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-blue-700" />
                    <span>¡Lista de usuarios sincronizada con éxito desde el Registro de Usuarios! ({usersAssignments.length} usuarios cargados)</span>
                  </div>
                )}

                {/* Layout en 2 Columnas Interactivas */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* Columna Izquierda: Panel de Asignación Directa (5 cols) */}
                  <div className="lg:col-span-5 space-y-4">

                    {/* Selector de Usuario */}
                    <div className="bg-white p-5 rounded-lg border border-[#E2E2E2] shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#91000A] flex items-center space-x-1.5">
                          <UserIcon className="w-4 h-4" />
                          <span>1. Seleccionar Usuario: ({usersAssignments.length})</span>
                        </label>
                        <span className="text-[10px] text-gray-500 font-semibold bg-gray-100 px-2 py-0.5 rounded border">
                          Cargados del Registro
                        </span>
                      </div>

                      {/* Buscador de usuarios */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Filtrar usuarios por nombre, DNI o rol..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-[#F9F9F9] border border-[#8F706C]/30 rounded text-xs focus:ring-1 focus:ring-[#91000A]"
                        />
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {filteredUsers.map((u) => {
                          const isSelected = u.userId === selectedUserId;
                          return (
                            <div
                              key={u.userId}
                              onClick={() => setSelectedUserId(u.userId)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${isSelected
                                ? 'bg-red-50 border-[#91000A] shadow-sm ring-1 ring-[#91000A]'
                                : 'bg-[#F9F9F9] border-[#E2E2E2] hover:bg-gray-100'
                                }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-[#91000A] text-white' : 'bg-gray-200 text-gray-700'
                                  }`}>
                                  {u.nombre[0] || 'U'}{u.apellidos[0] || ''}
                                </div>
                                <div>
                                  <p className="font-bold text-xs text-[#1A1C1C]">{u.nombre} {u.apellidos}</p>
                                  <p className="text-[11px] text-[#5B403D]">{u.rol} — DNI: {u.dni}</p>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.assignedProjectIds.length > 0
                                  ? 'bg-green-100 text-green-900 border border-green-300'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}>
                                  {u.assignedProjectIds.length} Obra(s)
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {filteredUsers.length === 0 && (
                          <p className="text-center text-xs text-gray-500 py-4">No se encontraron usuarios coincidentes.</p>
                        )}
                      </div>
                    </div>

                    {/* Checklist de Proyectos para el Usuario Seleccionado */}
                    <div className="bg-white p-5 rounded-lg border border-[#E2E2E2] shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b pb-3">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[#91000A]">
                            2. Proyectos Asignados a {selectedUser.nombre}:
                          </h3>
                          <p className="text-[11px] text-gray-500">
                            Marque los proyectos a los que {selectedUser.nombre} tendrá acceso.
                          </p>
                        </div>

                        <div className="flex space-x-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleSelectAllProjects(true)}
                            className="text-[#91000A] hover:underline font-semibold"
                          >
                            Todos
                          </button>
                          <span className="text-gray-400">|</span>
                          <button
                            type="button"
                            onClick={() => handleSelectAllProjects(false)}
                            className="text-gray-500 hover:underline"
                          >
                            Ninguno
                          </button>
                        </div>
                      </div>

                      {/* Buscador de proyectos en la lista */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Buscar proyecto por CUI o Nombre..."
                          value={projectSearchTerm}
                          onChange={(e) => setProjectSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-[#F9F9F9] border border-[#8F706C]/30 rounded text-xs focus:ring-1 focus:ring-[#91000A]"
                        />
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                      </div>

                      {/* Lista con Checkboxes */}
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {filteredProjects.map((p) => {
                          const isAssigned = selectedUser.assignedProjectIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`p-3 rounded-lg border flex items-start space-x-3 cursor-pointer transition-all ${isAssigned
                                ? 'bg-green-50/60 border-green-300'
                                : 'bg-[#F9F9F9] border-[#E2E2E2] hover:bg-gray-100'
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={() => handleToggleProject(p.id)}
                                className="w-4 h-4 text-[#91000A] focus:ring-[#91000A] rounded border-gray-300 mt-0.5"
                              />
                              <div className="flex-1 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-[#91000A]">CUI: {p.cui}</span>
                                  <span className="text-[10px] text-gray-500 font-semibold">{p.provincia}</span>
                                </div>
                                <p className="font-bold text-gray-800 line-clamp-1 mt-0.5">{p.nombre}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                  {p.modalidad} — {p.fase} {p.entidadEjecutora ? `| Ejecutor: ${p.entidadEjecutora}` : ''} {p.entidadSupervisora ? `| Supervisor: ${p.entidadSupervisora}` : ''}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      {/* Botón Guardar */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleSaveAssignments}
                          className="w-full py-2.5 bg-[#91000A] hover:bg-[#B71C1C] text-white font-bold rounded shadow-md text-xs uppercase tracking-wide flex items-center justify-center space-x-2 transition-all"
                        >
                          <Save className="w-4 h-4" />
                          <span>Guardar Asignaciones para {selectedUser.nombre}</span>
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Columna Derecha: Matriz Global & Regla de Visibilidad (7 cols) */}
                  <div className="lg:col-span-7 space-y-4">

                    {/* Banner Informativo sobre RBAC */}
                    <div className="bg-white p-5 rounded-lg border border-[#E2E2E2] shadow-sm space-y-3">
                      <div className="flex items-center space-x-2 text-[#91000A]">
                        <ShieldCheck className="w-5 h-5" />
                        <h3 className="font-bold font-display text-sm">Control de Acceso y Visibilidad por Usuario</h3>
                      </div>
                      <p className="text-xs text-[#5B403D] leading-relaxed">
                        Cuando un usuario inicia sesión en la plataforma, las vistas de <strong>Cartera de Proyectos</strong> e <strong>Inicio</strong> filtrarán automáticamente las obras mostradas de acuerdo con su lista de proyectos asignados.
                      </p>
                    </div>

                    {/* Matriz Global de Asignaciones de Usuarios */}
                    <div className="bg-white rounded-lg border border-[#E2E2E2] shadow-sm overflow-hidden">
                      <div className="bg-[#91000A] text-white p-3 px-4 flex items-center justify-between">
                        <span className="font-bold font-display text-xs uppercase tracking-wider">
                          Matriz Global de Permisos por Usuario
                        </span>
                        <span className="text-[11px] text-red-100 font-mono">
                          {usersAssignments.length} Usuarios Sincronizados
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F3F3F3] text-[#5B403D] uppercase text-[10px] font-bold border-b">
                              <th className="py-2.5 px-3">Usuario / Rol</th>
                              <th className="py-2.5 px-3 text-center">Obras Asignadas</th>
                              <th className="py-2.5 px-3">Proyectos Habilitados</th>
                              <th className="py-2.5 px-3 text-center">Visibilidad Restringida</th>
                              <th className="py-2.5 px-3 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E2E2]">
                            {usersAssignments.map((u) => {
                              const assignedProjectsList = projects.filter((p) => u.assignedProjectIds.includes(p.id));
                              const isSelected = u.userId === selectedUserId;

                              return (
                                <tr key={u.userId} className={`hover:bg-red-50/30 ${isSelected ? 'bg-red-50/20' : ''}`}>
                                  {/* Usuario / Rol */}
                                  <td className="py-3 px-3">
                                    <div className="font-bold text-gray-900">{u.nombre} {u.apellidos}</div>
                                    <div className="text-[10px] text-[#91000A] font-semibold">{u.rol} — DNI: {u.dni}</div>
                                  </td>

                                  {/* Obras Asignadas */}
                                  <td className="py-3 px-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${u.assignedProjectIds.length > 0 ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-gray-100 text-gray-600'
                                      }`}>
                                      {u.assignedProjectIds.length}
                                    </span>
                                  </td>

                                  {/* Proyectos Habilitados */}
                                  <td className="py-3 px-3 max-w-xs">
                                    {assignedProjectsList.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {assignedProjectsList.map((p) => (
                                          <span key={p.id} className="px-1.5 py-0.5 rounded bg-gray-100 border text-[10px] font-mono font-bold text-gray-800">
                                            CUI {p.cui}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-red-500 font-semibold italic text-[11px]">Sin proyectos asignados</span>
                                    )}
                                  </td>

                                  {/* Visibilidad Restringida Toggle */}
                                  <td className="py-3 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleRestrict(u.userId)}
                                      className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center space-x-1 mx-auto transition-all ${u.restrictVisibility
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-blue-100 text-blue-900 border border-blue-300'
                                        }`}
                                    >
                                      {u.restrictVisibility ? (
                                        <>
                                          <Lock className="w-3 h-3 text-amber-700" />
                                          <span>Solo Asignados</span>
                                        </>
                                      ) : (
                                        <>
                                          <Eye className="w-3 h-3 text-blue-700" />
                                          <span>Ver Todos</span>
                                        </>
                                      )}
                                    </button>
                                  </td>

                                  {/* Acción */}
                                  <td className="py-3 px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedUserId(u.userId)}
                                      className="px-2.5 py-1 bg-[#91000A] text-white hover:bg-[#B71C1C] rounded font-bold text-[11px] shadow-sm"
                                    >
                                      Editar
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="bg-[#F9F9F9] p-3 border-t text-[11px] text-gray-500 flex justify-between items-center">
                        <span>GORE Lambayeque — Módulo RBAC de Asignación de Obras</span>
                        <button
                          type="button"
                          onClick={handleSaveAssignments}
                          className="px-3 py-1 bg-[#91000A] text-white rounded font-bold hover:bg-[#B71C1C]"
                        >
                          Guardar Todo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      <UserManagementModal
        isOpen={isUserMgmtOpen}
        onClose={() => {
          setIsUserMgmtOpen(false);
          loadAndSyncUsers();
        }}
      />

      {/* Modal CRUD de Registrar Tipos de Incidencia */}
      <IncidenceTypesModal
        isOpen={isIncidenceTypesOpen}
        onClose={() => setIsIncidenceTypesOpen(false)}
      />

      {/* Modal de Copias de Seguridad (Backups DB) */}
      <DatabaseBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
}
