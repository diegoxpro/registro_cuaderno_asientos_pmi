'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Printer,
  Download,
  Building2,
  Calendar,
  FileSpreadsheet,
  RotateCcw,
  Settings,
  Users,
  Tags,
  LogOut,
  Database,
  CheckCircle2,
  ExternalLink,
  Paperclip,
  Search,
  BookOpen
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import UserManagementModal from '@/components/UserManagementModal';
import IncidenceTypesModal from '@/components/IncidenceTypesModal';
import DatabaseBackupModal from '@/components/DatabaseBackupModal';
import { INITIAL_PROJECTS, INITIAL_INCIDENCES, MockProject, MockIncidenceEntry } from '@/lib/mockData';

export default function ReportePorAsientoPage() {
  const router = useRouter();

  // Estados de Proyectos y Asientos
  const [projects, setProjects] = useState<MockProject[]>(INITIAL_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('p-2704014');
  const [availableIncidences, setAvailableIncidences] = useState<MockIncidenceEntry[]>([]);
  const [selectedIncidenceId, setSelectedIncidenceId] = useState<string>('');

  // Metadatos editables/configurables para el reporte
  const [actorType, setActorType] = useState<string>('Empresa Privada');
  const [actorName, setActorName] = useState<string>('CONSORCIO FINANCISTA TUMBAS REALES');

  // Estado del Menú de Opciones y Modales
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [isIncidenceTypesOpen, setIsIncidenceTypesOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [userRole, setUserRole] = useState('ADMINISTRADOR');

  // Estado de Generación
  const [isGenerated, setIsGenerated] = useState<boolean>(true);
  const [generatedProject, setGeneratedProject] = useState<MockProject | null>(null);
  const [generatedIncidence, setGeneratedIncidence] = useState<MockIncidenceEntry | null>(null);
  const [generatedActorType, setGeneratedActorType] = useState<string>('Empresa Privada');
  const [generatedActorName, setGeneratedActorName] = useState<string>('CONSORCIO FINANCISTA TUMBAS REALES');

  // Cargar Proyectos al montar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('user_role') || 'ADMINISTRADOR';
      setUserRole(role);

      const savedProjects = localStorage.getItem('app_projects_list');
      let loadedProjects = INITIAL_PROJECTS;
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Unir proyectos guardados asegurando que p-2704014 esté presente
            const hasSample = parsed.some((p) => p.id === 'p-2704014' || p.cui === '2704014');
            loadedProjects = hasSample ? parsed : [...INITIAL_PROJECTS.filter(p => p.id === 'p-2704014'), ...parsed];
          }
        } catch (e) {
          console.error('Error al cargar proyectos guardados:', e);
        }
      }
      setProjects(loadedProjects);

      // Si existe el proyecto de ejemplo p-2704014, seleccionarlo por defecto
      const defaultProj = loadedProjects.find(p => p.id === 'p-2704014') || loadedProjects[0];
      if (defaultProj) {
        setSelectedProjectId(defaultProj.id);
      }
    }
  }, []);

  // Cargar Asientos cuando cambia el proyecto seleccionado
  useEffect(() => {
    if (!selectedProjectId) return;

    const activeProj = projects.find(p => p.id === selectedProjectId || p.cui === selectedProjectId);
    const projId = activeProj ? activeProj.id : selectedProjectId;
    const projCui = activeProj ? activeProj.cui : selectedProjectId;

    let projectIncidences: MockIncidenceEntry[] = [];
    if (typeof window !== 'undefined') {
      const storageKey1 = `custom_incidences_${projId}`;
      const storageKey2 = `custom_incidences_${projCui}`;
      const storageKey3 = `custom_incidences_p-${projCui}`;

      const savedStr = localStorage.getItem(storageKey1) || localStorage.getItem(storageKey2) || localStorage.getItem(storageKey3);
      let list = INITIAL_INCIDENCES[projId] || INITIAL_INCIDENCES[projCui] || INITIAL_INCIDENCES[`p-${projCui}`] || [];
      if (savedStr) {
        try {
          const custom = JSON.parse(savedStr);
          if (Array.isArray(custom) && custom.length > 0) {
            list = [...custom, ...list];
          }
        } catch (e) {
          console.error(e);
        }
      }
      projectIncidences = list;
    } else {
      projectIncidences = INITIAL_INCIDENCES[projId] || INITIAL_INCIDENCES[projCui] || INITIAL_INCIDENCES[`p-${projCui}`] || [];
    }

    // Si aún no hay incidencias y es el proyecto de Museo Tumbas Reales CUI 2704014
    if (projectIncidences.length === 0 && (projCui === '2704014' || projId === 'p-2704014' || projId === '2704014')) {
      projectIncidences = INITIAL_INCIDENCES['p-2704014'] || INITIAL_INCIDENCES['2704014'] || [];
    }

    // Ordenar por correlativo ascendente
    projectIncidences.sort((a, b) => a.numeroCorrelativo - b.numeroCorrelativo);
    setAvailableIncidences(projectIncidences);

    if (projectIncidences.length > 0) {
      const firstInc = projectIncidences[0];
      setSelectedIncidenceId(firstInc.id);

      // Deducir Actor y Nombre según el autor del asiento
      deduceActorInfo(firstInc, activeProj);

      // Generar vista inicial
      setGeneratedProject(activeProj || null);
      setGeneratedIncidence(firstInc);
      setIsGenerated(true);
    } else {
      setSelectedIncidenceId('');
      setGeneratedIncidence(null);
      setIsGenerated(false);
    }
  }, [selectedProjectId, projects]);

  // Manejar cambio de Asiento en el selector
  const handleIncidenceChange = (incidenceId: string) => {
    setSelectedIncidenceId(incidenceId);
    const inc = availableIncidences.find(i => i.id === incidenceId);
    const activeProj = projects.find(p => p.id === selectedProjectId || p.cui === selectedProjectId);
    if (inc) {
      deduceActorInfo(inc, activeProj);
      setGeneratedIncidence(inc);
      if (activeProj) setGeneratedProject(activeProj);
      setIsGenerated(true);
    }
  };

  // Función para deducir Actor y Nombre
  const deduceActorInfo = (inc: MockIncidenceEntry, proj?: MockProject) => {
    const cargo = (inc.autorCargo || '').toUpperCase();
    const isMuseum = proj?.cui === '2704014' || proj?.id === 'p-2704014';

    if (cargo.includes('SUPERVISOR')) {
      setActorType('Supervisión de Obra');
      setActorName(proj?.entidadSupervisora || 'EMPRESA SUPERVISORA');
    } else if (isMuseum) {
      setActorType('Empresa Privada');
      setActorName('CONSORCIO FINANCISTA TUMBAS REALES');
    } else if (cargo.includes('RESIDENTE') || cargo.includes('JEFE DE PROYECTO')) {
      setActorType('Empresa Privada');
      setActorName(proj?.entidadEjecutora || 'CONSORCIO FINANCISTA');
    } else {
      setActorType('Entidad Pública');
      setActorName('GOBIERNO REGIONAL DE LAMBAYEQUE');
    }
  };

  // Generar Reporte
  const handleGenerate = () => {
    const proj = projects.find(p => p.id === selectedProjectId || p.cui === selectedProjectId);
    const inc = availableIncidences.find(i => i.id === selectedIncidenceId);

    if (proj && inc) {
      setGeneratedProject(proj);
      setGeneratedIncidence(inc);
      setGeneratedActorType(actorType);
      setGeneratedActorName(actorName);
      setIsGenerated(true);
    }
  };

  // Imprimir (A4)
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Formatear Fecha y Hora al formato DD/MM/AAAA HH:mm
  const formatFechaHora = (fechaHoraStr?: string) => {
    if (!fechaHoraStr) return '';
    try {
      const parts = fechaHoraStr.split(' ');
      if (parts.length >= 2) {
        const datePart = parts[0];
        const timePart = parts[1].substring(0, 5);
        if (datePart.includes('-')) {
          const [yyyy, mm, dd] = datePart.split('-');
          return `${dd}/${mm}/${yyyy} ${timePart}`;
        }
        return `${datePart} ${timePart}`;
      }
      const d = new Date(fechaHoraStr);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
      }
      return fechaHoraStr;
    } catch {
      return fechaHoraStr;
    }
  };

  // Formatear texto de Descripción: mantener los asteriscos o viñetas
  const renderDescripcionLines = (texto?: string) => {
    if (!texto) return null;
    const lines = texto.split('\n').map(l => l.trim()).filter(Boolean);

    return (
      <div className="space-y-1">
        {lines.map((line, idx) => (
          <p key={idx} className="leading-relaxed">
            {line}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col text-[#1A1C1C]">

      {/* Header Corporativo GORE Lambayeque */}
      <header className="bg-[#91000A] text-white shadow-md no-print">
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
            <NotificationsDropdown />

            {/* Menú de Configuración */}
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

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Subheader Banner */}
          <div className="bg-white border-b border-[#E2E2E2] py-4 px-6 sm:px-8 no-print">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-[#91000A] font-bold font-mono uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>REPORTES OFICIALES LEY N° 29230 — GORE LAMBAYEQUE</span>
                </span>
                <h1 className="text-xl font-bold font-display text-[#1A1C1C]">
                  Generación de Reportes del Cuaderno Digital
                </h1>
              </div>

              <div className="flex items-center space-x-2">
                <Link
                  href="/dashboard"
                  className="px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-gray-600" />
                  <span>Volver al Inicio</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Pestañas de Navegación de Reportes */}
          <div className="bg-white border-b border-[#E2E2E2] px-6 sm:px-8 no-print">
            <div className="max-w-7xl mx-auto flex space-x-6">
              <Link
                href="/reportes"
                className="py-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 font-medium text-xs flex items-center space-x-2 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Reporte Consolidado (Por Proyecto)</span>
              </Link>
              <Link
                href="/reportes/por-asiento"
                className="py-3 px-1 border-b-2 border-[#91000A] text-[#91000A] font-bold text-xs flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Reporte por Asiento</span>
              </Link>
            </div>
          </div>

          {/* Contenedor Principal */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full flex-1">
            {/* PANEL DE SELECCIÓN Y CONFIGURACIÓN */}
            <div className="bg-white rounded-xl border border-[#E2E2E2] shadow-sm overflow-hidden no-print">
              <div className="bg-[#91000A] text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-5 h-5 text-yellow-300" />
                  <h2 className="text-sm font-bold font-display uppercase tracking-wider">
                    Configurador de Reporte por Asiento Individual
                  </h2>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* SELECCIÓN DE PROYECTO */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#5B403D] uppercase tracking-wider">
                      1. Seleccione el Proyecto de Inversión <span className="text-[#BA1A1A]">*</span>
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#F9F9F9] border-2 border-[#91000A]/30 rounded-lg text-xs font-semibold text-[#1A1C1C] focus:outline-none focus:ring-2 focus:ring-[#91000A] transition-all cursor-pointer shadow-sm"
                    >
                      {projects.map((p) => {
                        const fullText = `CUI ${p.cui} — ${p.nombre}`;
                        const labelText = fullText.length > 130 ? `${fullText.substring(0, 125)}...` : fullText;
                        return (
                          <option key={p.id} value={p.id} title={fullText}>
                            {labelText}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* SELECCIÓN DE ASIENTO */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#5B403D] uppercase tracking-wider">
                      2. Seleccione el Asiento del Cuaderno <span className="text-[#BA1A1A]">*</span>
                    </label>
                    {availableIncidences.length > 0 ? (
                      <select
                        value={selectedIncidenceId}
                        onChange={(e) => handleIncidenceChange(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#F9F9F9] border-2 border-[#91000A]/30 rounded-lg text-xs font-semibold text-[#1A1C1C] focus:outline-none focus:ring-2 focus:ring-[#91000A] transition-all cursor-pointer shadow-sm"
                      >
                        {availableIncidences.map((inc) => {
                          const titleText = `Asiento N° ${inc.numeroCorrelativo} | ${inc.fechaHora} | ${inc.titulo}`;
                          const shortText = titleText.length > 120 ? `${titleText.substring(0, 115)}...` : titleText;
                          return (
                            <option key={inc.id} value={inc.id} title={titleText}>
                              {shortText}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <div className="px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-medium">
                        Este proyecto aún no tiene asientos registrados.
                      </div>
                    )}
                  </div>
                </div>

                {/* PARÁMETROS DE CABECERA: ACTOR Y NOMBRE */}
                <div className="border-t border-gray-200 pt-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        Actor (Entidad / Empresa)
                      </label>
                      <input
                        type="text"
                        value={actorType}
                        onChange={(e) => setActorType(e.target.value)}
                        placeholder="Ej. Empresa Privada, Supervisión de Obra, etc."
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#91000A]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        Nombre de la Empresa o Consorcio
                      </label>
                      <input
                        type="text"
                        value={actorName}
                        onChange={(e) => setActorName(e.target.value)}
                        placeholder="Ej. CONSORCIO FINANCISTA TUMBAS REALES"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#91000A]"
                      />
                    </div>
                  </div>
                </div>

                {/* BOTÓN GENERAR */}
                <div className="border-t border-gray-200 pt-4 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={availableIncidences.length === 0}
                    className={`px-6 py-2.5 text-xs font-bold rounded-lg shadow-md flex items-center space-x-2 transition-all cursor-pointer ${
                      availableIncidences.length > 0
                        ? 'bg-[#91000A] hover:bg-[#780008] text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Generar Reporte del Asiento</span>
                  </button>
                </div>
              </div>
            </div>

            {/* VISTA PREVIA Y FICHA IMPRIMIBLE DEL REPORTE */}
            {isGenerated && generatedProject && generatedIncidence && (
              <div className="space-y-4">
                {/* Barra de Acciones / Herramientas */}
                <div className="bg-white p-4 rounded-xl border border-[#E2E2E2] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
                  <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Reporte del Asiento N° {generatedIncidence.numeroCorrelativo} generado satisfactoriamente</span>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="flex-1 sm:flex-none px-4 py-2 bg-[#91000A] hover:bg-[#780008] text-white text-xs font-bold rounded-lg shadow flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                      title="Imprimir documento oficial o guardar en PDF"
                    >
                      <Printer className="w-4 h-4" />
                      <span>🖨️ Imprimir / Guardar en PDF</span>
                    </button>
                  </div>
                </div>

                {/* DOCUMENTO OFICIAL FORMAL (IDÉNTICO A LA IMAGEN) */}
                <div className="print-area bg-white p-8 sm:p-14 rounded-xl border border-gray-300 shadow-xl max-w-4xl mx-auto text-black font-sans">
                  {/* Encabezado: Logo circular y Título */}
                  <div className="relative mb-6 pt-2">
                    {/* Sello circular con logo a la izquierda */}
                    <div className="sm:absolute sm:left-0 sm:top-0 mb-4 sm:mb-0 flex sm:block justify-center">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[2.5px] border-[#91000A] p-1.5 flex flex-col items-center justify-center bg-white shadow-sm">
                        <img
                          src="/img/logo.png"
                          alt="Escudo GORE Lambayeque"
                          className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
                        />
                        <span className="text-[7px] font-extrabold text-[#91000A] text-center leading-tight tracking-tighter mt-1 uppercase font-display">
                          Gobierno Regional<br />Lambayeque
                        </span>
                      </div>
                    </div>

                    {/* Título centrado */}
                    <div className="text-center sm:pl-28 pt-2">
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black">
                        Asiento del Cuaderno de Incidencias
                      </h1>
                    </div>
                  </div>

                  {/* Bloque de Metadatos de Cabecera */}
                  <div className="space-y-2 text-[13px] sm:text-[14px] leading-snug sm:pl-28 mt-4 sm:mt-6">
                    {/* Entidad Pública */}
                    <div className="flex items-baseline">
                      <div className="w-44 shrink-0 text-right pr-3 font-normal text-black">
                        Entidad Pública:
                      </div>
                      <div className="flex-1 font-normal text-black">
                        Gobierno Regional Lambayeque
                      </div>
                    </div>

                    {/* Proyecto de Inversión */}
                    <div className="flex items-baseline">
                      <div className="w-44 shrink-0 text-right pr-3 font-normal text-black">
                        Proyecto de Inversión:
                      </div>
                      <div className="flex-1 font-normal text-black uppercase">
                        “{generatedProject.nombre}”, CUI N° {generatedProject.cui}.
                      </div>
                    </div>

                    {/* Actor */}
                    <div className="flex items-baseline">
                      <div className="w-44 shrink-0 text-right pr-3 font-normal text-black">
                        Actor:
                      </div>
                      <div className="flex-1 font-normal text-black">
                        {generatedActorType}
                      </div>
                    </div>

                    {/* Nombre */}
                    <div className="flex items-baseline">
                      <div className="w-44 shrink-0 text-right pr-3 font-normal text-black">
                        Nombre:
                      </div>
                      <div className="flex-1 font-normal text-black uppercase">
                        {generatedActorName}
                      </div>
                    </div>
                  </div>

                  {/* LÍNEA DIVISORIA SÓLIDA NEGRA */}
                  <div className="border-t-[2.5px] border-black my-6"></div>

                  {/* CUERPO DEL ASIENTO */}
                  <div className="space-y-2.5 text-[13px] sm:text-[14px] leading-snug">
                    {/* Número de Asiento */}
                    <div className="flex items-baseline">
                      <div className="w-44 shrink-0 text-right pr-3 font-normal text-black">
                        Número de Asiento:
                      </div>
                      <div className="flex-1 font-normal text-black">
                        {generatedIncidence.numeroCorrelativo}
                      </div>
                    </div>

                    {/* Fecha y Hora */}
                    <div className="flex items-baseline">
                      <div className="w-44 shrink-0 text-right pr-3 font-normal text-black">
                        Fecha y Hora:
                      </div>
                      <div className="flex-1 font-normal text-black">
                        {formatFechaHora(generatedIncidence.fechaHora)}
                      </div>
                    </div>

                    {/* Usuario */}
                    <div className="flex items-baseline">
                      <div className="w-44 shrink-0 text-right pr-3 font-normal text-black">
                        Usuario:
                      </div>
                      <div className="flex-1 font-normal text-black uppercase">
                        {generatedIncidence.autorNombre}
                      </div>
                    </div>

                    {/* Rol */}
                    <div className="flex items-baseline">
                      <div className="w-44 shrink-0 text-right pr-3 font-normal text-black">
                        Rol:
                      </div>
                      <div className="flex-1 font-normal text-black uppercase">
                        {generatedIncidence.autorCargo}
                      </div>
                    </div>

                    {/* Título */}
                    <div className="flex items-baseline">
                      <div className="w-44 shrink-0 text-right pr-3 font-normal text-black">
                        Título:
                      </div>
                      <div className="flex-1 font-normal text-black uppercase">
                        {generatedIncidence.titulo}
                      </div>
                    </div>

                    {/* Descripción */}
                    <div className="flex items-baseline">
                      <div className="w-44 shrink-0 text-right pr-3 font-normal text-black">
                        Descripción:
                      </div>
                      <div className="flex-1 font-normal text-black text-justify">
                        {renderDescripcionLines(generatedIncidence.contenido)}
                      </div>
                    </div>

                    {/* Archivos Anexos */}
                    <div className="flex items-baseline pt-2">
                      <div className="w-44 shrink-0 text-right pr-3 font-normal text-black">
                        Archivos Anexos:
                      </div>
                      <div className="flex-1 space-y-1 text-black">
                        {generatedIncidence.adjuntos && generatedIncidence.adjuntos.length > 0 ? (
                          generatedIncidence.adjuntos.map((adj) => (
                            <div key={adj.id} className="flex items-center space-x-2">
                              {adj.urlArchivo && adj.urlArchivo !== '#' ? (
                                <a
                                  href={adj.urlArchivo}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-black hover:underline cursor-pointer flex items-center space-x-1"
                                >
                                  <span>{adj.nombreArchivo}</span>
                                </a>
                              ) : (
                                <span>{adj.nombreArchivo}</span>
                              )}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-500 italic">Ningún archivo anexo registrado</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modales de Opciones */}
      <UserManagementModal
        isOpen={isUserMgmtOpen}
        onClose={() => setIsUserMgmtOpen(false)}
      />
      <IncidenceTypesModal
        isOpen={isIncidenceTypesOpen}
        onClose={() => setIsIncidenceTypesOpen(false)}
      />
      <DatabaseBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
}
