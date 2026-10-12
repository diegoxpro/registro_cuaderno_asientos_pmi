'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Home,
  FolderKanban,
  Award,
  TrendingUp,
  Archive,
  Globe,
  HelpCircle,
  FilePlus,
  Download,
  Filter,
  Calendar,
  User,
  Paperclip,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  FileText,
  ArrowLeft,
  X,
  MessageSquare,
  Send,
  Building2,
  Bell,
  Settings,
  Users,
  LogOut,
  ShieldCheck,
  Image as ImageIcon,
  Eye,
  Edit3,
  Search,
  ChevronDown,
  ChevronLeft,
  CornerDownRight,
  Tags,
  Database
} from 'lucide-react';
import { INITIAL_PROJECTS, INITIAL_INCIDENCES, MockIncidenceEntry, MockProject } from '@/lib/mockData';
import UserManagementModal from '@/components/UserManagementModal';
import DatabaseBackupModal from '@/components/DatabaseBackupModal';
import IncidenceTypesModal from '@/components/IncidenceTypesModal';
import EditProjectModal from '@/components/EditProjectModal';
import Sidebar from '@/components/Sidebar';
import AttachmentViewerModal, { AttachmentItem } from '@/components/AttachmentViewerModal';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import RequestSeatEditModal from '@/components/RequestSeatEditModal';
import EditSeatModal from '@/components/EditSeatModal';

