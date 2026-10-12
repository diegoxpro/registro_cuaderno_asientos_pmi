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
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ChevronRight,
  ShieldCheck,
  Search,
  BookOpen,
  UserCheck,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  Layers,
  FileCheck,
  Settings,
  Users,
  Tags,
  LogOut,
  Database
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import UserManagementModal from '@/components/UserManagementModal';
import IncidenceTypesModal from '@/components/IncidenceTypesModal';
import DatabaseBackupModal from '@/components/DatabaseBackupModal';
import { INITIAL_PROJECTS, INITIAL_INCIDENCES, MockProject, MockIncidenceEntry } from '@/lib/mockData';

const EMPTY_PROJECT: MockProject = {
  id: '',
  cui: '---',
  nombre: 'Sin proyectos registrados',
  nConvenio: '---',
  modalidad: 'OxI LEY 29230',
  fase: '---',
  entidadEjecutora: '---',
  residenteNombre: null,
  residenteCIP: null,
  supervisorNombre: null,
  supervisorCIP: null,
  estado: 'ACTIVO',
  provincia: 'Lambayeque',
  estadoObra: 'Sin proyectos',
  asientosCount: 0,
};

export default function ReportsPage() {
  const router = useRouter();

  // Estados de Datos
  const [projects, setProjects] = useState<MockProject[]>(INITIAL_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [userRole, setUserRole] = useState('ADMINISTRADOR');

  // Estados del Menú de Opciones y Modales
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [isIncidenceTypesOpen, setIsIncidenceTypesOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Filtros del Reporte
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [filterTipoIncidencia, setFilterTipoIncidencia] = useState<string>('TODAS');
  const [filterEstadoAsiento, setFilterEstadoAsiento] = useState<string>('TODOS');

  // Opciones de Formato
  const [includeDigitalSignatures, setIncludeDigitalSignatures] = useState<boolean>(true);
  const [includeLegalDeclaration, setIncludeLegalDeclaration] = useState<boolean>(true);
  const [includeQrHash, setIncludeQrHash] = useState<boolean>(true);

  // Estado del Reporte Generado
  const [isReportGenerated, setIsReportGenerated] = useState<boolean>(false);
  const [generatedIncidences, setGeneratedIncidences] = useState<MockIncidenceEntry[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string>('');
  const [reportHash, setReportHash] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('user_role') || 'ADMINISTRADOR';
      setUserRole(role);

      const savedProjects = localStorage.getItem('app_projects_list');
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjects(parsed);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0] || EMPTY_PROJECT;

  // Generar Reporte Oficial
  const handleGenerateReport = () => {
    if (!selectedProject) return;

    // Obtener asientos del proyecto desde localStorage o INITIAL_INCIDENCES
    let projectIncidences: MockIncidenceEntry[] = [];
    if (typeof window !== 'undefined') {
      const storageKey = `custom_incidences_${selectedProject.id}`;
      const savedStr = localStorage.getItem(storageKey);
      let list = INITIAL_INCIDENCES[selectedProject.id] || [];
      if (savedStr) {
        try {
          const custom = JSON.parse(savedStr);
          if (Array.isArray(custom)) list = [...custom, ...list];
        } catch (e) {
          console.error(e);
        }
      }
      projectIncidences = list;
    } else {
      projectIncidences = INITIAL_INCIDENCES[selectedProject.id] || [];
    }

    // Filtrar asientos por fecha, tipo y estado
    const filtered = projectIncidences.filter((inc) => {
      let matchesFecha = true;
      const fechaStr = inc.fechaHora ? inc.fechaHora.split(' ')[0] : '';
      if (fechaDesde && fechaStr) {
        const incDate = new Date(fechaStr);
        const fromDate = new Date(fechaDesde);
        if (incDate < fromDate) matchesFecha = false;
      }
      if (fechaHasta && fechaStr) {
        const incDate = new Date(fechaStr);
        const toDate = new Date(fechaHasta);
        toDate.setHours(23, 59, 59, 999);
        if (incDate > toDate) matchesFecha = false;
      }

      let matchesTipo = true;
      if (filterTipoIncidencia !== 'TODAS') {
        matchesTipo = inc.tipoIncidencia === filterTipoIncidencia;
      }

      let matchesEstado = true;
      const isRespuesta = Boolean(inc.esRespuestaDeId);
      const isAtendido = inc.estadoGestion === 'ATENDIDO' || isRespuesta;
      const requiereResp = inc.tipoIncidencia === 'CONSULTA_TECNICA' || inc.tipoIncidencia === 'RIESGO' || inc.tipoIncidencia === 'OBSERVACION';

      if (filterEstadoAsiento === 'CON_RESPUESTA') {
        matchesEstado = isAtendido;
      } else if (filterEstadoAsiento === 'SIN_RESPUESTA') {
        matchesEstado = !isAtendido && requiereResp;
      } else if (filterEstadoAsiento === 'SOLICITUD_EDICION') {
        matchesEstado = Boolean(inc.solicitudEdicionPendiente);
      }

      return matchesFecha && matchesTipo && matchesEstado;
    });

    // Ordenar por correlativo ascendente
    filtered.sort((a, b) => a.numeroCorrelativo - b.numeroCorrelativo);

    setGeneratedIncidences(filtered);
    setGeneratedAt(new Date().toLocaleString('es-PE', { dateStyle: 'full', timeStyle: 'medium' }));

    // Simular Hash SHA-256 de verificación de reporte
    const mockHash = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
    setReportHash(`SHA256:${mockHash}`);

    setIsReportGenerated(true);
  };

  // Imprimir Reporte Oficial (PDF)
  const handlePrintReport = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Exportar a Excel / CSV
  const handleExportCSV = () => {
    if (!selectedProject || generatedIncidences.length === 0) return;

    const headers = [
      'Correlativo',
      'Fecha',
      'Hora',
      'Tipo Incidencia',
      'Título Asiento',
      'Resumen Contenido',
      'Registrado Por',
      'Cargo',
      'Estado Gestión'
    ];

    const rows = generatedIncidences.map((inc) => {
      const parts = (inc.fechaHora || '').split(' ');
      const fecha = parts[0] || '';
      const hora = parts[1] || '08:00';

      return [
        `"Asiento N° ${inc.numeroCorrelativo.toString().padStart(4, '0')}"`,
        `"${fecha}"`,
        `"${hora}"`,
        `"${inc.tipoIncidencia}"`,
        `"${(inc.titulo || '').replace(/"/g, '""')}"`,
        `"${(inc.contenido || '').replace(/"/g, '""').substring(0, 150)}..."`,
        `"${inc.autorNombre}"`,
        `"${inc.autorCargo}"`,
        `"${inc.estadoGestion || 'REGISTRADO'}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Cuaderno_Digital_${selectedProject.cui}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Métricas del Reporte
  const totalAsientos = generatedIncidences.length;
  const totalConsultas = generatedIncidences.filter((i) => i.tipoIncidencia === 'CONSULTA_TECNICA').length;
  const totalRiesgos = generatedIncidences.filter((i) => i.tipoIncidencia === 'RIESGO').length;
  const totalAtendidos = generatedIncidences.filter((i) => i.estadoGestion === 'ATENDIDO' || Boolean(i.esRespuestaDeId)).length;

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col text-[#1A1C1C]">
      {/* CSS para Impresión Oficial A4 */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 8mm 10mm 10mm 10mm;
        }
        @media print {
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 10.5px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header, aside, nav, footer, .no-print {
            display: none !important;
          }
          .print-area {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .print-break-inside {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          table {
            page-break-inside: auto !important;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

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
                className="py-3 px-1 border-b-2 border-[#91000A] text-[#91000A] font-bold text-xs flex items-center space-x-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Reporte Consolidado (Por Proyecto)</span>
              </Link>
              <Link
                href="/reportes/por-asiento"
                className="py-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 font-medium text-xs flex items-center space-x-2 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Reporte por Asiento</span>
              </Link>
            </div>
          </div>

          {/* Main Container */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full flex-1">
            {/* PANEL DE CONFIGURACIÓN Y GENERACIÓN DE REPORTE */}
            <div className="bg-white rounded-xl border border-[#E2E2E2] shadow-sm overflow-hidden no-print">
              <div className="bg-[#91000A] text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-yellow-300" />
                  <h2 className="text-sm font-bold font-display uppercase tracking-wider">
                    Configurador de Reporte por Proyecto
                  </h2>
                </div>

              </div>

              <div className="p-6 space-y-6">
                {/* PASO 1: SELECCIÓN DE PROYECTO */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-[#5B403D] uppercase tracking-wider">
                    1. Seleccione el Proyecto de Inversión (CUI) <span className="text-[#BA1A1A]">*</span>
                  </label>

                  <div>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => {
                        setSelectedProjectId(e.target.value);
                        setIsReportGenerated(false);
                      }}
                      className="w-full px-4 py-3 bg-[#F9F9F9] border-2 border-[#91000A]/30 rounded-lg text-xs font-bold text-[#1A1C1C] focus:outline-none focus:ring-2 focus:ring-[#91000A] transition-all cursor-pointer shadow-sm"
                    >
                      {projects.map((p) => {
                        const fullText = `CUI ${p.cui} — ${p.nombre} (${p.provincia || 'Lambayeque'})`;
                        const labelText = fullText.length > 200 ? `${fullText.substring(0, 180)}...` : fullText;
                        return (
                          <option key={p.id} value={p.id} title={fullText}>
                            {labelText}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* PASO 2: FILTROS Y PARÁMETROS DEL REPORTE */}
                <div className="border-t border-gray-200 pt-5 space-y-3">
                  <label className="block text-xs font-bold text-[#5B403D] uppercase tracking-wider">
                    2. Parámetros de Filtrado e Intervalo de Asientos
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Fecha Desde */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Fecha Inicial</label>
                      <input
                        type="date"
                        value={fechaDesde}
                        onChange={(e) => setFechaDesde(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#91000A]"
                      />
                    </div>

                    {/* Fecha Hasta */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Fecha Final</label>
                      <input
                        type="date"
                        value={fechaHasta}
                        onChange={(e) => setFechaHasta(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#91000A]"
                      />
                    </div>

                    {/* Tipo de Incidencia */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Tipo de Incidencia</label>
                      <select
                        value={filterTipoIncidencia}
                        onChange={(e) => setFilterTipoIncidencia(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#91000A]"
                      >
                        <option value="TODAS">Todas las Incidencias</option>
                        <option value="CONSULTA_TECNICA">❓ Consulta Técnica</option>
                        <option value="OBSERVACION">⚠️ Observación de Obra</option>
                        <option value="RIESGO">🚨 Alerta de Riesgo</option>
                        <option value="INFORMATIVO">📋 Informativo / Apertura</option>
                      </select>
                    </div>

                    {/* Estado de Asiento */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Estado de Respuesta</label>
                      <select
                        value={filterEstadoAsiento}
                        onChange={(e) => setFilterEstadoAsiento(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#91000A]"
                      >
                        <option value="TODOS">Todos los Asientos</option>
                        <option value="CON_RESPUESTA">✅ Atendidos con Respuesta</option>
                        <option value="SIN_RESPUESTA">⏳ Pendientes de Respuesta</option>
                        <option value="SOLICITUD_EDICION">⚠️ Solicitudes de Edición</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* BOTÓN DE ACCIÓN: GENERAR REPORTE */}
                <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">


                  <button
                    type="button"
                    onClick={handleGenerateReport}
                    className="w-full sm:w-auto px-8 py-3 bg-[#91000A] hover:bg-[#720008] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-yellow-300" />
                    <span>🚀 GENERAR REPORTE OFICIAL DEL CUADERNO DIGITAL</span>
                  </button>
                </div>
              </div>
            </div>

            {/* VISTA PREVIA DEL REPORTE GENERADO (MEMBRETADA OFICIAL IMPRIMIBLE) */}
            {isReportGenerated && (
              <div className="space-y-6">
                {/* BARRA DE ACCIONES RÁPIDAS Y MÉTRICAS */}
                <div className="bg-white p-4 rounded-xl border border-[#E2E2E2] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                    <div>
                      <h3 className="text-xs font-extrabold text-[#1A1C1C] uppercase font-display">
                        Reporte Compilado Satisfactoriamente
                      </h3>
                      <p className="text-[10px] text-gray-500 font-mono">
                        Emisión: {generatedAt} | Hash: {reportHash.substring(0, 20)}...
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handlePrintReport}
                      className="flex-1 sm:flex-none px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                      title="Imprimir documento oficial o guardar en PDF"
                    >
                      <Printer className="w-4 h-4" />
                      <span>🖨️ Imprimir / PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="flex-1 sm:flex-none px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                      title="Exportar listado de asientos a formato CSV / Excel"
                    >
                      <Download className="w-4 h-4" />
                      <span>📊 Exportar Excel / CSV</span>
                    </button>
                  </div>
                </div>

                {/* TARJETAS RESUMEN DE MÉTRICAS DEL REPORTE */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
                  <div className="bg-white p-3.5 rounded-lg border border-gray-200 text-center shadow-sm">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Total Asientos</p>
                    <p className="text-xl font-black text-[#91000A] font-display">{totalAsientos}</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-lg border border-gray-200 text-center shadow-sm">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Consultas Técnicas</p>
                    <p className="text-xl font-black text-amber-700 font-display">{totalConsultas}</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-lg border border-gray-200 text-center shadow-sm">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Alertas de Riesgo</p>
                    <p className="text-xl font-black text-red-700 font-display">{totalRiesgos}</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-lg border border-gray-200 text-center shadow-sm">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Atendidos por Supervisión</p>
                    <p className="text-xl font-black text-emerald-700 font-display">{totalAtendidos}</p>
                  </div>
                </div>

                {/* DOCUMENTO OFICIAL MEMBRETADO (ÁREA DE IMPRESIÓN IMPRIMIBLE) */}
                <div className="print-area bg-white p-8 sm:p-12 rounded-xl border-2 border-gray-300 shadow-xl space-y-6 text-gray-900">
                  {/* HEADER MEMBRETADO OFICIAL GORE LAMBAYEQUE */}
                  <div className="border-b-2 border-[#91000A] pb-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Logo Oficial Gobierno Regional de Lambayeque */}
                      <img
                        src="/img/logo.png"
                        alt="Gobierno Regional de Lambayeque"
                        className="w-16 h-16 object-contain shrink-0"
                      />
                      <div>
                        <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#91000A] font-display">
                          GOBIERNO REGIONAL DE LAMBAYEQUE
                        </h2>

                        <p className="text-[10px] text-gray-500">
                          Registro Oficial de Asientos de Obra para Proyectos de Inversión Pública
                        </p>
                      </div>
                    </div>

                    <div className="text-right border-l border-gray-300 pl-4 space-y-0.5">
                      <span className="text-xs font-mono font-extrabold bg-[#91000A] text-white px-2 py-0.5 rounded inline-block">
                        CUI N° {selectedProject.cui}
                      </span>
                      <p className="text-[10px] font-bold text-gray-600">MODALIDAD LEY 29230</p>
                      <p className="text-[9px] text-gray-400 font-mono">D.S. N° 038-2026-EF</p>
                    </div>
                  </div>

                  {/* TÍTULO DEL REPORTE */}
                  <div className="text-center bg-[#F9F9F9] p-4 rounded-lg border border-gray-300 space-y-1">
                    <h1 className="text-base sm:text-lg font-black font-display text-[#91000A] uppercase tracking-wide">
                      REPORTE CONSOLIDADO DEL CUADERNO DIGITAL DE INCIDENCIAS
                    </h1>
                    <p className="text-xs font-bold text-gray-700">
                      PROYECTO: {selectedProject.nombre}
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      Filtro de Emisión: {fechaDesde || 'Inicio de Obra'} al {fechaHasta || 'Fecha Actual'} | Tipo: {filterTipoIncidencia}
                    </p>
                  </div>

                  {/* METADATOS TÉCNICOS DEL PROYECTO */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200 text-xs">
                    <div>
                      <span className="font-bold text-gray-500 block text-[10px] uppercase">Código CUI</span>
                      <span className="font-mono font-bold text-gray-900">{selectedProject.cui}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 block text-[10px] uppercase">Ubicación</span>
                      <span className="font-bold text-gray-900">{selectedProject.provincia || 'Lambayeque'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 block text-[10px] uppercase">Residente de Obra</span>
                      <span className="font-semibold text-gray-900">{selectedProject.residenteNombre || 'Ing. Juan Pérez Valdivia'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 block text-[10px] uppercase">Supervisor de Obra</span>
                      <span className="font-semibold text-gray-900">{selectedProject.supervisorNombre || 'Ing. María Torres Ugarte'}</span>
                    </div>
                  </div>

                  {/* TABLA DE ASIENTOS COMPILADOS */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-extrabold uppercase text-[#91000A] tracking-wider flex items-center justify-between">
                      <span>Listado Cronológico de Asientos Registrados ({generatedIncidences.length})</span>
                      <span className="text-[10px] font-mono text-gray-500">Formato Legal D.S. N° 038-2026-EF</span>
                    </h3>

                    {generatedIncidences.length > 0 ? (
                      <div className="overflow-x-auto border border-gray-300 rounded-lg">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#91000A] text-white uppercase text-[10px] font-bold tracking-wider">
                              <th className="py-2.5 px-3 border-r border-red-800">N° Asiento</th>
                              <th className="py-2.5 px-3 border-r border-red-800">Fecha / Hora</th>
                              <th className="py-2.5 px-3 border-r border-red-800">Tipo</th>
                              <th className="py-2.5 px-3 border-r border-red-800">Título y Sumilla del Asiento</th>
                              <th className="py-2.5 px-3 border-r border-red-800">Registrado Por</th>
                              <th className="py-2.5 px-3">Estado / Respuesta</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 font-sans">
                            {generatedIncidences.map((inc) => {
                              const [fechaStr, horaStr] = (inc.fechaHora || '').split(' ');
                              const fechaFmt = fechaStr || inc.fechaHora || '';
                              const horaFmt = horaStr || '08:00';

                              return (
                                <tr key={inc.id} className="hover:bg-gray-50 print-break-inside">
                                  <td className="py-2.5 px-3 font-mono font-bold text-gray-900 border-r border-gray-200">
                                    N° {inc.numeroCorrelativo.toString().padStart(4, '0')}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600 border-r border-gray-200">
                                    {fechaFmt} <br />
                                    <span className="text-gray-400">{horaFmt}</span>
                                  </td>
                                  <td className="py-2.5 px-3 border-r border-gray-200 font-bold text-[10px]">
                                    <span className={`px-2 py-0.5 rounded border inline-block ${inc.tipoIncidencia === 'CONSULTA_TECNICA'
                                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                                      : inc.tipoIncidencia === 'RIESGO'
                                        ? 'bg-red-50 text-red-900 border-red-300'
                                        : inc.tipoIncidencia === 'OBSERVACION'
                                          ? 'bg-blue-50 text-blue-900 border-blue-300'
                                          : 'bg-gray-100 text-gray-800 border-gray-300'
                                      }`}>
                                      {inc.tipoIncidencia}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 border-r border-gray-200 space-y-1 max-w-xs">
                                    <p className="font-bold text-gray-900 text-xs leading-snug uppercase">
                                      {inc.titulo}
                                    </p>
                                    <p className="text-[11px] text-gray-600 line-clamp-2">
                                      {inc.contenido}
                                    </p>
                                  </td>
                                  <td className="py-2.5 px-3 border-r border-gray-200 text-[11px]">
                                    <p className="font-bold text-gray-800">{inc.autorNombre}</p>
                                    <p className="text-[10px] text-gray-500">{inc.autorCargo}</p>
                                  </td>
                                  <td className="py-2.5 px-3 text-[10px] font-bold">
                                    {inc.estadoGestion === 'ATENDIDO' || Boolean(inc.esRespuestaDeId) ? (
                                      <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 block text-center">
                                        ✅ Atendido
                                      </span>
                                    ) : inc.tipoIncidencia === 'CONSULTA_TECNICA' || inc.tipoIncidencia === 'RIESGO' || inc.tipoIncidencia === 'OBSERVACION' ? (
                                      <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 block text-center">
                                        ⏳ Resp. Pendiente
                                      </span>
                                    ) : (
                                      <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-300 block text-center">
                                        📋 Registrado
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500">
                        No existen asientos que coincidan con los criterios de filtrado seleccionados.
                      </div>
                    )}
                  </div>

                  {/* BLOQUE DE FIRMAS DIGITALES Y CERTIFICACIÓN */}
                  <div className="border-t-2 border-gray-300 pt-8 mt-8 print-break-inside">
                    <h4 className="text-xs font-bold uppercase text-[#91000A] mb-6 text-center">
                      FIRMANTES Y AUTORIDADES DEL CUADERNO DIGITAL DE OBRA
                    </h4>

                    <div className="grid grid-cols-2 gap-12 text-center text-xs">
                      <div className="space-y-2">
                        <div className="h-16 flex items-end justify-center border-b border-gray-400 pb-1"></div>
                        <p className="font-bold text-gray-900">{selectedProject.residenteNombre || 'Ing. Juan Pérez Valdivia'}</p>
                        <p className="text-[10px] text-gray-600">CIP N° 245109 — Residente de Obra</p>
                        <p className="text-[9px] text-gray-400">Representante Técnico del Contratista</p>
                      </div>

                      <div className="space-y-2">
                        <div className="h-16 flex items-end justify-center border-b border-gray-400 pb-1"></div>
                        <p className="font-bold text-gray-900">{selectedProject.supervisorNombre || 'Ing. María Torres Ugarte'}</p>
                        <p className="text-[10px] text-gray-600">CIP N° 198273 — Supervisor de Obra</p>
                        <p className="text-[9px] text-gray-400">Supervisión Técnica GORE Lambayeque</p>
                      </div>
                    </div>
                  </div>

                  {/* DECLARACIÓN JURADA Y VERIFICACIÓN HASH */}
                  <div className="bg-red-50/50 p-4 rounded-lg border border-red-200 text-[10px] text-gray-700 space-y-1 print-break-inside">
                    <p className="font-bold text-[#91000A] uppercase">
                      AVISO LEGAL OBLIGATORIO Y DECLARACIÓN JURADA:
                    </p>
                    <p className="leading-relaxed">
                      Toda información y asiento consignado en el presente reporte impreso del Cuaderno Digital tiene carácter de Declaración Jurada con valor legal conforme al Decreto Supremo N° 038-2026-EF y la Ley N° 29230 (Obras por Impuestos). Queda prohibida toda alteración o modificación no autorizada.
                    </p>
                  </div>

                  {/* HASH SHA-256 Y PIE DE PÁGINA IMPRESO */}
                  <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-[9px] text-gray-500 font-mono">
                    <span>CÓDIGO DE TRAZABILIDAD REGISTRAL: {reportHash}</span>
                    <span>PÁGINA OFICIAL DE REPORTES — GORE LAMBAYEQUE</span>
                  </div>
                </div>
              </div>
            )}
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
