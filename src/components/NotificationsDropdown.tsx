'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  CheckCheck, 
  CornerDownRight, 
  MessageSquare, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  ChevronRight, 
  X,
  Archive,
  ArchiveRestore,
  Inbox
} from 'lucide-react';

export interface NotificationItem {
  id: string;
  proyectoId: string;
  cuiProyecto: string;
  nombreProyecto: string;
  asientoId: string;
  numeroCorrelativo: string;
  tipoIncidencia: string;
  tituloAsiento: string;
  autorNombre: string;
  autorCargo: string;
  fechaHora: string;
  destinatariosRoles: string[];
  leido: boolean;
  archivado?: boolean;
  esRespuesta?: boolean;
  esSolicitudEdicion?: boolean;
  motivoEdicion?: string;
  estadoSolicitud?: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  mensaje?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-101',
    proyectoId: 'p-2548912',
    cuiProyecto: '2548912',
    nombreProyecto: 'HOSPITAL PROVINCIAL DE FERREÑAFE',
    asientoId: 'a-2',
    numeroCorrelativo: '0002',
    tipoIncidencia: 'CONSULTA_TECNICA',
    tituloAsiento: 'INTERFERENCIA CON RED DE AGUA POTABLE NO REGISTRADA EN PLANO DE CIMENTACIONES - EJE D-4',
    autorNombre: 'Ing. Juan Pérez Valdivia',
    autorCargo: 'Residente de Obra',
    fechaHora: '2026-08-26 08:15',
    destinatariosRoles: ['SUPERVISOR', 'SUPERVISOR_DE_OBRA', 'ADMINISTRADOR', 'ADMIN', 'JEFE_DE_PROYECTO'],
    leido: false,
    archivado: false,
    esRespuesta: false,
    mensaje: '🔔 Se generó la Consulta Técnica Asiento N° 0002 por el Residente de Obra. Requiere respuesta de Supervisión.',
  },
  {
    id: 'notif-102',
    proyectoId: 'p-2548912',
    cuiProyecto: '2548912',
    nombreProyecto: 'HOSPITAL PROVINCIAL DE FERREÑAFE',
    asientoId: 'a-4',
    numeroCorrelativo: '0002-R',
    tipoIncidencia: 'OBSERVACION',
    tituloAsiento: 'RESPUESTA A ASIENTO N° 2 Y OBSERVACIÓN SOBRE MEDIDAS DE SEGURIDAD',
    autorNombre: 'Ing. María Torres Ugarte',
    autorCargo: 'Supervisor de Obra',
    fechaHora: '2026-08-26 08:20',
    destinatariosRoles: ['ADMINISTRADOR', 'ADMIN', 'RESIDENTE', 'JEFE_DE_PROYECTO'],
    leido: false,
    archivado: false,
    esRespuesta: true,
    mensaje: '💬 Se registró el Asiento Respuesta N° 0002-R por la Supervisión atendiendo la Consulta Técnica de Cimentaciones.',
  },
  {
    id: 'notif-103',
    proyectoId: 'p-2419083',
    cuiProyecto: '2419083',
    nombreProyecto: 'AVENIDA CHINCHAYSUYO CHICLAYO',
    asientoId: 'a-301',
    numeroCorrelativo: '0001',
    tipoIncidencia: 'RIESGO',
    tituloAsiento: 'ALERTA DE RIESGO DE RETRASO EN EXPEDIENTE TÉCNICO VIAL',
    autorNombre: 'Ing. Roberto Gómez Bolaños',
    autorCargo: 'Proyectista / Residente',
    fechaHora: '2026-08-26 07:45',
    destinatariosRoles: ['SUPERVISOR', 'SUPERVISOR_DE_OBRA', 'ADMINISTRADOR', 'ADMIN', 'JEFE_DE_PROYECTO'],
    leido: false,
    archivado: false,
    esRespuesta: false,
    mensaje: '⚠️ Alerta de Riesgo asignada a la Supervisión por demora en aprobación de interferencias eléctricas.',
  },
];