export default function ProyectoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [allProjects, setAllProjects] = useState<MockProject[]>(INITIAL_PROJECTS);
  const [currentProject, setCurrentProject] = useState<MockProject>(() => {
    return INITIAL_PROJECTS.find((p) => p.id === id || p.cui === id) || INITIAL_PROJECTS[0];
  });

  const initialIncidencesList = INITIAL_INCIDENCES[currentProject.id] || [];

  const [incidences, setIncidences] = useState<MockIncidenceEntry[]>(initialIncidencesList);
  const [filterTipo, setFilterTipo] = useState('TODOS');
  const [filterAutor, setFilterAutor] = useState('TODOS');
  const [selectedIncidenceModal, setSelectedIncidenceModal] = useState<MockIncidenceEntry | null>(null);

  // Combobox State de Selección de Proyectos
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [comboboxSearchTerm, setComboboxSearchTerm] = useState('');
  const comboboxRef = useRef<HTMLDivElement>(null);

  // Modales
  const [editingProject, setEditingProject] = useState<MockProject | null>(null);
  const [viewerAttachment, setViewerAttachment] = useState<AttachmentItem | null>(null);
  const [viewerAllAttachments, setViewerAllAttachments] = useState<AttachmentItem[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const [requestEditSeatModalInc, setRequestEditSeatModalInc] = useState<MockIncidenceEntry | null>(null);
  const [editSeatModalInc, setEditSeatModalInc] = useState<MockIncidenceEntry | null>(null);

  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [isIncidenceTypesOpen, setIsIncidenceTypesOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [userRole, setUserRole] = useState('ADMINISTRADOR');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('user_role') || 'ADMINISTRADOR';
      setUserRole(role);

      // Cargar lista de proyectos y filtrar estrictamente según el perfil y asignaciones del usuario
      const savedProjects = localStorage.getItem('app_projects_list');
      let baseProjects = INITIAL_PROJECTS;
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed) && parsed.length > 0) {
            baseProjects = parsed;
          }
        } catch (e) {
          console.error(e);
        }
      }

      // Filtrado por Perfil Asignado al Usuario
      let allowedProjects = baseProjects;
      const userDni = localStorage.getItem('user_dni');
      const isFullAdmin = role.toUpperCase() === 'ADMINISTRADOR' || role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'JEFE_DE_PROYECTO';

      const storedAssignments = localStorage.getItem('app_user_project_assignments');
      if (storedAssignments && !isFullAdmin) {
        try {
          const assignments = JSON.parse(storedAssignments);
          const currentAssignment = assignments.find(
            (u: any) => u.dni === userDni || (u.rol && u.rol.toUpperCase().includes(role.toUpperCase()))
          );

          if (currentAssignment && currentAssignment.restrictVisibility && Array.isArray(currentAssignment.assignedProjectIds) && currentAssignment.assignedProjectIds.length > 0) {
            allowedProjects = baseProjects.filter((p) =>
              currentAssignment.assignedProjectIds.includes(p.id) || currentAssignment.assignedProjectIds.includes(p.cui)
            );
          }
        } catch (e) {
          console.error('Error al filtrar proyectos asignados al perfil:', e);
        }
      }

      setAllProjects(allowedProjects);

      const found = baseProjects.find((p: MockProject) => p.id === id || p.cui === id);
      if (found) {
        setCurrentProject(found);
      }

      // Cargar los asientos registrados recientemente para este proyecto
      const activeProjId = found ? found.id : id;
      const storageKey = `custom_incidences_${activeProjId}`;
      const savedStr = localStorage.getItem(storageKey);
      if (savedStr) {
        try {
          const savedList = JSON.parse(savedStr);
          if (Array.isArray(savedList) && savedList.length > 0) {
            const initialList = INITIAL_INCIDENCES[activeProjId] || [];

            // Reparar correlativos duplicados si se registraron previamente con el mismo número
            const initialMax = initialList.reduce((max, inc) => Math.max(max, inc.numeroCorrelativo || 0), 0);
            const seenNumbers = new Set(initialList.map(i => i.numeroCorrelativo));
            let nextNum = initialMax + 1;
            let needsSave = false;

            const reversedCustom = [...savedList].reverse();
            const repairedCustom = reversedCustom.map((inc: any) => {
              if (!inc.esRespuestaDeId) {
                if (seenNumbers.has(inc.numeroCorrelativo) || !inc.numeroCorrelativo) {
                  needsSave = true;
                  inc.numeroCorrelativo = nextNum;
                  inc.numeroCorrelativoFormatted = `${nextNum.toString().padStart(4, '0')}`;
                }
                seenNumbers.add(inc.numeroCorrelativo);
                nextNum = Math.max(nextNum, inc.numeroCorrelativo + 1);
              }
              return inc;
            }).reverse();

            if (needsSave) {
              localStorage.setItem(storageKey, JSON.stringify(repairedCustom));
            }

            setIncidences([...repairedCustom, ...initialList]);
          } else {
            setIncidences(INITIAL_INCIDENCES[activeProjId] || []);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setIncidences(INITIAL_INCIDENCES[activeProjId] || []);
      }
    }
  }, [id]);

  // Manejar clic fuera del combobox para cerrarlo automáticamente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsComboboxOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Seleccionar proyecto desde el Combobox y navegar
  const handleSelectProjectFromCombobox = (proj: MockProject) => {
    setIsComboboxOpen(false);
    setComboboxSearchTerm('');
    router.push(`/proyectos/${proj.id}`);
  };

  // Filtrado de proyectos para el Combobox (excluyendo proyectos concluidos y archivados)
  const activeProjectsForCombobox = allProjects.filter(
    (p) => p.estado !== 'CONCLUIDO' && (p.estado as string) !== 'Concluido' && !p.archivado
  );

  const filteredComboboxProjects = activeProjectsForCombobox.filter((p) =>
    p.cui.toLowerCase().includes(comboboxSearchTerm.toLowerCase()) ||
    p.nombre.toLowerCase().includes(comboboxSearchTerm.toLowerCase()) ||
    p.provincia.toLowerCase().includes(comboboxSearchTerm.toLowerCase())
  );

  // Permisos para administrar/editar proyectos y reasignar personal (Administrador y Supervisor)
  const canManageProjects =
    userRole.toUpperCase().includes('ADMIN') ||
    userRole.toUpperCase().includes('SUPERVISOR') ||
    userRole.toUpperCase().includes('JEFE');

  const handleUpdateProject = (updatedProj: MockProject) => {
    setCurrentProject(updatedProj);
    if (typeof window !== 'undefined') {
      const savedProjects = localStorage.getItem('app_projects_list');
      let list = INITIAL_PROJECTS;
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
        } catch (e) { console.error(e); }
      }
      const updatedList = list.map((p) => (p.id === updatedProj.id ? updatedProj : p));
      localStorage.setItem('app_projects_list', JSON.stringify(updatedList));
      setAllProjects(updatedList);
    }
  };

  // Manejador para abrir un adjunto en Lightbox / Visor PDF
  const handleOpenAttachment = (att: AttachmentItem, entryAttachments: AttachmentItem[]) => {
    setViewerAttachment(att);
    setViewerAllAttachments(entryAttachments);
    setIsViewerOpen(true);
  };

  // Filtrado de incidencias por Tipo y Autor
  const filteredIncidences = incidences.filter((inc) => {
    const matchesTipo = filterTipo === 'TODOS' || inc.tipoIncidencia === filterTipo;
    const matchesAutor = filterAutor === 'TODOS' || inc.autorCargo.toLowerCase().includes(filterAutor.toLowerCase());
    return matchesTipo && matchesAutor;
  });

  // ÁRBOL JERÁRQUICO (TREE VIEW): Separar asientos principales (raíces) y respuestas hijas
  const rootIncidences = filteredIncidences.filter((inc) => {
    if (!inc.esRespuestaDeId) return true;
    const parentExists = filteredIncidences.some(
      (p) => p.id === inc.esRespuestaDeId || p.numeroCorrelativo.toString() === inc.esRespuestaDeId
    );
    return !parentExists;
  });

  // Scroll Parallax del Cuaderno Digital (Inicialmente solo 03 asientos, carga +3 al deslizar hacia abajo)
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    setVisibleCount(3);
  }, [filterTipo, filterAutor, id]);

  const handleScrollParallax = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 40) {
      if (visibleCount < rootIncidences.length) {
        setVisibleCount((prev) => Math.min(prev + 3, rootIncidences.length));
      }
    }
  };

  const displayedRootIncidences = rootIncidences.slice(0, visibleCount);

  const getChildIncidences = (parentId: string, parentNum: number) => {
    return filteredIncidences.filter(
      (inc) => inc.esRespuestaDeId === parentId || inc.esRespuestaDeId === parentNum.toString()
    );
  };

  // Formateador Oficial de Numeración Correlativa: N° 0001 para raíz, N° 0001-R para respuestas
  const getNumeroCorrelativoDisplay = (inc: MockIncidenceEntry) => {
    if ((inc as any).numeroCorrelativoFormatted) {
      return (inc as any).numeroCorrelativoFormatted;
    }

    if (inc.esRespuestaDeId) {
      const parent = incidences.find(
        (p) => p.id === inc.esRespuestaDeId || p.numeroCorrelativo.toString() === inc.esRespuestaDeId
      );
      const parentNum = parent ? parent.numeroCorrelativo : inc.numeroCorrelativo;
      return `${parentNum.toString().padStart(4, '0')}-R`;
    }

    return inc.numeroCorrelativo.toString().padStart(4, '0');
  };

  const isSupervisorOrAdmin =
    userRole.toUpperCase().includes('SUPERVISOR') ||
    userRole.toUpperCase().includes('ADMIN') ||
    userRole.toUpperCase().includes('JEFE');

  // Abrir Modal de Edición o de Solicitud de Edición según rol/autorización
  const handleOpenEditSeat = (inc: MockIncidenceEntry) => {
    if (isSupervisorOrAdmin || inc.edicionPermitida) {
      setEditSeatModalInc(inc);
    } else {
      setRequestEditSeatModalInc(inc);
    }
  };

  // Solicitar permiso de edición al Supervisor
  const handleRequestEditSubmit = (incidenceId: string, motivo: string) => {
    const updatedList = incidences.map((inc) => {
      if (inc.id === incidenceId) {
        return {
          ...inc,
          solicitudEdicionPendiente: true,
          motivoSolicitudEdicion: motivo,
          solicitanteEdicionNombre: `${userRole} — GORE Lambayeque`,
        };
      }
      return inc;
    });

    setIncidences(updatedList);

    if (typeof window !== 'undefined') {
      const storageKey = `custom_incidences_${currentProject.id}`;
      const initialIds = (INITIAL_INCIDENCES[currentProject.id] || []).map((i) => i.id);
      const customOnly = updatedList.filter((i) => !initialIds.includes(i.id));
      localStorage.setItem(storageKey, JSON.stringify(customOnly));

      const targetInc = incidences.find((i) => i.id === incidenceId);
      const numDisplay = targetInc ? getNumeroCorrelativoDisplay(targetInc) : '0000';

      const notifKey = 'app_notifications_list';
      const savedNotifsStr = localStorage.getItem(notifKey);
      const notifsList = savedNotifsStr ? JSON.parse(savedNotifsStr) : [];
      const newNotif = {
        id: `notif-req-${Date.now()}`,
        proyectoId: currentProject.id,
        cuiProyecto: currentProject.cui,
        nombreProyecto: currentProject.nombre,
        asientoId: incidenceId,
        numeroCorrelativo: numDisplay,
        tipoIncidencia: targetInc?.tipoIncidencia || 'CONSULTA_TECNICA',
        tituloAsiento: targetInc?.titulo || 'SOLICITUD DE EDICIÓN',
        autorNombre: 'Usuario Solicitante',
        autorCargo: userRole,
        fechaHora: new Date().toLocaleString(),
        destinatariosRoles: ['SUPERVISOR', 'SUPERVISOR_DE_OBRA', 'ADMINISTRADOR', 'ADMIN'],
        leido: false,
        esRespuesta: false,
        mensaje: `⚠️ Solicitud de Edición del Asiento N° ${numDisplay} enviada por ${userRole}. Motivo: "${motivo}"`,
      };
      localStorage.setItem(notifKey, JSON.stringify([newNotif, ...notifsList]));
    }

    alert('✅ Solicitud de edición enviada exitosamente al Supervisor de Obra. Recibirá una notificación al ser procesada.');
  };

  // Aprobar Edición (Opción 1 del Supervisor: PERMITIR EDICIÓN)
  const handleApproveEditRequest = (inc: MockIncidenceEntry) => {
    const updatedList = incidences.map((i) => {
      if (i.id === inc.id) {
        return {
          ...i,
          solicitudEdicionPendiente: false,
          edicionPermitida: true,
        };
      }
      return i;
    });

    setIncidences(updatedList);

    if (typeof window !== 'undefined') {
      const storageKey = `custom_incidences_${currentProject.id}`;
      const initialIds = (INITIAL_INCIDENCES[currentProject.id] || []).map((i) => i.id);
      const customOnly = updatedList.filter((i) => !initialIds.includes(i.id));
      localStorage.setItem(storageKey, JSON.stringify(customOnly));

      const numDisplay = getNumeroCorrelativoDisplay(inc);
      const notifKey = 'app_notifications_list';
      const savedNotifsStr = localStorage.getItem(notifKey);
      const notifsList = savedNotifsStr ? JSON.parse(savedNotifsStr) : [];
      const newNotif = {
        id: `notif-appr-${Date.now()}`,
        proyectoId: currentProject.id,
        cuiProyecto: currentProject.cui,
        nombreProyecto: currentProject.nombre,
        asientoId: inc.id,
        numeroCorrelativo: numDisplay,
        tipoIncidencia: inc.tipoIncidencia,
        tituloAsiento: inc.titulo,
        autorNombre: 'Supervisión de Obra',
        autorCargo: 'Supervisor de Obra',
        fechaHora: new Date().toLocaleString(),
        destinatariosRoles: ['RESIDENTE', 'PROYECTISTA', 'ADMINISTRADOR', 'ADMIN'],
        leido: false,
        esRespuesta: false,
        mensaje: `✅ La Supervisión de Obra APROBÓ la solicitud de edición para el Asiento N° ${numDisplay}.`,
      };
      localStorage.setItem(notifKey, JSON.stringify([newNotif, ...notifsList]));
    }

    alert(`✅ Edición PERMITIDA para el Asiento N° ${getNumeroCorrelativoDisplay(inc)}. El usuario ya puede editar el asiento.`);
  };

  // Rechazar Edición (Opción 2 del Supervisor: NO PERMITIR / RECHAZAR)
  const handleRejectEditRequest = (inc: MockIncidenceEntry) => {
    const updatedList = incidences.map((i) => {
      if (i.id === inc.id) {
        return {
          ...i,
          solicitudEdicionPendiente: false,
          edicionPermitida: false,
        };
      }
      return i;
    });

    setIncidences(updatedList);

    if (typeof window !== 'undefined') {
      const storageKey = `custom_incidences_${currentProject.id}`;
      const initialIds = (INITIAL_INCIDENCES[currentProject.id] || []).map((i) => i.id);
      const customOnly = updatedList.filter((i) => !initialIds.includes(i.id));
      localStorage.setItem(storageKey, JSON.stringify(customOnly));

      const numDisplay = getNumeroCorrelativoDisplay(inc);
      const notifKey = 'app_notifications_list';
      const savedNotifsStr = localStorage.getItem(notifKey);
      const notifsList = savedNotifsStr ? JSON.parse(savedNotifsStr) : [];
      const newNotif = {
        id: `notif-rej-${Date.now()}`,
        proyectoId: currentProject.id,
        cuiProyecto: currentProject.cui,
        nombreProyecto: currentProject.nombre,
        asientoId: inc.id,
        numeroCorrelativo: inc.tipoIncidencia,
        tipoIncidencia: inc.tipoIncidencia,
        tituloAsiento: inc.titulo,
        autorNombre: 'Supervisión de Obra',
        autorCargo: 'Supervisor de Obra',
        fechaHora: new Date().toLocaleString(),
        destinatariosRoles: ['RESIDENTE', 'PROYECTISTA', 'ADMINISTRADOR', 'ADMIN'],
        leido: false,
        esRespuesta: false,
        mensaje: `❌ La Supervisión de Obra RECHAZÓ la solicitud de edición para el Asiento N° ${numDisplay}.`,
      };
      localStorage.setItem(notifKey, JSON.stringify([newNotif, ...notifsList]));
    }

    alert(`❌ Edición RECHAZADA para el Asiento N° ${getNumeroCorrelativoDisplay(inc)}.`);
  };

  // Guardar Cambios tras Editar Asiento Autorizado
  const handleSaveEditedSeat = (updatedSeat: MockIncidenceEntry) => {
    const updatedList = incidences.map((i) => (i.id === updatedSeat.id ? updatedSeat : i));
    setIncidences(updatedList);

    if (typeof window !== 'undefined') {
      const storageKey = `custom_incidences_${currentProject.id}`;
      const initialIds = (INITIAL_INCIDENCES[currentProject.id] || []).map((i) => i.id);
      const customOnly = updatedList.filter((i) => !initialIds.includes(i.id));
      localStorage.setItem(storageKey, JSON.stringify(customOnly));
    }

    alert(`✅ El Asiento N° ${getNumeroCorrelativoDisplay(updatedSeat)} fue actualizado y guardado correctamente.`);
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'RIESGO':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#FFDAD6] text-[#93000A] border border-[#E4BEB9] flex items-center space-x-1"><AlertTriangle className="w-3 h-3" /><span>RIESGO LEY 29230</span></span>;
      case 'CONSULTA_TECNICA':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300 flex items-center space-x-1"><FileText className="w-3 h-3" /><span>CONSULTA TÉCNICA</span></span>;
      case 'OBSERVACION':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1"><Clock className="w-3 h-3" /><span>OBSERVACIÓN</span></span>;
      default:
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-300 flex items-center space-x-1"><CheckCircle2 className="w-3 h-3 text-gray-500" /><span>INFORMATIVO</span></span>;
    }
  };

  const getEstadoGestionBadge = (estado: string) => {
    if (estado.includes('Pendiente')) {
      return (
        <span className="px-2.5 py-1 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center space-x-1">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>{estado}</span>
        </span>
      );
    } else if (estado.includes('Atendido')) {
      return (
        <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{estado}</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
        {estado}
      </span>
    );
  };

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
                title="Opciones del Sistema"
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
          {/* Subheader Breadcrumbs, Combobox y Banner de Proyecto */}
          <div className="bg-white border-b border-[#E2E2E2] py-3 px-4 sm:px-8 space-y-3">

            {/* Breadcrumbs */}
            <div className="max-w-7xl mx-auto flex items-center space-x-2 text-xs text-[#5B403D]">
              <Link href="/dashboard" className="hover:text-[#91000A]">Inicio</Link>
              <ChevronRight className="w-3 h-3 text-[#8F706C]" />
              <Link href="/proyectos" className="hover:text-[#91000A]">Cartera de Proyectos</Link>
              <ChevronRight className="w-3 h-3 text-[#8F706C]" />
              <span className="font-semibold text-[#1A1C1C]">Cuaderno Digital — CUI {currentProject.cui}</span>
            </div>

            {/* COMBOBOX DE SELECCIÓN Y BÚSQUEDA DE PROYECTO */}
            <div className="max-w-7xl mx-auto" ref={comboboxRef}>
              <label className="block text-[11px] font-bold text-[#5B403D] uppercase tracking-wider mb-1 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-[#91000A]" />
                <span>Seleccionar Proyecto para Ver Cuaderno Digital e Incidencias:</span>
              </label>

              <div className="relative">
                {/* Selector Principal del Combobox */}
                <div
                  onClick={() => setIsComboboxOpen(!isComboboxOpen)}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#91000A]/40 hover:border-[#91000A] rounded-lg shadow-sm flex items-center justify-between cursor-pointer transition-all select-none group"
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <span className="font-mono text-xs font-bold text-white bg-[#91000A] px-2 py-0.5 rounded shrink-0">
                      CUI {currentProject.cui}
                    </span>
                    <span className="text-xs font-bold text-gray-900 truncate">
                      {currentProject.nombre}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-2">
                    <span className="text-[10px] text-[#5B403D] font-semibold hidden sm:inline">
                      ({activeProjectsForCombobox.length} Proyectos Activos Asignados)
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#91000A] transition-transform duration-200 ${isComboboxOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Dropdown Desplegable con Buscador Incorporado */}
                {isComboboxOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-[#E2E2E2] rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    {/* Buscador dentro del Combobox */}
                    <div className="p-2.5 bg-[#F9F9F9] border-b border-[#E2E2E2] relative">
                      <input
                        type="text"
                        autoFocus
                        placeholder="🔍 Buscar por CUI, nombre de proyecto o provincia..."
                        value={comboboxSearchTerm}
                        onChange={(e) => setComboboxSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#8F706C]/40 rounded-md text-xs font-medium text-[#1A1C1C] focus:outline-none focus:ring-2 focus:ring-[#91000A]"
                      />
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-5 top-4" />
                    </div>

                    {/* Lista de Resultados del Combobox */}
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                      {filteredComboboxProjects.map((p) => {
                        const isCurrent = p.id === currentProject.id || p.cui === currentProject.cui;

                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelectProjectFromCombobox(p)}
                            className={`p-3 hover:bg-red-50/80 cursor-pointer transition-colors flex items-center justify-between text-xs ${isCurrent ? 'bg-red-50/90 font-bold border-l-4 border-[#91000A]' : ''
                              }`}
                          >
                            <div className="space-y-0.5 max-w-2xl">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-[11px] font-bold text-[#91000A] bg-white px-1.5 py-0.2 rounded border border-red-200">
                                  CUI {p.cui}
                                </span>
                                <span className="text-[10px] text-gray-500 font-semibold">{p.provincia}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${p.estado === 'ACTIVO' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                                  }`}>
                                  {p.estado}
                                </span>
                              </div>
                              <p className="font-semibold text-gray-800 text-xs line-clamp-1">
                                {p.nombre}
                              </p>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0 ml-3">
                              {isCurrent && (
                                <span className="text-[10px] text-[#91000A] font-bold bg-white px-2 py-0.5 rounded border border-red-300">
                                  Ver ahora
                                </span>
                              )}
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                        );
                      })}

                      {filteredComboboxProjects.length === 0 && (
                        <div className="p-4 text-center text-xs text-gray-500">
                          No se encontraron proyectos activos que coincidan con &quot;{comboboxSearchTerm}&quot;
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ficha Resumen del Proyecto con Botón de Edición/Reasignación */}
            <div className="max-w-7xl mx-auto bg-red-50/50 p-4 rounded-lg border border-[#91000A]/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="font-mono text-xs font-bold text-[#91000A] bg-white px-2 py-0.5 rounded border border-red-200 shadow-sm">
                    CUI: {currentProject.cui}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${currentProject.estado === 'ACTIVO' ? 'text-emerald-800 bg-emerald-100 border-emerald-300' :
                    currentProject.estado === 'PAUSADO' ? 'text-amber-800 bg-amber-100 border-amber-300' :
                      'text-gray-700 bg-gray-200 border-gray-300'
                    }`}>
                    ● {currentProject.estadoObra}
                  </span>
                </div>
                <h2 className="text-sm font-bold font-display text-gray-900 uppercase">
                  {currentProject.nombre}
                </h2>
                <div className="text-xs text-[#5B403D] flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{currentProject.nConvenio}</span>
                  <span>Modalidad: <strong>{currentProject.modalidad}</strong></span>
                  <span>Provincia: <strong>{currentProject.provincia}</strong></span>
                  {currentProject.residenteNombre && (
                    <span className="text-gray-700">Residente: <strong>{currentProject.residenteNombre}</strong></span>
                  )}
                  {currentProject.supervisorNombre && (
                    <span className="text-gray-700">Supervisor: <strong>{currentProject.supervisorNombre}</strong></span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {canManageProjects && (
                  <button
                    type="button"
                    onClick={() => setEditingProject(currentProject)}
                    className="px-3 py-2 bg-white hover:bg-red-50 text-[#91000A] border border-[#91000A]/30 rounded font-bold text-xs shadow-sm flex items-center space-x-1.5 transition-all"
                    title="Editar información del proyecto, archivar o reasignar personal técnico"
                  >
                    <Edit3 className="w-4 h-4 text-[#91000A]" />
                    <span>Editar / Reasignar Personal</span>
                  </button>
                )}

                <Link
                  href={`/proyectos/${currentProject.id}/asientos/nuevo`}
                  className="px-4 py-2 bg-[#91000A] hover:bg-[#B71C1C] text-white rounded font-bold text-xs shadow-md flex items-center space-x-1.5 transition-all"
                >
                  <FilePlus className="w-4 h-4" />
                  <span>Registrar Nuevo Asiento</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">

            {/* Header de Sección & Filtros */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-[#E2E2E2] shadow-sm">
              <div>
                <h3 className="text-sm font-bold font-display text-[#91000A] uppercase tracking-wider flex items-center space-x-2">
                  <span>Asientos e Incidencias del Cuaderno Digital</span>
                  <span className="bg-red-100 text-[#91000A] px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border border-red-200">
                    Mostrando {Math.min(visibleCount, rootIncidences.length)} de {rootIncidences.length} asientos
                  </span>
                </h3>

              </div>

              {/* Filtros */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                  className="px-3 py-1.5 bg-[#F9F9F9] border border-[#8F706C]/30 rounded text-xs font-semibold text-[#1A1C1C]"
                >
                  <option value="TODOS">Tipo: Todos</option>
                  <option value="INFORMATIVO">Informativo</option>
                  <option value="CONSULTA_TECNICA">Consulta Técnica</option>
                  <option value="RIESGO">Riesgo</option>
                  <option value="OBSERVACION">Observación</option>
                </select>

                <select
                  value={filterAutor}
                  onChange={(e) => setFilterAutor(e.target.value)}
                  className="px-3 py-1.5 bg-[#F9F9F9] border border-[#8F706C]/30 rounded text-xs font-semibold text-[#1A1C1C]"
                >
                  <option value="TODOS">Autor: Todos</option>
                  <option value="Residente">Residente de Obra</option>
                  <option value="Supervisor">Supervisor de Obra</option>
                </select>
              </div>
            </div>

            {/* CONTENEDOR PARALLAX CON SCROLL AUTOMÁTICO (03 ASIENTOS INICIALES) */}
            <div
              onScroll={handleScrollParallax}
              className="max-h-[680px] overflow-y-auto pr-2 space-y-6 scroll-smooth relative rounded-xl border border-gray-200 p-3 bg-[#F9F9F9]/60 backdrop-blur-sm shadow-inner"
            >
              {displayedRootIncidences.map((rootInc) => {
                const childIncidences = getChildIncidences(rootInc.id, rootInc.numeroCorrelativo);

                return (
                  <div key={rootInc.id} className="space-y-3">
                    {/* ASIENTO PRINCIPAL (NODO RAÍZ DEL TREE VIEW) */}
                    <div className="bg-white rounded-lg border border-[#E2E2E2] shadow-sm hover:border-[#91000A]/40 transition-all overflow-hidden">
                      {/* Encabezado del Asiento Raíz */}
                      <div className="bg-[#F9F9F9] px-5 py-3 border-b border-[#E2E2E2] flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="px-2.5 py-1 rounded bg-[#91000A] text-white font-mono font-bold text-xs">
                            N° {getNumeroCorrelativoDisplay(rootInc)}
                          </span>
                          <span className="text-xs text-[#5B403D] font-mono flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{rootInc.fechaHora}</span>
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          {getTipoBadge(rootInc.tipoIncidencia)}
                        </div>
                      </div>

                      {/* Cuerpo del Asiento Raíz */}
                      <div className="p-5 space-y-3">
                        <h3 className="text-base font-bold font-display text-[#1A1C1C] uppercase leading-snug">
                          {rootInc.titulo}
                        </h3>

                        <p className="text-xs text-[#5B403D] leading-relaxed">
                          {rootInc.contenido}
                        </p>

                        {/* Archivos Adjuntos con Lightbox y PDF Viewer */}
                        {rootInc.adjuntos && rootInc.adjuntos.length > 0 && (
                          <div className="pt-2">
                            <p className="text-[11px] font-bold text-[#5B403D] mb-1.5 flex items-center space-x-1">
                              <Paperclip className="w-3.5 h-3.5 text-[#91000A]" />
                              <span>Documentos y Anexos Adjuntos ({rootInc.adjuntos.length}):</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {rootInc.adjuntos.map((att) => {
                                const isImg =
                                  att.tipo?.startsWith('image/') ||
                                  /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.nombreArchivo);

                                return (
                                  <div
                                    key={att.id}
                                    className="group relative flex items-center space-x-2 px-3 py-1.5 bg-white hover:bg-red-50/80 border border-gray-300 hover:border-[#91000A] rounded-lg text-xs transition-all shadow-sm"
                                  >
                                    {isImg ? (
                                      <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                                    ) : (
                                      <FileText className="w-4 h-4 text-[#91000A] shrink-0" />
                                    )}
                                    <span className="font-semibold text-gray-800 text-[11px] max-w-[200px] truncate">
                                      {att.nombreArchivo}
                                    </span>

                                    <div className="flex items-center space-x-1 pl-1 border-l border-gray-200">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAttachment(att, rootInc.adjuntos)}
                                        className="px-2 py-0.5 bg-gray-100 hover:bg-[#91000A] hover:text-white rounded text-[10px] font-bold text-gray-700 flex items-center space-x-1 transition-colors"
                                        title={isImg ? 'Abrir foto en Lightbox' : 'Abrir documento en Visor PDF'}
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>{isImg ? 'Ver Foto' : 'Ver PDF'}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleOpenAttachment(att, rootInc.adjuntos)}
                                        className="p-1 bg-gray-100 hover:bg-emerald-600 hover:text-white rounded text-gray-600 transition-colors"
                                        title="Descargar archivo a su equipo"
                                      >
                                        <Download className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Panel de Solicitud de Edición PENDIENTE de Revisión del Supervisor */}
                        {rootInc.solicitudEdicionPendiente && (
                          <div className="bg-amber-50 border-2 border-amber-400 p-3 rounded-lg text-xs space-y-2 my-2">
                            <div className="flex items-center space-x-2 text-amber-900 font-bold">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>SOLICITUD DE EDICIÓN PENDIENTE DE REVISIÓN</span>
                            </div>
                            <p className="text-gray-800 leading-snug">
                              El usuario <strong>{rootInc.solicitanteEdicionNombre || rootInc.autorNombre}</strong> ha solicitado editar este asiento.
                            </p>
                            <p className="text-gray-700 bg-white p-2 rounded border border-amber-200 font-mono text-[11px]">
                              Justificación: {rootInc.motivoSolicitudEdicion || 'Sin justificación especificada.'}
                            </p>

                            {/* Opciones del Supervisor: Permitir o No Permitir */}
                            {isSupervisorOrAdmin && (
                              <div className="flex items-center space-x-2 pt-1 border-t border-amber-200">
                                <button
                                  type="button"
                                  onClick={() => handleApproveEditRequest(rootInc)}
                                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-xs shadow-sm flex items-center space-x-1 transition-all"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>✅ Permitir Edición (Aprobar)</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRejectEditRequest(rootInc)}
                                  className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded font-bold text-xs shadow-sm flex items-center space-x-1 transition-all"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>❌ Rechazar Edición (Denegar)</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer del Asiento Raíz */}
                        <div className="pt-3 border-t border-[#E2E2E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#91000A] text-white flex items-center justify-center font-bold text-xs">
                              {rootInc.autorNombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                            <div className="text-xs">
                              <p className="font-bold text-[#1A1C1C]">{rootInc.autorNombre}</p>
                              <p className="text-[10px] text-[#5B403D]">{rootInc.autorCargo} — {rootInc.autorCIP}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {getEstadoGestionBadge(rootInc.estadoGestion)}

                            <button
                              type="button"
                              onClick={() => handleOpenEditSeat(rootInc)}
                              className={`px-3 py-1.5 rounded border text-xs font-bold flex items-center space-x-1.5 transition-all ${rootInc.edicionPermitida
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 animate-pulse'
                                : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                                }`}
                              title={rootInc.edicionPermitida ? 'Edición Aprobada. Haga clic para modificar' : 'Editar Asiento'}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{rootInc.edicionPermitida ? 'Editar (Aprobado)' : 'Editar Asiento'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedIncidenceModal(rootInc)}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 text-[#91000A] rounded border border-gray-300 text-xs font-bold flex items-center space-x-1"
                            >
                              <span>Ver Detalle / Responder</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* VISTA EN ÁRBOL (TREE VIEW): NORTES E HILOS DE RESPUESTAS ANIDADOS */}
                    {childIncidences.length > 0 && (
                      <div className="pl-6 sm:pl-10 space-y-3 border-l-4 border-[#91000A]/30 pt-1">
                        <div className="text-[11px] font-bold text-[#91000A] flex items-center space-x-1 uppercase tracking-wider">
                          <CornerDownRight className="w-4 h-4 text-[#91000A]" />
                          <span>Respuestas e Hilos de Atenciones ({childIncidences.length}):</span>
                        </div>

                        {childIncidences.map((child) => (
                          <div
                            key={child.id}
                            className="bg-[#F9F9F9] rounded-lg border-2 border-emerald-600/30 hover:border-emerald-700 transition-all overflow-hidden shadow-sm"
                          >
                            {/* Header Asiento Respuesta */}
                            <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 rounded bg-emerald-800 text-white font-mono font-bold text-xs">
                                  N° {getNumeroCorrelativoDisplay(child)}
                                </span>
                                <span className="text-xs text-[#5B403D] font-mono flex items-center space-x-1">
                                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>{child.fechaHora}</span>
                                </span>
                              </div>

                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300">
                                RESPUESTA OFICIAL
                              </span>
                            </div>

                            {/* Cuerpo Asiento Respuesta */}
                            <div className="p-4 space-y-2 text-xs">
                              <h4 className="font-bold text-[#1A1C1C] uppercase">{child.titulo}</h4>
                              <p className="text-[#5B403D] leading-relaxed">{child.contenido}</p>

                              {/* Footer Asiento Respuesta */}
                              <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                                <div className="text-[11px] text-gray-700">
                                  <strong>Autor:</strong> {child.autorNombre} ({child.autorCargo})
                                </div>
                                <div>{getEstadoGestionBadge(child.estadoGestion)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* INDICADOR DE CARGA DINÁMICA DE ASIENTOS */}
              {visibleCount < rootIncidences.length ? (
                <div className="py-3 text-center bg-white/80 rounded-xl border border-dashed border-gray-300 shadow-sm animate-pulse">
                  <p className="text-[11px] font-bold text-gray-500 font-mono">
                    Cargados {visibleCount} de {rootIncidences.length} asientos registrados
                  </p>
                </div>
              ) : rootIncidences.length > 0 ? (
                <div className="py-3 text-center text-[11px] text-gray-500 font-semibold bg-gray-100/60 rounded-lg">
                  ✅ Se han cargado los {rootIncidences.length} asientos del cuaderno digital.
                </div>
              ) : null}

              {rootIncidences.length === 0 && (
                <div className="bg-white p-8 text-center rounded-lg border border-dashed border-gray-300 space-y-2">
                  <p className="text-xs font-semibold text-gray-500">
                    No se encontraron asientos que coincidan con los filtros seleccionados.
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Modal Detalle Completo de Asiento */}
      {selectedIncidenceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 border border-[#E2E2E2] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-[#91000A]">
                  ASIENTO REGISTRADO N° {getNumeroCorrelativoDisplay(selectedIncidenceModal)}
                </span>
                <h3 className="text-base font-bold font-display uppercase mt-0.5">
                  {selectedIncidenceModal.titulo}
                </h3>
              </div>
              <button
                onClick={() => setSelectedIncidenceModal(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-gray-50 p-3 rounded border text-[#5B403D]">
                <p><strong>Fecha y Hora de Firma:</strong> {selectedIncidenceModal.fechaHora}</p>
                <p><strong>Autor del Registro:</strong> {selectedIncidenceModal.autorNombre} ({selectedIncidenceModal.autorCargo})</p>
                <p><strong>Estado de Gestión:</strong> {selectedIncidenceModal.estadoGestion}</p>
              </div>

              <div>
                <h4 className="font-bold text-[#1A1C1C] mb-1">Contenido Textual Completo (Declaración Jurada):</h4>
                <div className="p-4 bg-[#F9F9F9] border rounded text-xs leading-relaxed font-sans text-gray-800 whitespace-pre-wrap">
                  {selectedIncidenceModal.contenido}
                </div>
              </div>

              {/* Adjuntos en el modal de detalle */}
              {selectedIncidenceModal.adjuntos && selectedIncidenceModal.adjuntos.length > 0 && (
                <div className="border-t pt-3">
                  <h4 className="font-bold text-[#1A1C1C] mb-1.5">Archivos y Anexos Adjuntos:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedIncidenceModal.adjuntos.map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => handleOpenAttachment(att, selectedIncidenceModal.adjuntos)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#91000A] border border-red-200 rounded text-xs font-bold flex items-center space-x-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver / Descargar {att.nombreArchivo}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-green-50 border border-green-200 p-3 rounded flex items-center space-x-2 text-green-900">
                <ShieldCheck className="w-5 h-5 text-green-700 shrink-0" />
                <div>
                  <strong>Firma Digital Validada:</strong> Certificado Digital acreditado por INDECOPI / RENIEC. Registro inmutable en base de datos PostgreSQL.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <div className="text-[11px] text-gray-500 font-mono">
                Asiento ID: {selectedIncidenceModal.id}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedIncidenceModal(null)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded transition-colors"
                >
                  Cerrar
                </button>

                <Link
                  href={`/proyectos/${currentProject.id}/asientos/nuevo?responderId=${selectedIncidenceModal.id}`}
                  onClick={() => setSelectedIncidenceModal(null)}
                  className="px-4 py-2 bg-[#91000A] hover:bg-[#B71C1C] text-white text-xs font-bold rounded shadow-md flex items-center space-x-1.5 transition-all"
                >
                  <CornerDownRight className="w-4 h-4" />
                  <span>Responder este Asiento ({getNumeroCorrelativoDisplay(selectedIncidenceModal)})</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición, Reasignación y Archivamiento de Proyecto */}
      <EditProjectModal
        isOpen={Boolean(editingProject)}
        onClose={() => setEditingProject(null)}
        project={editingProject}
        onSaveProject={handleUpdateProject}
      />

      {/* Visor de Adjuntos y Lightbox */}
      <AttachmentViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        attachment={viewerAttachment}
        allAttachments={viewerAllAttachments}
      />

      {/* Modal de Administración de Usuarios */}
      <UserManagementModal
        isOpen={isUserMgmtOpen}
        onClose={() => setIsUserMgmtOpen(false)}
      />

      {/* Modal CRUD de Registrar Tipos de Incidencia */}
      <IncidenceTypesModal
        isOpen={isIncidenceTypesOpen}
        onClose={() => setIsIncidenceTypesOpen(false)}
      />

      {/* Modal para Solicitar Permiso de Edición al Supervisor */}
      <RequestSeatEditModal
        isOpen={Boolean(requestEditSeatModalInc)}
        onClose={() => setRequestEditSeatModalInc(null)}
        incidence={requestEditSeatModalInc}
        onSubmitRequest={handleRequestEditSubmit}
      />

      {/* Modal de Edición de Asiento Autorizado */}
      <EditSeatModal
        isOpen={Boolean(editSeatModalInc)}
        onClose={() => setEditSeatModalInc(null)}
        incidence={editSeatModalInc}
        onSaveSeat={handleSaveEditedSeat}
      />

      {/* Modal de Copias de Seguridad (Backups DB) */}
      <DatabaseBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
}
