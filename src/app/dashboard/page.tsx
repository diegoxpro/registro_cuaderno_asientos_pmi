'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Search,
  Filter,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Bell,
  Settings,
  Users,
  Award,
  Briefcase,
  Wrench,
  Archive,
  BookOpen,
  CheckCircle2,
  X,
  MessageSquare,
  FileText,
  CornerDownRight,
  ShieldAlert,
  CheckCheck,
  RotateCcw,
  Tags,
  Database
} from 'lucide-react';
import { INITIAL_PROJECTS, INITIAL_INCIDENCES, MockProject, MockIncidenceEntry } from '@/lib/mockData';
import UserManagementModal from '@/components/UserManagementModal';
import IncidenceTypesModal from '@/components/IncidenceTypesModal';
import DatabaseBackupModal from '@/components/DatabaseBackupModal';
import Sidebar from '@/components/Sidebar';
import NotificationsDropdown, { NotificationItem } from '@/components/NotificationsDropdown';

const SAMPLE_DASHBOARD_NOTIFICATIONS: NotificationItem[] = [];

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<MockProject[]>(INITIAL_PROJECTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Filtros de Notificaciones
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('TODAS');
  const [filterEstado, setFilterEstado] = useState('TODAS');

  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [isIncidenceTypesOpen, setIsIncidenceTypesOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [userRole, setUserRole] = useState('ADMINISTRADOR');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('user_role') || 'ADMINISTRADOR';
      const name = localStorage.getItem('user_name') || 'Usuario GORE';
      setUserRole(role);
      setUserName(name);

      // Cargar lista real de proyectos
      const savedProjects = localStorage.getItem('app_projects_list');
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed) && parsed.length > 0) setProjects(parsed);
        } catch (e) { console.error(e); }
      }

      // Cargar lista de notificaciones desde localStorage
      const savedNotifStr = localStorage.getItem('app_notifications_list');
      if (savedNotifStr) {
        try {
          const parsed = JSON.parse(savedNotifStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const currentProjList = savedProjects ? JSON.parse(savedProjects) : [];
            const validIds = new Set(currentProjList.map((p: any) => p.id));
            const filteredNotifs = parsed.filter(
              (n: any) => n.proyectoId && validIds.has(n.proyectoId) && !n.id.startsWith('notif-10')
            );
            if (filteredNotifs.length !== parsed.length) {
              localStorage.setItem('app_notifications_list', JSON.stringify(filteredNotifs));
            }
            setNotifications(filteredNotifs);
          } else {
            setNotifications([]);
          }
        } catch (e) {
          console.error(e);
          setNotifications([]);
        }
      } else {
        setNotifications([]);
      }
    }
  }, []);

  const isSupervisorOrAdmin =
    userRole.toUpperCase().includes('SUPERVISOR') ||
    userRole.toUpperCase().includes('ADMIN') ||
    userRole.toUpperCase().includes('JEFE');

  // Aprobar Solicitud de Edición desde el Grid del Dashboard
  const handleApproveEditInDashboard = (n: NotificationItem) => {
    if (typeof window !== 'undefined') {
      // 1. Actualizar el asiento en custom_incidences_PROYECTOID
      const storageKey = `custom_incidences_${n.proyectoId}`;
      const savedStr = localStorage.getItem(storageKey);
      let list = INITIAL_INCIDENCES[n.proyectoId] || [];
      if (savedStr) {
        try {
          const custom = JSON.parse(savedStr);
          if (Array.isArray(custom)) list = [...custom, ...list];
        } catch (e) { }
      }

      const updatedList = list.map((inc: any) => {
        if (inc.id === n.asientoId || inc.numeroCorrelativo?.toString() === n.numeroCorrelativo) {
          return {
            ...inc,
            solicitudEdicionPendiente: false,
            edicionPermitida: true,
          };
        }
        return inc;
      });

      // Guardar custom list actualizada
      const initialIds = (INITIAL_INCIDENCES[n.proyectoId] || []).map((i) => i.id);
      const customOnly = updatedList.filter((i) => !initialIds.includes(i.id));
      localStorage.setItem(storageKey, JSON.stringify(customOnly));

      // 2. Actualizar notificación en app_notifications_list
      const notifKey = 'app_notifications_list';
      const savedNotifStr = localStorage.getItem(notifKey);
      const currentNotifs: NotificationItem[] = savedNotifStr ? JSON.parse(savedNotifStr) : notifications;

      const updatedNotifs: NotificationItem[] = currentNotifs.map((item) => {
        if (item.id === n.id) {
          return {
            ...item,
            leido: true,
            estadoSolicitud: 'APROBADO' as const,
            mensaje: `✅ Solicitud APROBADA por Supervisión para el Asiento N° ${n.numeroCorrelativo}`,
          };
        }
        return item;
      });

      // Notificación de confirmación dirigida al autor
      const replyNotif: NotificationItem = {
        id: `notif-appr-${Date.now()}`,
        proyectoId: n.proyectoId,
        cuiProyecto: n.cuiProyecto,
        nombreProyecto: n.nombreProyecto,
        asientoId: n.asientoId,
        numeroCorrelativo: n.numeroCorrelativo,
        tipoIncidencia: n.tipoIncidencia,
        tituloAsiento: n.tituloAsiento,
        autorNombre: 'Supervisión de Obra',
        autorCargo: 'Supervisor de Obra',
        fechaHora: new Date().toLocaleString(),
        destinatariosRoles: ['RESIDENTE', 'PROYECTISTA', 'ADMINISTRADOR', 'ADMIN'],
        leido: false,
        esRespuesta: false,
        mensaje: `✅ La Supervisión de Obra APROBÓ la solicitud de edición para el Asiento N° ${n.numeroCorrelativo}.`,
      };

      const finalNotifs = [replyNotif, ...updatedNotifs];
      localStorage.setItem(notifKey, JSON.stringify(finalNotifs));
      setNotifications(finalNotifs);
    }

    alert(`✅ Edición PERMITIDA para el Asiento N° ${n.numeroCorrelativo}. Se notificó al autor para que realice los cambios en el Cuaderno Digital.`);
  };

  // Rechazar Solicitud de Edición desde el Grid del Dashboard
  const handleRejectEditInDashboard = (n: NotificationItem) => {
    if (typeof window !== 'undefined') {
      const storageKey = `custom_incidences_${n.proyectoId}`;
      const savedStr = localStorage.getItem(storageKey);
      let list = INITIAL_INCIDENCES[n.proyectoId] || [];
      if (savedStr) {
        try {
          const custom = JSON.parse(savedStr);
          if (Array.isArray(custom)) list = [...custom, ...list];
        } catch (e) { }
      }

      const updatedList = list.map((inc: any) => {
        if (inc.id === n.asientoId || inc.numeroCorrelativo?.toString() === n.numeroCorrelativo) {
          return {
            ...inc,
            solicitudEdicionPendiente: false,
            edicionPermitida: false,
          };
        }
        return inc;
      });

      const initialIds = (INITIAL_INCIDENCES[n.proyectoId] || []).map((i) => i.id);
      const customOnly = updatedList.filter((i) => !initialIds.includes(i.id));
      localStorage.setItem(storageKey, JSON.stringify(customOnly));

      const notifKey = 'app_notifications_list';
      const savedNotifStr = localStorage.getItem(notifKey);
      const currentNotifs: NotificationItem[] = savedNotifStr ? JSON.parse(savedNotifStr) : notifications;

      const updatedNotifs: NotificationItem[] = currentNotifs.map((item) => {
        if (item.id === n.id) {
          return {
            ...item,
            leido: true,
            estadoSolicitud: 'RECHAZADO' as const,
            mensaje: `❌ Solicitud RECHAZADA por Supervisión para el Asiento N° ${n.numeroCorrelativo}`,
          };
        }
        return item;
      });

      const replyNotif: NotificationItem = {
        id: `notif-rej-${Date.now()}`,
        proyectoId: n.proyectoId,
        cuiProyecto: n.cuiProyecto,
        nombreProyecto: n.nombreProyecto,
        asientoId: n.asientoId,
        numeroCorrelativo: n.numeroCorrelativo,
        tipoIncidencia: n.tipoIncidencia,
        tituloAsiento: n.tituloAsiento,
        autorNombre: 'Supervisión de Obra',
        autorCargo: 'Supervisor de Obra',
        fechaHora: new Date().toLocaleString(),
        destinatariosRoles: ['RESIDENTE', 'PROYECTISTA', 'ADMINISTRADOR', 'ADMIN'],
        leido: false,
        esRespuesta: false,
        mensaje: `❌ La Supervisión de Obra RECHAZÓ la solicitud de edición para el Asiento N° ${n.numeroCorrelativo}.`,
      };

      const finalNotifs = [replyNotif, ...updatedNotifs];
      localStorage.setItem(notifKey, JSON.stringify(finalNotifs));
      setNotifications(finalNotifs);
    }

    alert(`❌ Edición RECHAZADA para el Asiento N° ${n.numeroCorrelativo}.`);
  };

  const handleToggleReadStatus = (notifId: string) => {
    const updated = notifications.map((item) =>
      item.id === notifId ? { ...item, leido: !item.leido } : item
    );
    setNotifications(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_notifications_list', JSON.stringify(updated));
    }
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, leido: true }));
    setNotifications(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_notifications_list', JSON.stringify(updated));
    }
  };

  const handleToggleArchiveInDashboard = (notifId: string, archiveState: boolean = true) => {
    const updated = notifications.map((item) =>
      item.id === notifId ? { ...item, archivado: archiveState, leido: true } : item
    );
    setNotifications(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_notifications_list', JSON.stringify(updated));
    }
  };

  // Filtrado de Notificaciones para el Grid del Dashboard
  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch =
      n.cuiProyecto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.nombreProyecto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.tituloAsiento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.autorNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.numeroCorrelativo?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesTipo = true;
    let matchesArchivado = !n.archivado; // Por defecto solo notificaciones activas

    if (filterTipo === 'SOLICITUDES_EDICION') {
      matchesTipo = Boolean(n.esSolicitudEdicion || n.motivoEdicion || n.mensaje?.includes('Edición'));
    } else if (filterTipo === 'NUEVOS_ASIENTOS') {
      matchesTipo = !n.esRespuesta && !n.esSolicitudEdicion;
    } else if (filterTipo === 'RESPUESTAS') {
      matchesTipo = Boolean(n.esRespuesta);
    } else if (filterTipo === 'ARCHIVADAS') {
      matchesTipo = true;
      matchesArchivado = Boolean(n.archivado);
    }

    let matchesEstado = true;
    if (filterEstado === 'NO_LEIDAS') {
      matchesEstado = !n.leido;
    } else if (filterEstado === 'LEIDAS') {
      matchesEstado = n.leido;
    }

    return matchesSearch && matchesTipo && matchesEstado && matchesArchivado;
  });

  // Scroll Parallax y Carga Dinámica al Deslizar Hacia Abajo (Inicial: 03 notificaciones)
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    setVisibleCount(3);
  }, [searchTerm, filterTipo, filterEstado]);

  const handleScrollParallax = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 40) {
      if (visibleCount < filteredNotifications.length) {
        setVisibleCount((prev) => Math.min(prev + 3, filteredNotifications.length));
      }
    }
  };

  const displayedNotifications = filteredNotifications.slice(0, visibleCount);

  // Métricas del Dashboard
  const totalProyectosActivos = projects.filter((p) => p.estado === 'ACTIVO' && !p.archivado).length;
  const unreadNotifsCount = notifications.filter((n) => !n.leido).length;
  const pendingEditRequestsCount = notifications.filter((n) => n.esSolicitudEdicion && n.estadoSolicitud === 'PENDIENTE').length;
  const totalNotifsCount = notifications.length;

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
                    <span>Registrar Tipo de Incidencia </span>
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
          {/* Subheader Banner */}
          <div className="bg-white border-b border-[#E2E2E2] py-4 px-6 sm:px-8">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-[#91000A] font-bold font-mono uppercase tracking-wider">
                  PANEL DE CONTROL — INICIO
                </span>
                <h1 className="text-xl font-bold font-display text-[#1A1C1C]">
                  Bandeja Principal de Notificaciones y Solicitudes de Asientos
                </h1>

              </div>

              <div className="flex items-center space-x-2">
                <Link
                  href="/proyectos"
                  className="px-4 py-2 bg-white hover:bg-red-50 text-[#91000A] border border-[#91000A]/30 rounded-lg text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all"
                >
                  <Building2 className="w-4 h-4 text-[#91000A]" />
                  <span>Ver Cartera de Proyectos</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Main Container */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full flex-1">

            {/* KPI Cards Grid (Métricas del Sistema) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* KPI 1: Notificaciones Sin Leer */}
              <div className="bg-white p-4 rounded-lg border border-[#E2E2E2] shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#5B403D]">Notificaciones Sin Leer</p>
                  <p className="text-2xl font-extrabold font-display text-[#91000A] mt-1">{unreadNotifsCount}</p>
                  <span className="text-[10px] text-red-700 font-semibold bg-red-50 px-1.5 py-0.5 rounded border border-red-200 mt-1 inline-block">
                    Pendientes de lectura
                  </span>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-50 text-[#91000A] flex items-center justify-center">
                  <Bell className="w-6 h-6 animate-pulse" />
                </div>
              </div>

              {/* KPI 2: Solicitudes de Edición Pendientes (Alerta Especial Supervisor) */}
              <div className="bg-[#FFDAD6] p-4 rounded-lg border border-[#E4BEB9] shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#93000A]">Solicitudes de Edición</p>
                  <p className="text-2xl font-extrabold font-display text-[#93000A] mt-1">{pendingEditRequestsCount}</p>
                  <span className="text-[10px] text-[#93000A] font-bold bg-white/90 px-1.5 py-0.5 rounded border border-red-300 mt-1 inline-block">
                    {pendingEditRequestsCount > 0 ? 'Requieren Aprobación Supervisor' : 'Sin solicitudes pendientes'}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#BA1A1A] text-white flex items-center justify-center shadow">
                  <ShieldAlert className="w-6 h-6 animate-bounce" />
                </div>
              </div>

              {/* KPI 3: Total Notificaciones del Sistema */}
              <div className="bg-white p-4 rounded-lg border border-[#E2E2E2] shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#5B403D]">Total Alertas Emitidas</p>
                  <p className="text-2xl font-extrabold font-display text-[#1A1C1C] mt-1">{totalNotifsCount}</p>
                  <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 mt-1 inline-block">
                    Historial de notificaciones
                  </span>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
              </div>

              {/* KPI 4: Proyectos Activos en Cartera */}
              <div className="bg-white p-4 rounded-lg border border-[#E2E2E2] shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#5B403D]">Proyectos en Cartera</p>
                  <p className="text-2xl font-extrabold font-display text-[#1A1C1C] mt-1">{totalProyectosActivos}</p>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-1 inline-block">
                    Obras en ejecución / expediente
                  </span>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Buscador & Barra de Filtros de Notificaciones */}
            <div className="bg-white p-4 rounded-lg border border-[#E2E2E2] shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                {/* Buscador */}
                <div className="relative w-full md:w-96">
                  <input
                    type="text"
                    placeholder="🔍 Buscar notificaciones por CUI, proyecto, autor o título..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F9F9F9] border border-[#8F706C]/30 rounded text-xs text-[#1A1C1C] focus:outline-none focus:ring-2 focus:ring-[#91000A]"
                  />
                  <Search className="w-4 h-4 text-[#8F706C] absolute left-3 top-2.5" />
                </div>

                {/* Filtros de Tipo y Estado */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <select
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                    className="px-3 py-2 bg-[#F9F9F9] border border-[#8F706C]/30 rounded text-xs font-semibold text-[#1A1C1C] focus:outline-none focus:ring-1 focus:ring-[#91000A]"
                  >
                    <option value="TODAS">Tipo: Todas las Notificaciones</option>
                    <option value="SOLICITUDES_EDICION">⚠️ Solicitudes de Edición (Supervisor)</option>
                    <option value="NUEVOS_ASIENTOS">🔔 Nuevos Asientos Registrados</option>
                    <option value="RESPUESTAS">💬 Respuestas y Atenciones</option>
                    <option value="ARCHIVADAS">📦 Notificaciones Archivadas</option>
                  </select>

                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="px-3 py-2 bg-[#F9F9F9] border border-[#8F706C]/30 rounded text-xs font-semibold text-[#1A1C1C] focus:outline-none focus:ring-1 focus:ring-[#91000A]"
                  >
                    <option value="TODAS">Estado: Todas</option>
                    <option value="NO_LEIDAS">🔴 Solo Sin Leer</option>
                    <option value="LEIDAS">⚪ Leídas</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded flex items-center space-x-1 transition-colors"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Marcar todas leídas</span>
                  </button>
                </div>
              </div>
            </div>

            {/* FEED DEL CENTRO DE NOTIFICACIONES Y SOLICITUDES (SCROLL PARALLAX - 03 NOTIFICACIONES INICIALES) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-bold font-display text-[#91000A] uppercase tracking-wider flex items-center space-x-2">
                  <span>Centro de Notificaciones y Solicitudes</span>
                  <span className="bg-red-100 text-[#91000A] px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border border-red-200">
                    Mostrando {Math.min(visibleCount, filteredNotifications.length)} de {filteredNotifications.length}
                  </span>
                </h2>

                <p className="text-xs text-gray-500 font-medium">
                  Carga dinámica de notificaciones al deslizar hacia abajo
                </p>
              </div>

              {/* CONTENEDOR PARALLAX CON SCROLL AUTOMÁTICO (03 NOTIFICACIONES POR BLOQUE) */}
              <div
                onScroll={handleScrollParallax}
                className="max-h-[640px] overflow-y-auto pr-2 space-y-4 scroll-smooth relative rounded-xl border border-gray-200 p-2 bg-[#F9F9F9]/60 backdrop-blur-sm shadow-inner"
              >
                {displayedNotifications.map((n) => {
                  const isEditRequest = n.esSolicitudEdicion || n.motivoEdicion || n.mensaje?.includes('Edición');
                  const isPendingApproval = isEditRequest && n.estadoSolicitud === 'PENDIENTE';

                  return (
                    <div
                      key={n.id}
                      className={`bg-white rounded-xl border-2 transition-all overflow-hidden shadow-sm hover:shadow-md ${isPendingApproval
                        ? 'border-amber-400 bg-amber-50/20'
                        : !n.leido
                          ? 'border-[#91000A]/50 bg-red-50/20'
                          : 'border-[#E2E2E2]'
                        }`}
                    >
                      {/* Header de la Tarjeta de Notificación */}
                      <div className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${isPendingApproval ? 'bg-amber-100/70 border-amber-300' : 'bg-[#F9F9F9] border-[#E2E2E2]'
                        }`}>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-mono text-xs font-bold text-white bg-[#91000A] px-2 py-0.5 rounded">
                            CUI {n.cuiProyecto}
                          </span>
                          <span className="font-mono text-xs font-bold text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-300">
                            N° {n.numeroCorrelativo}
                          </span>

                          {isEditRequest && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-400 flex items-center space-x-1">
                              <ShieldAlert className="w-3 h-3 text-amber-700" />
                              <span>SOLICITUD DE EDICIÓN DE ASIENTO</span>
                            </span>
                          )}
                          {n.esRespuesta && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center space-x-1">
                              <CornerDownRight className="w-3 h-3 text-emerald-700" />
                              <span>RESPUESTA DE SUPERVISIÓN</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
                          <span className="text-gray-500 font-mono">{n.fechaHora}</span>

                          <button
                            type="button"
                            onClick={() => handleToggleReadStatus(n.id)}
                            className={`text-[11px] font-bold px-2 py-0.5 rounded border transition-colors ${!n.leido
                              ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                              : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                              }`}
                          >
                            {!n.leido ? '🔴 No Leída' : '⚪ Leída'}
                          </button>

                          {/* Botón Archivar / Desarchivar */}
                          <button
                            type="button"
                            onClick={() => handleToggleArchiveInDashboard(n.id, !n.archivado)}
                            className={`text-[11px] font-bold px-2 py-0.5 rounded border transition-colors flex items-center space-x-1 ${
                              n.archivado
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-[#91000A] border-gray-300'
                            }`}
                            title={n.archivado ? 'Desarchivar notificación y mover a la bandeja principal' : 'Archivar notificación'}
                          >
                            {n.archivado ? (
                              <>
                                <RotateCcw className="w-3 h-3 text-emerald-600" />
                                <span>Desarchivar</span>
                              </>
                            ) : (
                              <>
                                <Archive className="w-3 h-3 text-[#91000A]" />
                                <span>Archivar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Cuerpo de la Notificación */}
                      <div className="p-5 space-y-3">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-[#5B403D] uppercase tracking-wider">
                            Obra: {n.nombreProyecto}
                          </span>
                          <h3 className="text-base font-bold font-display text-[#1A1C1C] uppercase leading-snug">
                            {n.tituloAsiento}
                          </h3>
                        </div>

                        <p className="text-xs text-[#5B403D] bg-white p-3 rounded-lg border border-gray-200 leading-relaxed">
                          {n.mensaje || `Alerta emitida por ${n.autorNombre} (${n.autorCargo})`}
                        </p>

                        {/* Detalle de justificación si es Solicitud de Edición */}
                        {n.motivoEdicion && (
                          <div className="bg-amber-50 p-3 rounded-lg border border-amber-300 text-xs space-y-1">
                            <p className="font-bold text-amber-900">Justificación enviada por el Usuario:</p>
                            <p className="text-gray-800 italic font-mono text-[11px]">&quot;{n.motivoEdicion}&quot;</p>
                          </div>
                        )}

                        {/* BOTONES DE ACCIONES (REQUERIMIENTO DEL USUARIO) */}
                        <div className="pt-3 border-t border-[#E2E2E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="text-xs text-gray-600">
                            <strong>Emisor:</strong> {n.autorNombre} <span className="text-gray-400">({n.autorCargo})</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* SI ES SOLICITUD DE EDICIÓN: BOTONES DE OPCIONES DEL SUPERVISOR (PERMITIR O NO PERMITIR) */}
                            {isPendingApproval && isSupervisorOrAdmin ? (
                              <div className="flex items-center space-x-2 bg-amber-100/80 p-1.5 rounded-lg border border-amber-300">
                                <span className="text-[11px] font-bold text-amber-900 hidden sm:inline pl-1">
                                  Opciones Supervisor:
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleApproveEditInDashboard(n)}
                                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-bold text-xs shadow flex items-center space-x-1 transition-all"
                                  title="Aprobar solicitud y permitir al usuario editar el asiento"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>✅ Permitir Edición</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRejectEditInDashboard(n)}
                                  className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-md font-bold text-xs shadow flex items-center space-x-1 transition-all"
                                  title="Rechazar la solicitud de edición"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>❌ Rechazar Edición</span>
                                </button>
                              </div>
                            ) : n.estadoSolicitud === 'APROBADO' ? (
                              <span className="px-3 py-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-bold text-xs flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Edición Aprobada por Supervisión</span>
                              </span>
                            ) : n.estadoSolicitud === 'RECHAZADO' ? (
                              <span className="px-3 py-1.5 bg-red-100 text-red-900 border border-red-300 rounded font-bold text-xs flex items-center space-x-1">
                                <X className="w-3.5 h-3.5 text-red-700" />
                                <span>Edición Rechazada</span>
                              </span>
                            ) : null}

                            {/* Botón para navegar directamente al Cuaderno Digital de la obra */}
                            <Link
                              href={`/proyectos/${n.proyectoId}`}
                              className="px-3.5 py-1.5 bg-[#91000A] hover:bg-[#B71C1C] text-white rounded-md font-bold text-xs shadow flex items-center space-x-1.5 transition-all"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Ver en Cuaderno Digital</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* INDICADOR DE CARGA PARALLAX AL DESLIZAR */}
                {visibleCount < filteredNotifications.length ? (
                  <div className="py-3 text-center bg-white/80 rounded-xl border border-dashed border-gray-300 shadow-sm animate-pulse">
                    <p className="text-[11px] font-bold text-gray-500 font-mono">
                      Cargadas {visibleCount} de {filteredNotifications.length} notificaciones
                    </p>
                  </div>
                ) : filteredNotifications.length > 0 ? (
                  <div className="py-3 text-center text-[11px] text-gray-500 font-semibold bg-gray-100/60 rounded-lg">
                    ✅ Se han cargado todas las {filteredNotifications.length} notificaciones disponibles.
                  </div>
                ) : null}

                {filteredNotifications.length === 0 && (
                  <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300 space-y-3">
                    <Bell className="w-10 h-10 text-gray-300 mx-auto" />
                    <p className="text-xs font-bold text-gray-600">
                      No se encontraron notificaciones que coincidan con los filtros seleccionados.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

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

      {/* Modal de Copias de Seguridad (Backups DB) */}
      <DatabaseBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
}
