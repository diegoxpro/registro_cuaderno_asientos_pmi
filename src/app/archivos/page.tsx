'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Archive,
  Search,
  BookOpen,
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Lock,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  Settings,
  Users,
  Tags,
  LogOut,
  Calendar,
  Layers,
  Paperclip,
  CheckCheck,
  CornerDownRight,
  X,
  Database
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import UserManagementModal from '@/components/UserManagementModal';
import IncidenceTypesModal from '@/components/IncidenceTypesModal';
import DatabaseBackupModal from '@/components/DatabaseBackupModal';
import { INITIAL_PROJECTS, INITIAL_INCIDENCES, MockProject, MockIncidenceEntry } from '@/lib/mockData';

export default function ArchivedNotebooksPage() {
  const [projects, setProjects] = useState<MockProject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvincia, setFilterProvincia] = useState('TODOS');

  // Modals & Navigation state
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [isIncidenceTypesOpen, setIsIncidenceTypesOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [userRole, setUserRole] = useState('ADMINISTRADOR');
  const [userName, setUserName] = useState('');

  // Selected Archived Notebook Modal
  const [selectedProjectForView, setSelectedProjectForView] = useState<MockProject | null>(null);
  const [archivedIncidences, setArchivedIncidences] = useState<MockIncidenceEntry[]>([]);
  const [seatSearchQuery, setSeatSearchQuery] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('user_role') || 'SUPERVISOR';
      const name = localStorage.getItem('user_name') || 'Usuario GORE';
      setUserRole(role.toUpperCase());
      setUserName(name);

      // Cargar lista de proyectos
      const savedProjectsStr = localStorage.getItem('app_projects_list');
      if (savedProjectsStr) {
        try {
          const parsed = JSON.parse(savedProjectsStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjects(parsed);
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      setProjects(INITIAL_PROJECTS);
    }
  }, []);

  const saveProjectsToStorage = (newList: MockProject[]) => {
    setProjects(newList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_projects_list', JSON.stringify(newList));
    }
  };

  const isSupervisorOrAdmin = ['SUPERVISOR', 'SUPERVISOR_DE_OBRA', 'SUPERVISOR_DE_PROYECTO', 'ADMINISTRADOR', 'ADMIN'].includes(userRole);

  // Proyectos archivados o concluidos
  const archivedProjects = projects.filter((p) => p.archivado || p.estado === 'CONCLUIDO');

  const filteredArchivedProjects = archivedProjects.filter((p) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      p.cui.toLowerCase().includes(query) ||
      p.nombre.toLowerCase().includes(query) ||
      (p.nConvenio && p.nConvenio.toLowerCase().includes(query)) ||
      (p.entidadEjecutora && p.entidadEjecutora.toLowerCase().includes(query)) ||
      (p.residenteNombre && p.residenteNombre.toLowerCase().includes(query)) ||
      (p.supervisorNombre && p.supervisorNombre.toLowerCase().includes(query));

    const matchesProvincia = filterProvincia === 'TODOS' || p.provincia === filterProvincia;
    return matchesSearch && matchesProvincia;
  });

  // Abrir vista completa del cuaderno digital archivado
  const handleOpenArchivedNotebook = (proj: MockProject) => {
    setSelectedProjectForView(proj);
    setSeatSearchQuery('');

    if (typeof window !== 'undefined') {
      const storageKey = `custom_incidences_${proj.id}`;
      const savedStr = localStorage.getItem(storageKey);
      const initialList = INITIAL_INCIDENCES[proj.id] || [];
      if (savedStr) {
        try {
          const customList = JSON.parse(savedStr);
          setArchivedIncidences([...customList, ...initialList]);
          return;
        } catch (e) {
          console.error(e);
        }
      }
      setArchivedIncidences(initialList);
    } else {
      setArchivedIncidences(INITIAL_INCIDENCES[proj.id] || []);
    }
  };

  // Desarchivar Proyecto (Opción exclusiva de Supervisión/Administración)
  const handleUnarchiveProject = (proj: MockProject) => {
    if (confirm(`¿Está seguro de DESARCHIVAR el proyecto CUI ${proj.cui} (${proj.nombre}) y retornar su Cuaderno Digital a estado ACTIVO?`)) {
      const updatedList = projects.map((p) => {
        if (p.id === proj.id) {
          return {
            ...p,
            estado: 'ACTIVO' as const,
            archivado: false,
            estadoObra: 'En Ejecución Física (Reactivado)',
          };
        }
        return p;
      });
      saveProjectsToStorage(updatedList);
      alert(`✅ El proyecto CUI ${proj.cui} ha sido reabierto y reactivado exitosamente.`);
    }
  };

  // Simular descarga de PDF de Cuaderno Completo Archivado
  const handleDownloadPDF = (proj: MockProject) => {
    alert(`📥 Descargando acta y compendio digital sellado en PDF para el Cuaderno Digital CUI ${proj.cui} (${proj.nombre})...\n\nEl archivo encriptado incluye la firma digital de residencia y supervisión, con todos los asientos e historiales de atención registrados bajo la Ley N° 29230.`);
  };

  const totalSeatsCount = archivedProjects.reduce((acc, p) => acc + (p.asientosCount || 5), 0);

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col text-[#1A1C1C]">
      {/* Header Superior Corporativo GORE */}
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
              <p className="text-[11px] text-red-100 font-sans">
                Archivos de Cuadernos Digitales de Incidencias — Ley N° 29230
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <NotificationsDropdown />

            {/* Opciones del Sistema */}
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

      {/* Main Layout con Sidebar Persistente */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

          {/* Banner de Título de la Página */}
          <div className="bg-white border-b border-[#E2E2E2] py-4 px-4 sm:px-8 space-y-2">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2 text-xs text-[#5B403D]">
                  <Link href="/dashboard" className="hover:text-[#91000A]">Inicio</Link>
                  <ChevronRight className="w-3 h-3 text-[#8F706C]" />
                  <span className="font-semibold text-[#1A1C1C]">Archivos de Cuadernos</span>
                </div>
                <h1 className="text-xl font-bold font-display text-[#1A1C1C] uppercase tracking-wide flex items-center space-x-2 mt-1">
                  <Archive className="w-6 h-6 text-[#91000A]" />
                  <span>Archivos de Cuadernos Digitales de Incidencias</span>
                </h1>
                <p className="text-xs text-gray-500 font-sans">
                  Repositorio oficial de custodia permanente para obras concluidas y cuadernos digitalmente sellados
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-3 py-1.5 bg-[#91000A]/10 text-[#91000A] rounded-lg border border-[#91000A]/20 text-xs font-mono font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#91000A]" />
                  <span>CUSTODIA DIGITAL INTEGRAL GORE</span>
                </span>
              </div>
            </div>
          </div>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">

            {/* Buscador y Filtros */}
            <div className="bg-white p-4 rounded-xl border border-[#E2E2E2] shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-96">
                  <input
                    type="text"
                    placeholder="Buscar por CUI, Proyecto, Convenio, Residente o Supervisor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F9F9F9] border border-[#8F706C]/30 rounded-lg text-xs focus:ring-2 focus:ring-[#91000A]"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <span className="text-xs text-gray-500 font-bold hidden sm:inline">Provincia:</span>
                  <select
                    value={filterProvincia}
                    onChange={(e) => setFilterProvincia(e.target.value)}
                    className="px-3 py-2 bg-[#F9F9F9] border border-[#8F706C]/30 rounded-lg text-xs font-semibold text-[#1A1C1C]"
                  >
                    <option value="TODOS">Provincia: Todas</option>
                    <option value="Chiclayo">Chiclayo</option>
                    <option value="Ferreñafe">Ferreñafe</option>
                    <option value="Lambayeque">Lambayeque</option>
                  </select>
                </div>
              </div>
            </div>

            {/* LISTADO / GRID DE PROYECTOS Y CUADERNOS ARCHIVADOS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold font-display text-[#91000A] uppercase tracking-wider flex items-center space-x-2">
                  <span>Proyectos Concluidos y Cuadernos Archivados</span>
                  <span className="bg-red-100 text-[#91000A] px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">
                    {filteredArchivedProjects.length}
                  </span>
                </h2>

                <p className="text-xs text-gray-500 hidden sm:block">
                  Registros protegidos contra modificaciones posteriores
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredArchivedProjects.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl border-2 border-[#E2E2E2] hover:border-[#91000A]/40 transition-all overflow-hidden shadow-sm hover:shadow-md"
                  >
                    {/* Header de Tarjeta */}
                    <div className="bg-[#F9F9F9] px-5 py-3 border-b border-[#E2E2E2] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-white bg-[#91000A] px-2.5 py-0.5 rounded shadow-sm">
                          CUI {p.cui}
                        </span>
                        <span className="text-[11px] font-bold text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-300">
                          {p.modalidad}
                        </span>
                        <span className="text-[10px] font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded border border-purple-300">
                          {p.provincia}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-gray-200 text-gray-800 border border-gray-400 flex items-center space-x-1">
                          <Lock className="w-3 h-3 text-gray-700" />
                          <span>🔒 CUADERNO CUSTODIADO Y ARCHIVADO (CONCLUIDO)</span>
                        </span>
                      </div>
                    </div>

                    {/* Cuerpo de Tarjeta */}
                    <div className="p-5 space-y-4">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-[#5B403D] uppercase tracking-wider">
                          Convenio: {p.nConvenio || 'CONVENIO GORE LAMBAYEQUE'}
                        </span>
                        <h3 className="text-base font-bold font-display text-[#1A1C1C] uppercase leading-snug">
                          {p.nombre}
                        </h3>
                      </div>

                      {/* Detalles Técnicos del Archivo */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-red-50/30 p-3 rounded-lg border border-red-100 text-xs">
                        <div>
                          <p className="text-gray-500 font-semibold text-[11px]">Empresa Ejecutora:</p>
                          <p className="font-bold text-gray-900">{p.entidadEjecutora || 'Consorcio Ejecutor'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-semibold text-[11px]">Residente de Obra:</p>
                          <p className="font-bold text-gray-900">{p.residenteNombre || 'Ing. Asignado'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-semibold text-[11px]">Supervisor de Obra:</p>
                          <p className="font-bold text-gray-900">{p.supervisorNombre || 'Supervisión GORE'}</p>
                        </div>
                      </div>

                      {/* Info de Archivado y Acciones */}
                      <div className="pt-2 border-t border-[#E2E2E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="text-gray-600 space-y-0.5">
                          <p className="flex items-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#91000A]" />
                            <span><strong>Archivado el:</strong> {p.fechaArchivado || '2026-08-26 10:00'}</span>
                          </p>
                          {p.archivadoPor && (
                            <p className="text-[11px] text-gray-500 pl-5">
                              Autorizado por: <strong>{p.archivadoPor}</strong>
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Desarchivar Proyecto (Solo Supervisores/Admins) */}
                          {isSupervisorOrAdmin && (
                            <button
                              type="button"
                              onClick={() => handleUnarchiveProject(p)}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-amber-100 text-amber-900 rounded border border-gray-300 font-bold text-xs flex items-center space-x-1 transition-all"
                              title="Reabrir el proyecto y retornar el cuaderno digital a estado ACTIVO"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                              <span>Desarchivar</span>
                            </button>
                          )}

                          {/* Exportar PDF del Cuaderno Archivado */}
                          <button
                            type="button"
                            onClick={() => handleDownloadPDF(p)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded border border-gray-300 font-bold text-xs flex items-center space-x-1 transition-all"
                            title="Descargar compendio digital completo sellado en PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-red-700" />
                            <span>Exportar PDF</span>
                          </button>

                          {/* Ver Cuaderno Digital Archivado Completo */}
                          <button
                            type="button"
                            onClick={() => handleOpenArchivedNotebook(p)}
                            className="px-4 py-1.5 bg-[#91000A] hover:bg-[#B71C1C] text-white rounded font-bold text-xs shadow flex items-center space-x-1.5 transition-all"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Ver Cuaderno Archivado</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredArchivedProjects.length === 0 && (
                  <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300 space-y-3">
                    <Archive className="w-12 h-12 text-gray-300 mx-auto" />
                    <h3 className="text-sm font-bold text-gray-700 uppercase">No hay cuadernos de incidencias archivados</h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                      Los supervisores podrán archivar los proyectos y sus cuadernos de incidencias digitales una vez que la obra alcance el estado <strong>CONCLUIDO</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </main>
        </div>
      </div>

      {/* MODAL DE VISUALIZACIÓN DEL CUADERNO DIGITAL ARCHIVADO */}
      {selectedProjectForView && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-5xl w-full border border-[#E2E2E2] shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in fade-in duration-200">

            {/* Header del Modal */}
            <div className="bg-[#91000A] text-white p-4 px-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg border border-white/20">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold bg-white text-[#91000A] px-2 py-0.5 rounded">
                      CUI {selectedProjectForView.cui}
                    </span>
                    <span className="text-xs text-red-100 font-bold">● CUADERNO DIGITAL ARCHIVADO</span>
                  </div>
                  <h2 className="text-sm font-bold font-display tracking-wide uppercase line-clamp-1 mt-0.5">
                    {selectedProjectForView.nombre}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProjectForView(null)}
                className="p-1 text-red-100 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Sub-Header con sello digital de inmutabilidad */}
            <div className="bg-amber-50 p-3 px-6 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2 text-amber-900 font-semibold">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>CUSTODIA HISTÓRICA: Registro completo e inmutable conforme a la Ley N° 29230.</span>
              </div>

              <button
                type="button"
                onClick={() => handleDownloadPDF(selectedProjectForView)}
                className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold text-[11px] shadow-sm flex items-center space-x-1 shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-red-700" />
                <span>Descargar Acta PDF</span>
              </button>
            </div>

            {/* Cuerpo del Modal de Asientos Archivados */}
            <div className="p-6 space-y-4 flex-1 overflow-y-auto text-xs text-[#1A1C1C]">

              {/* Buscador dentro del Cuaderno Archivado */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar asiento por número correlativo, título, emisor o contenido..."
                  value={seatSearchQuery}
                  onChange={(e) => setSeatSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#F9F9F9] border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#91000A]"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>

              {/* Lista de Asientos Archivados */}
              <div className="space-y-3">
                {archivedIncidences
                  .filter((inc) => {
                    const q = seatSearchQuery.toLowerCase();
                    return (
                      inc.titulo.toLowerCase().includes(q) ||
                      inc.contenido.toLowerCase().includes(q) ||
                      inc.autorNombre.toLowerCase().includes(q) ||
                      String(inc.numeroCorrelativo).includes(q)
                    );
                  })
                  .map((inc) => (
                    <div
                      key={inc.id}
                      className="bg-white rounded-lg border border-gray-300 p-4 space-y-2.5 shadow-sm hover:border-[#91000A]/40 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 border-gray-100">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-white bg-[#91000A] px-2 py-0.5 rounded">
                            N° {String(inc.numeroCorrelativo).padStart(4, '0')}
                          </span>
                          <span className="font-bold text-xs text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                            {inc.tipoIncidencia}
                          </span>
                          {inc.esRespuestaDeId && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center space-x-1">
                              <CornerDownRight className="w-3 h-3 text-emerald-700" />
                              <span>RESPUESTA DE SUPERVISIÓN</span>
                            </span>
                          )}
                        </div>

                        <span className="text-gray-500 font-mono text-[11px]">{inc.fechaHora}</span>
                      </div>

                      <h4 className="font-bold text-sm font-display text-gray-900 uppercase">
                        {inc.titulo}
                      </h4>

                      <p className="text-xs text-gray-700 leading-relaxed bg-[#F9F9F9] p-3 rounded border border-gray-200">
                        {inc.contenido}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 pt-1">
                        <div>
                          Emisor: <strong>{inc.autorNombre}</strong> ({inc.autorCargo}) {inc.autorCIP && `— CIP: ${inc.autorCIP}`}
                        </div>

                        {inc.adjuntos && inc.adjuntos.length > 0 && (
                          <div className="flex items-center space-x-1 text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            <Paperclip className="w-3 h-3 text-blue-700" />
                            <span>{inc.adjuntos.length} Archivo(s) Adjunto(s) Custodiados</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                {archivedIncidences.length === 0 && (
                  <div className="p-8 text-center text-gray-500 font-medium">
                    No hay asientos registrados en este cuaderno digital archivado.
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="bg-[#F9F9F9] p-4 px-6 border-t border-[#E2E2E2] flex items-center justify-between">
              <span className="text-xs text-gray-500 font-mono">
                Total Asientos en Custodia: {archivedIncidences.length}
              </span>
              <button
                type="button"
                onClick={() => setSelectedProjectForView(null)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded font-bold text-xs shadow"
              >
                Cerrar Ventana
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modals Generales */}
      <UserManagementModal
        isOpen={isUserMgmtOpen}
        onClose={() => setIsUserMgmtOpen(false)}
      />

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