export default function NotificationsDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [userRole, setUserRole] = useState('ADMINISTRADOR');
  const [activeTab, setActiveTab] = useState<'ACTIVAS' | 'ARCHIVADAS'>('ACTIVAS');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('user_role') || 'ADMINISTRADOR';
      setUserRole(role);

      const savedStr = localStorage.getItem('app_notifications_list');
      if (savedStr) {
        try {
          const parsed = JSON.parse(savedStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNotifications(parsed);
          } else {
            setNotifications(INITIAL_NOTIFICATIONS);
            localStorage.setItem('app_notifications_list', JSON.stringify(INITIAL_NOTIFICATIONS));
          }
        } catch (e) {
          console.error(e);
          setNotifications(INITIAL_NOTIFICATIONS);
        }
      } else {
        setNotifications(INITIAL_NOTIFICATIONS);
        localStorage.setItem('app_notifications_list', JSON.stringify(INITIAL_NOTIFICATIONS));
      }
    }
  }, []);

  // Escuchar clics fuera para cerrar panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtrar notificaciones para el rol del usuario conectado
  const userRoleUpper = userRole.toUpperCase();
  const isSuperUser = userRoleUpper.includes('ADMIN') || userRoleUpper.includes('SUPERVISOR') || userRoleUpper.includes('JEFE');

  const roleFilteredNotifications = notifications.filter((n) => {
    if (isSuperUser) return true;
    return n.destinatariosRoles?.some((r) => r.toUpperCase().includes(userRoleUpper));
  });

  const activeNotifications = roleFilteredNotifications.filter((n) => !n.archivado);
  const archivedNotifications = roleFilteredNotifications.filter((n) => n.archivado);

  const displayedNotifications = activeTab === 'ACTIVAS' ? activeNotifications : archivedNotifications;
  const unreadCount = activeNotifications.filter((n) => !n.leido).length;

  const handleMarkAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, leido: true }));
    setNotifications(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_notifications_list', JSON.stringify(updated));
    }
  };

  const handleToggleArchive = (e: React.MouseEvent, id: string, archiveState: boolean) => {
    e.stopPropagation();
    const updated = notifications.map((n) => (n.id === id ? { ...n, archivado: archiveState, leido: true } : n));
    setNotifications(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_notifications_list', JSON.stringify(updated));
    }
  };

  const handleSelectNotification = (n: NotificationItem) => {
    // Marcar como leída
    const updated = notifications.map((item) => (item.id === n.id ? { ...item, leido: true } : item));
    setNotifications(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_notifications_list', JSON.stringify(updated));
    }
    setIsOpen(false);
    // Redirigir a la vista de cuaderno digital del proyecto
    router.push(`/proyectos/${n.proyectoId}`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de Campana de Notificaciones */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-red-100 hover:text-white rounded-full hover:bg-white/10 relative transition-all focus:outline-none"
        title="Centro de Notificaciones y Alertas de Asientos"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-yellow-400 text-[#91000A] text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel Desplegable de Notificaciones */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-[420px] bg-white rounded-xl shadow-2xl border border-[#E2E2E2] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* Header del Panel */}
          <div className="bg-[#91000A] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-yellow-300" />
              <h3 className="text-xs font-bold font-display uppercase tracking-wider">
                Centro de Notificaciones
              </h3>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[10px] bg-white/20 hover:bg-white/30 text-white font-semibold px-2 py-1 rounded flex items-center space-x-1 transition-colors"
                title="Marcar todas las notificaciones como leídas"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Leídas</span>
              </button>
            )}
          </div>

          {/* Sub-header Pestañas: Activas vs Archivadas */}
          <div className="bg-[#F9F9F9] border-b border-[#E2E2E2] px-3 py-1.5 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setActiveTab('ACTIVAS')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'ACTIVAS'
                    ? 'bg-white text-[#91000A] shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-[#91000A]'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Activas ({activeNotifications.length})</span>
                {unreadCount > 0 && (
                  <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ARCHIVADAS')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'ARCHIVADAS'
                    ? 'bg-white text-[#91000A] shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-[#91000A]'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archivadas ({archivedNotifications.length})</span>
              </button>
            </div>
          </div>

          {/* Lista de Notificaciones */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {displayedNotifications.length > 0 ? (
              displayedNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleSelectNotification(n)}
                  className={`p-3.5 hover:bg-red-50/70 cursor-pointer transition-colors space-y-1 relative group ${
                    !n.leido ? 'bg-red-50/40 font-medium border-l-4 border-[#91000A]' : 'opacity-85'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-[10px] font-bold bg-[#91000A] text-white px-1.5 py-0.2 rounded">
                        CUI {n.cuiProyecto}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-gray-700 bg-gray-100 px-1.5 py-0.2 rounded">
                        N° {n.numeroCorrelativo}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-gray-500 font-mono">{n.fechaHora}</span>

                      {/* Botón de Archivar / Desarchivar */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleArchive(e, n.id, !n.archivado)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 transition-all shadow-sm ${
                          n.archivado
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                            : 'bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-[#91000A] border border-gray-300'
                        }`}
                        title={n.archivado ? 'Desarchivar notificación y mover a activas' : 'Archivar esta notificación'}
                      >
                        {n.archivado ? (
                          <>
                            <ArchiveRestore className="w-3 h-3 text-emerald-600" />
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

                  <p className="text-xs font-bold text-[#1A1C1C] line-clamp-1">
                    {n.esRespuesta ? '💬 ' : '🔔 '}
                    {n.tituloAsiento}
                  </p>

                  <p className="text-[11px] text-[#5B403D] leading-snug line-clamp-2">
                    {n.mensaje || `Generado por ${n.autorNombre} (${n.autorCargo})`}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[#91000A] font-semibold flex items-center space-x-1">
                      <span>Ver en Cuaderno Digital</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                    {!n.leido && (
                      <span className="w-2 h-2 rounded-full bg-red-600 inline-block animate-pulse"></span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-gray-500 space-y-1">
                {activeTab === 'ACTIVAS' ? (
                  <>
                    <Bell className="w-6 h-6 text-gray-300 mx-auto" />
                    <p>No tienes notificaciones activas pendientes.</p>
                  </>
                ) : (
                  <>
                    <Inbox className="w-6 h-6 text-gray-300 mx-auto" />
                    <p>No tienes notificaciones archivadas.</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer del Panel */}
          <div className="bg-[#F9F9F9] px-4 py-2 text-center border-t border-gray-200">
            <p className="text-[10px] text-gray-500">
              Notificaciones oficiales del Sistema Ley N° 29230 — GORE Lambayeque
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

