'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  FolderKanban, 
  BookOpen, 
  Users, 
  BarChart3, 
  Archive, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck,
  UserCheck,
  LogOut,
  Workflow
} from 'lucide-react';
import UserManagementModal from '@/components/UserManagementModal';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ collapsed: externalCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [userRole, setUserRole] = useState('ADMINISTRADOR');
  const [userName, setUserName] = useState('');
  const [cuadernoHref, setCuadernoHref] = useState('/proyectos');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('user_role');
      if (role) setUserRole(role.toUpperCase());
      const name = localStorage.getItem('user_name');
      if (name) setUserName(name);

      const lastId = localStorage.getItem('last_selected_project_id');
      if (lastId) {
        setCuadernoHref(`/proyectos/${lastId}`);
        return;
      }
      const savedProjects = localStorage.getItem('app_projects_list');
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id) {
            setCuadernoHref(`/proyectos/${parsed[0].id}`);
            return;
          }
        } catch (e) {}
      } else {
        const uRole = role || '';
        const uDni = localStorage.getItem('user_dni') || '';
        fetch(`/api/projects?role=${encodeURIComponent(uRole)}&userDni=${encodeURIComponent(uDni)}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.success && Array.isArray(d.projects) && d.projects.length > 0) {
              localStorage.setItem('app_projects_list', JSON.stringify(d.projects));
              if (!lastId && d.projects[0]?.id) {
                setCuadernoHref(`/proyectos/${d.projects[0].id}`);
              }
            }
          })
          .catch(() => {});
      }
      setCuadernoHref('/proyectos');
    }
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_dni');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_account');
    }
    router.push('/login');
  };

  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));

  const isAdmin = userRole === 'ADMINISTRADOR' || userRole === 'ADMIN';

  const navItems = [
    { href: '/dashboard', label: 'Inicio', icon: Home },
    { href: '/proyectos', label: 'Cartera de proyectos', icon: FolderKanban },
    ...(isAdmin ? [{ href: '/asignacion-proyectos', label: 'Asignación de proyectos', icon: UserCheck }] : []),
    { href: '/storyboard', label: 'Storyboard de proyectos', icon: Workflow },
    { href: cuadernoHref, label: 'Cuaderno digital', icon: BookOpen },
    { href: '/reportes', label: 'Generación de reportes', icon: BarChart3 },
    { href: '/archivos', label: 'Archivos de Cuadernos', icon: Archive },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.label === 'Inicio') return pathname === '/dashboard';
    if (item.label === 'Cartera de proyectos') return pathname === '/proyectos';
    if (item.label === 'Asignación de proyectos') return pathname === '/asignacion-proyectos';
    if (item.label === 'Storyboard de proyectos') return pathname === '/storyboard';
    if (item.label === 'Generación de reportes') return pathname.startsWith('/reportes');
    if (item.label === 'Archivos de Cuadernos') return pathname === '/archivos';
    if (item.label === 'Cuaderno digital') return pathname.startsWith('/proyectos/') && pathname !== '/proyectos' && pathname !== '/archivos' && !pathname.startsWith('/reportes') && pathname !== '/storyboard';
    return false;
  };

  return (
    <>
      <aside
        className={`bg-white border-r border-[#E2E2E2] no-print print:hidden print:border-none flex flex-col justify-between transition-all duration-300 z-30 shrink-0 select-none ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Header del Sidebar */}
        <div className="p-3 border-b border-[#E2E2E2] flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <img
                src="/img/logo.png"
                alt="GORE Lambayeque"
                className="w-8 h-8 object-contain shrink-0 rounded bg-white p-0.5 shadow"
              />
              <div className="truncate">
                <h2 className="font-bold text-xs font-display text-[#91000A] truncate">GORE Lambayeque</h2>
                <p className="text-[10px] text-gray-500 font-sans truncate">Cuaderno Digital</p>
              </div>
            </div>
          )}

          {isCollapsed && (
            <img
              src="/img/logo.png"
              alt="GORE Lambayeque"
              className="mx-auto w-8 h-8 object-contain rounded bg-white p-0.5 shadow"
            />
          )}

          {/* Botón para Desplegar / Plegar */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 rounded-md hover:bg-red-50 text-[#91000A] transition-colors focus:outline-none shrink-0"
            title={isCollapsed ? 'Desplegar menú' : 'Plegar menú'}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Links de Navegación Principal */}
        <div className="p-2 space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded font-medium text-xs transition-colors group relative ${
                  active
                    ? 'bg-[#91000A]/10 text-[#91000A] font-bold'
                    : 'text-gray-700 hover:bg-red-50 hover:text-[#91000A]'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#91000A]' : 'text-gray-500 group-hover:text-[#91000A]'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Footer del Sidebar con Sesión de Usuario */}
        {!isCollapsed ? (
          <div className="p-3 border-t border-[#E2E2E2] bg-[#F9F9F9] space-y-2">
            {userName && (
              <div className="p-2 bg-white rounded border border-[#E2E2E2] text-xs">
                <p className="font-bold text-[#1A1C1C] truncate">{userName}</p>
                <p className="text-[10px] text-[#91000A] font-semibold">{userRole}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#91000A] rounded text-xs font-semibold border border-red-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
            <div className="text-[10px] text-[#5B403D] leading-tight flex items-center space-x-1.5 pt-1 border-t border-gray-200">
              <ShieldCheck className="w-4 h-4 text-green-700 shrink-0" />
              <div>
                <strong>Ley N° 29230 / OxI</strong>
                <p>Plataforma Oficial v2.4</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-2 border-t border-[#E2E2E2] text-center space-y-2">
            <button
              type="button"
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="p-2 bg-red-50 hover:bg-red-100 text-[#91000A] rounded border border-red-200 transition-colors mx-auto block"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <ShieldCheck className="w-4 h-4 text-green-700 mx-auto" />
          </div>
        )}
      </aside>

      {/* Modal CRUD de Usuarios desde el Menú Lateral */}
      <UserManagementModal
        isOpen={isUserMgmtOpen}
        onClose={() => setIsUserMgmtOpen(false)}
      />
    </>
  );
}
