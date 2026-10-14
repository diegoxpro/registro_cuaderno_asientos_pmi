'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  PlusCircle,
  Search,
  Filter,
  AlertTriangle,
  ChevronRight,
  LogOut,
  Bell,
  Settings,
  Download,
  Users,
  X,
  UserX,
  Upload,
  CheckCircle2,
  FileText,
  Building2,
  FolderPlus,
  Edit3,
  Archive,
  UserCheck,
  BookOpen,
  Database,
  Tags
} from 'lucide-react';
import { INITIAL_PROJECTS, MockProject } from '@/lib/mockData';
import UserManagementModal from '@/components/UserManagementModal';
import IncidenceTypesModal from '@/components/IncidenceTypesModal';
import DatabaseBackupModal from '@/components/DatabaseBackupModal';
import NewProjectModal from '@/components/NewProjectModal';
import EditProjectModal from '@/components/EditProjectModal';
import Sidebar from '@/components/Sidebar';
import NotificationsDropdown from '@/components/NotificationsDropdown';

export default function CarteraProyectosPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<MockProject[]>(INITIAL_PROJECTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFase, setFilterFase] = useState('TODAS');
  const [filterEstado, setFilterEstado] = useState('TODOS');
  const [filterProvincia, setFilterProvincia] = useState('TODAS');

  // Modales state
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<MockProject | null>(null);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [isIncidenceTypesOpen, setIsIncidenceTypesOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [userRole, setUserRole] = useState('ADMINISTRADOR');

  // Excel Bulk Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<MockProject[]>([]);
  const [uploadNotification, setUploadNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('user_role');
      const userDni = localStorage.getItem('user_dni');
      if (role) setUserRole(role);

      // Cargar proyectos desde localStorage si existen
      const savedProjects = localStorage.getItem('app_projects_list');
      let baseProjects = INITIAL_PROJECTS;
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed) && parsed.length > 0) {
            baseProjects = parsed;
          }
        } catch (e) {
          console.error('Error al leer app_projects_list de localStorage:', e);
        }
      }

      const storedAssignments = localStorage.getItem('app_user_project_assignments');
      if (storedAssignments && role !== 'ADMINISTRADOR' && role !== 'JEFE_DE_PROYECTO' && role !== 'ADMIN') {
        try {
          const assignments = JSON.parse(storedAssignments);
          const currentAssignment = assignments.find(
            (u: any) => u.dni === userDni || (u.rol && u.rol.toUpperCase().includes(role))
          );
          if (currentAssignment && currentAssignment.restrictVisibility && currentAssignment.assignedProjectIds.length > 0) {
            setProjects(baseProjects.filter((p) => currentAssignment.assignedProjectIds.includes(p.id)));
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      setProjects(baseProjects);
    }
  }, []);

  // Verificar si el usuario actual tiene permisos de Administrador o Supervisor de Obra
  const canManageProjects =
    userRole.toUpperCase().includes('ADMIN') ||
    userRole.toUpperCase().includes('SUPERVISOR') ||
    userRole.toUpperCase().includes('JEFE');

  const saveProjectsList = (updatedProjects: MockProject[]) => {
    setProjects(updatedProjects);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_projects_list', JSON.stringify(updatedProjects));
    }
  };

  const handleAddNewProject = (newProj: MockProject) => {
    const updated = [newProj, ...projects];
    saveProjectsList(updated);
    setUploadNotification(`¡Proyecto "${newProj.nombre}" registrado exitosamente en la Cartera Regional!`);
    setTimeout(() => setUploadNotification(null), 4000);
  };

  const handleUpdateProject = (updatedProj: MockProject) => {
    const updatedList = projects.map((p) => (p.id === updatedProj.id ? updatedProj : p));
    saveProjectsList(updatedList);
    setUploadNotification(`¡Proyecto CUI ${updatedProj.cui} actualizado correctamente!`);
    setTimeout(() => setUploadNotification(null), 4000);
  };

  // Manejo de archivo Excel/CSV seleccionado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();

    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      const newImportedProjects: MockProject[] = [];

      const startIdx = lines[0].toLowerCase().includes('cui') ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 2 && parts[0]) {
          const cuiVal = parts[0];
          const nombreVal = parts[1] || `PROYECTO MASIVO ${i}`;
          const convenioVal = parts[2] || `CONVENIO OXI-${2026 + i}-LAMB`;
          const modalidadVal = parts[3] || 'OxI LEY 29230';
          const faseVal = parts[4] || 'Ejecución Física';
          const entidadVal = parts[5] || 'GORE Lambayeque / Banco Financista';
          const provinciaVal = parts[6] || 'Chiclayo';

          newImportedProjects.push({
            id: `p-excel-${Date.now()}-${i}`,
            cui: cuiVal,
            nombre: nombreVal.toUpperCase(),
            nConvenio: convenioVal,
            modalidad: modalidadVal,
            fase: faseVal,
            entidadEjecutora: entidadVal,
            residenteNombre: null,
            residenteCIP: null,
            supervisorNombre: null,
            supervisorCIP: null,
            estado: 'ACTIVO',
            provincia: provinciaVal,
            estadoObra: 'En Ejecución',
            asientosCount: 0,
          });
        }
      }

      if (newImportedProjects.length === 0) {
        const sampleImported: MockProject[] = [
          {
            id: `p-ex-${Date.now()}-1`,
            cui: '2590123',
            nombre: 'MEJORAMIENTO DEL SERVICIO DE AGUA POTABLE Y ALCANTARILLADO EN EL DISTRITO DE MONSEFÚ',
            nConvenio: 'CONVENIO OXI-005-2026-GR.LAMB',
            modalidad: 'OxI LEY 29230',
            fase: 'Ejecución Física',
            entidadEjecutora: 'BANCO DE CRÉDITO DEL PERÚ',
            residenteNombre: 'Ing. Fernando Castro',
            residenteCIP: 'CIP-210984',
            supervisorNombre: 'Consorcio Inspector Monsefú',
            supervisorCIP: 'CIP-109283',
            estado: 'ACTIVO',
            provincia: 'Chiclayo',
            estadoObra: 'En Ejecución',
          },
          {
            id: `p-ex-${Date.now()}-2`,
            cui: '2610482',
            nombre: 'CREACIÓN DEL CAMINO VECINAL DE CONEXIÓN EN EL DISTRITO DE PÁTAPO - FERREÑAFE',
            nConvenio: 'CONVENIO OXI-006-2026-GR.LAMB',
            modalidad: 'OxI LEY 29230',
            fase: 'Expediente Técnico',
            entidadEjecutora: 'CEMENTOS PACASMAYO S.A.A.',
            residenteNombre: 'Ing. Lucía Alarcón',
            residenteCIP: 'CIP-182940',
            supervisorNombre: null,
            supervisorCIP: null,
            estado: 'ACTIVO',
            provincia: 'Ferreñafe',
            estadoObra: 'En Elaboración',
          },
        ];
        setParsedPreview(sampleImported);
      } else {
        setParsedPreview(newImportedProjects);
      }
    };

    reader.readAsText(file);
  };

  const handleProcessBulkUpload = () => {
    if (parsedPreview.length === 0) {
      alert('No hay proyectos válidos listos para importar.');
      return;
    }

    const updated = [...parsedPreview, ...projects];
    saveProjectsList(updated);
    setIsBulkUploadModalOpen(false);
    setSelectedFile(null);
    setParsedPreview([]);
    setUploadNotification(`¡Se cargaron exitosamente ${parsedPreview.length} proyectos desde el archivo Excel a la Cartera!`);
    setTimeout(() => setUploadNotification(null), 4500);
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'CUI,Nombre_Proyecto,Convenio,Modalidad,Fase,Entidad_Ejecutora,Provincia\n' +
      '2548912,"MEJORAMIENTO DE LA INFRAESTRUCTURA DEL HOSPITAL PROVINCIAL","CONVENIO OXI-001-2026","OxI LEY 29230","Ejecución Física","COMPAÑÍA MINERA MISKI MAYU S.A.C.","Chiclayo"\n' +
      '2419083,"CONSTRUCCIÓN DEL PUENTE VEHICULAR Y PEATONAL JUANA RÍOS","CONVENIO OXI-002-2026","OxI LEY 29230","Ejecución Física","INTERBANK","Chiclayo"\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Plantilla_Cartera_Proyectos_GORE_Lambayeque.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Archivar Proyecto directamente desde el Grid de la Cartera (Supervisión)
  const handleDirectArchiveProject = (p: MockProject) => {
    if (p.estado !== 'CONCLUIDO') {
      if (!confirm(`⚠️ Requisito de Archivo (Supervisión):\n\nPara archivar el proyecto CUI ${p.cui} (${p.nombre}) y su Cuaderno Digital, la obra debe estar en estado 'CONCLUIDO'.\n\n¿Desea cambiar el estado del proyecto a 'CONCLUIDO' y proceder a archivarlo en la sección de Archivos de Cuadernos?`)) {
        return;
      }
    } else {
      if (!confirm(`¿Está seguro de archivar el proyecto CUI ${p.cui} (${p.nombre}) y su Cuaderno Digital de Incidencias? Se trasladará a la sección 'Archivos de Cuadernos'.`)) {
        return;
      }
    }

    const userNameStr = typeof window !== 'undefined' ? (localStorage.getItem('user_name') || 'Ing. Supervisor') : 'Supervisor';
    const userRoleStr = typeof window !== 'undefined' ? (localStorage.getItem('user_role') || 'SUPERVISOR') : 'SUPERVISOR';

    const updated = projects.map((item) => {
      if (item.id === p.id) {
        return {
          ...item,
          estado: 'CONCLUIDO' as const,
          archivado: true,
          fase: 'Liquidación / Archivo',
          estadoObra: 'Obra Concluida / Cuaderno Digital Archivado',
          fechaArchivado: new Date().toLocaleString(),
          archivadoPor: `${userNameStr} (${userRoleStr})`,
        };
      }
      return item;
    });

    saveProjectsList(updated);
    alert(`✅ Proyecto CUI ${p.cui} archivado correctamente. Ahora se visualiza en la sección 'Archivos de Cuadernos'.`);
  };

  // Filtrado de proyectos de la Cartera (Excluir estrictamente proyectos archivados)
  const activeProjects = projects.filter((p) => !p.archivado);

  const filteredProjects = activeProjects.filter((p) => {
    const matchesSearch =
      p.cui.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.entidadEjecutora.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFase = filterFase === 'TODAS' || p.fase === filterFase;
    const matchesEstado = filterEstado === 'TODOS' || p.estado === filterEstado;
    const matchesProvincia = filterProvincia === 'TODAS' || p.provincia === filterProvincia;

    return matchesSearch && matchesFase && matchesEstado && matchesProvincia;
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
                title="Opciones y Configuración del Sistema"
              >
                <Settings className="w-5 h-5" />
              </button>

              {isSettingsDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-xl border border-[#E2E2E2] py-1 text-xs text-[#1A1C1C] z-50">
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
              <span className="font-semibold text-[#1A1C1C]">Cartera de Proyectos de Inversión</span>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">

            {/* Notification Banner */}
            {uploadNotification && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{uploadNotification}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadNotification(null)}
                  className="text-xs font-bold text-gray-500 hover:text-gray-800 ml-3"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Título de Sección y Botones de Acción Solicitados */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold font-display text-[#1A1C1C] flex items-center space-x-2">
                  <Building2 className="w-6 h-6 text-[#91000A]" />
                  <span>Cartera de Proyectos de Inversión</span>
                </h2>

              </div>

              {/* BOTONES PRINCIPALES DE ACCIÓN: CARGAR EXCEL Y REGISTRAR PROYECTO */}
              <div className="flex flex-wrap items-center gap-2">

                {/* BOTÓN 1: Cargar Cartera desde Excel */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setParsedPreview([]);
                    setIsBulkUploadModalOpen(true);
                  }}
                  className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold shadow-sm flex items-center space-x-2 transition-all hover:scale-[1.02]"
                  title="Importar masivamente proyectos desde un archivo Excel o CSV"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Cargar Cartera desde Excel</span>
                </button>

                {/* BOTÓN 2: Registrar Nuevo Proyecto */}
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="px-4 py-2.5 bg-[#91000A] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold shadow-md flex items-center space-x-2 transition-all hover:scale-[1.02]"
                  title="Abrir formulario para registrar un nuevo proyecto por CUI"
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  <span>Registrar Nuevo Proyecto</span>
                </button>

              </div>
            </div>

            {/* Buscador & Barra de Filtros */}
            <div className="bg-white p-4 rounded-lg border border-[#E2E2E2] shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                {/* Buscador de texto */}
                <div className="relative w-full md:w-96">
                  <input
                    type="text"
                    placeholder="Buscar por CUI, Nombre de proyecto o Financiera..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F9F9F9] border border-[#8F706C]/30 rounded text-xs text-[#1A1C1C] focus:outline-none focus:ring-2 focus:ring-[#91000A]"
                  />
                  <Search className="w-4 h-4 text-[#8F706C] absolute left-3 top-2.5" />
                </div>

                {/* Selector de Filtros */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <select
                    value={filterFase}
                    onChange={(e) => setFilterFase(e.target.value)}
                    className="px-2.5 py-2 bg-[#F9F9F9] border border-[#8F706C]/30 rounded text-xs text-[#1A1C1C] focus:outline-none focus:ring-1 focus:ring-[#91000A]"
                  >
                    <option value="TODAS">Fase: Todas</option>
                    <option value="Ejecución Física">Ejecución Física</option>
                    <option value="Expediente Técnico">Expediente Técnico</option>
                    <option value="Liquidación">Liquidación</option>
                  </select>

                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="px-2.5 py-2 bg-[#F9F9F9] border border-[#8F706C]/30 rounded text-xs text-[#1A1C1C] focus:outline-none focus:ring-1 focus:ring-[#91000A]"
                  >
                    <option value="TODOS">Estado: Todos</option>
                    <option value="ACTIVO">Activo (Verde)</option>
                    <option value="PAUSADO">Pausado (Ámbar)</option>
                    <option value="CONCLUIDO">Concluido (Gris)</option>
                  </select>

                  <select
                    value={filterProvincia}
                    onChange={(e) => setFilterProvincia(e.target.value)}
                    className="px-2.5 py-2 bg-[#F9F9F9] border border-[#8F706C]/30 rounded text-xs text-[#1A1C1C] focus:outline-none focus:ring-1 focus:ring-[#91000A]"
                  >
                    <option value="TODAS">Provincia: Todas</option>
                    <option value="Chiclayo">Chiclayo</option>
                    <option value="Ferreñafe">Ferreñafe</option>
                    <option value="Lambayeque">Lambayeque</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterFase('TODAS');
                      setFilterEstado('TODOS');
                      setFilterProvincia('TODAS');
                    }}
                    className="p-2 border border-[#8F706C]/30 rounded hover:bg-gray-100 text-xs text-[#5B403D]"
                    title="Limpiar Filtros"
                  >
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Grid / Tabla de Proyectos de Inversión */}
            <div className="bg-white rounded-lg border border-[#E2E2E2] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#91000A] text-white font-display uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 font-bold">CUI</th>
                      <th className="py-3 px-4 font-bold max-w-xs">Nombre del Proyecto / Convenio</th>
                      <th className="py-3 px-4 font-bold">Modalidad / Fase</th>
                      <th className="py-3 px-4 font-bold">Ejecución & Supervisión</th>
                      <th className="py-3 px-4 font-bold text-center">Estado</th>
                      <th className="py-3 px-4 font-bold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E2E2] text-[#1A1C1C]">
                    {filteredProjects.map((p) => (
                      <tr
                        key={p.id}
                        onDoubleClick={() => {
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('last_selected_project_id', p.id);
                          }
                          router.push(`/proyectos/${p.id}`);
                        }}
                        className="hover:bg-red-50/60 transition-colors cursor-pointer select-none"
                        title="Doble clic para abrir el Cuaderno Digital de Incidencias de este proyecto"
                      >
                        {/* CUI */}
                        <td className="py-3 px-4 font-mono font-bold text-[#91000A]">
                          {p.cui}
                        </td>

                        {/* Nombre & Convenio */}
                        <td className="py-3 px-4 max-w-md">
                          <div className="font-bold text-xs leading-snug line-clamp-2">{p.nombre}</div>
                          <div className="text-[10px] text-[#5B403D] font-mono mt-0.5">{p.nConvenio}</div>
                        </td>

                        {/* Modalidad & Fase */}
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-[#91000A] border border-red-200">
                            {p.modalidad}
                          </span>
                          <div className="text-[11px] text-[#5B403D] font-semibold mt-1 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#91000A]"></span>
                            <span>{p.fase}</span>
                          </div>
                        </td>

                        {/* Ejecución & Supervisión con Alertas */}
                        <td className="py-3 px-4 space-y-1">
                          <div className="text-[11px]">
                            <strong className="text-gray-500 font-mono">E:</strong> {p.entidadEjecutora}
                          </div>
                          <div className="text-[11px] flex items-center space-x-1">
                            <strong className="text-gray-500 font-mono">R:</strong>
                            {p.residenteNombre ? (
                              <span className="text-gray-800">{p.residenteNombre} {p.residenteCIP ? `(${p.residenteCIP})` : ''}</span>
                            ) : (
                              <span className="text-red-600 font-bold flex items-center space-x-0.5">
                                <UserX className="w-3.5 h-3.5" />
                                <span>Sin Residente</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] flex items-center space-x-1">
                            <strong className="text-gray-500 font-mono">S:</strong>
                            {p.supervisorNombre ? (
                              <span className="text-gray-800">{p.supervisorNombre}</span>
                            ) : (
                              <span className="text-[#BA1A1A] font-bold flex items-center space-x-0.5 bg-red-100 px-1 rounded">
                                <AlertTriangle className="w-3 h-3 text-[#BA1A1A]" />
                                <span>Falta Asignar Supervisión</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Estado Badges */}
                        <td className="py-3 px-4 text-center">
                          {p.estado === 'ACTIVO' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-300">
                              ● Activo
                            </span>
                          )}
                          {p.estado === 'PAUSADO' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              ● Pausado
                            </span>
                          )}
                          {p.estado === 'CONCLUIDO' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700 border border-gray-400">
                              ● Concluido
                            </span>
                          )}
                          <div className="text-[10px] text-[#5B403D] mt-1">{p.provincia}</div>
                        </td>

                        {/* ACCIONES DEL GRID: SOLO BOTONES CON ICONOS */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1.5 justify-end">
                            {/* BOTÓN 1: Editar / Reasignar (Solo icono) */}
                            {canManageProjects && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingProject(p);
                                }}
                                className="p-2 bg-white hover:bg-red-50 text-[#91000A] border border-[#91000A]/30 rounded-lg shadow-sm transition-all hover:scale-110"
                                title="Editar datos del proyecto, archivar o reasignar Residente/Supervisor"
                              >
                                <Edit3 className="w-4 h-4 text-[#91000A]" />
                              </button>
                            )}

                            {/* BOTÓN 2: Archivar Proyecto y Cuaderno (Solo icono - Supervisión) */}
                            {canManageProjects && !p.archivado && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDirectArchiveProject(p);
                                }}
                                className="p-2 bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-900 border border-gray-300 rounded-lg shadow-sm transition-all hover:scale-110"
                                title="Archivar proyecto y cuaderno digital (Requiere estado Concluido)"
                              >
                                <Archive className="w-4 h-4 text-gray-700 hover:text-amber-900" />
                              </button>
                            )}

                            {/* BOTÓN 3: Cuaderno Digital (Solo icono) */}
                            <Link
                              href={`/proyectos/${p.id}`}
                              onClick={() => {
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('last_selected_project_id', p.id);
                                }
                              }}
                              className="p-2 bg-[#91000A] hover:bg-[#B71C1C] text-white rounded-lg shadow-sm transition-all hover:scale-110 inline-flex items-center justify-center"
                              title={`Abrir Cuaderno Digital de Incidencias (CUI: ${p.cui})`}
                            >
                              <BookOpen className="w-4 h-4 text-white" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredProjects.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-xs text-gray-500">
                          No se encontraron proyectos en la cartera que coincidan con la búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer de Paginación */}
              <div className="bg-[#F9F9F9] border-t border-[#E2E2E2] px-4 py-3 flex items-center justify-between text-xs text-[#5B403D]">
                <div>
                  Mostrando <strong>1-{filteredProjects.length}</strong> de <strong>{projects.length}</strong> proyectos en cartera
                </div>
                <div className="flex space-x-1">
                  <button disabled className="px-2.5 py-1 border border-[#8F706C]/30 rounded bg-white text-gray-400 cursor-not-allowed">
                    Anterior
                  </button>
                  <button className="px-2.5 py-1 border border-[#91000A] rounded bg-[#91000A] text-white font-bold">
                    1
                  </button>
                  <button disabled className="px-2.5 py-1 border border-[#8F706C]/30 rounded bg-white text-gray-400 cursor-not-allowed">
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Modal de Registro de Nuevo Proyecto */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onSaveProject={handleAddNewProject}
      />

      {/* Modal de Edición, Reasignación y Archivamiento de Proyecto */}
      <EditProjectModal
        isOpen={Boolean(editingProject)}
        onClose={() => setEditingProject(null)}
        project={editingProject}
        onSaveProject={handleUpdateProject}
      />

      {/* Modal de Carga Masiva desde Excel / CSV */}
      {isBulkUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 border border-[#E2E2E2] shadow-2xl space-y-5 relative my-6">
            <button
              type="button"
              onClick={() => setIsBulkUploadModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 text-[#91000A]">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-[#1A1C1C] uppercase tracking-wide">
                  Cargar Cartera de Proyectos desde Excel / CSV
                </h3>
                <p className="text-xs text-gray-500">
                  Importación masiva de proyectos e inversiones públicas GORE Lambayeque
                </p>
              </div>
            </div>

            {/* Input de Selección de Archivo */}
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-400/80 hover:border-emerald-600 rounded-xl p-6 text-center bg-emerald-50/40 hover:bg-emerald-50 cursor-pointer transition-all space-y-2 group"
              >
                <Upload className="w-8 h-8 text-emerald-700 mx-auto group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-[#1A1C1C]">
                  {selectedFile ? (
                    <span className="text-emerald-800 font-mono text-sm">📄 {selectedFile.name}</span>
                  ) : (
                    <span>Haga clic para seleccionar o arrastre su archivo Excel (.xlsx / .csv)</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500">
                  Formatos soportados: Excel (.xlsx, .xls) o CSV con separadores por coma.
                </p>
              </div>
            </div>

            {/* Previsualización de filas procesadas */}
            {parsedPreview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900 bg-emerald-100/70 p-2.5 rounded border border-emerald-300">
                  <span>Proyectos detectados para importar:</span>
                  <span className="font-mono text-sm">{parsedPreview.length} Obra(s)</span>
                </div>

                <div className="max-h-36 overflow-y-auto border rounded divide-y text-xs bg-gray-50 p-2">
                  {parsedPreview.map((p, idx) => (
                    <div key={idx} className="py-1.5 flex justify-between items-center text-[11px]">
                      <div>
                        <strong className="text-[#91000A] font-mono">CUI {p.cui}</strong> — <span className="font-semibold text-gray-800">{p.nombre}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-semibold">{p.provincia}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acciones de Modal */}
            <div className="flex justify-between items-center pt-3 border-t border-[#E2E2E2]">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-xs text-[#91000A] font-bold hover:underline flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Plantilla Excel de Ejemplo</span>
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBulkUploadModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-100"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleProcessBulkUpload}
                  disabled={parsedPreview.length === 0}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow transition-all flex items-center space-x-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Procesar e Importar Proyectos</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
