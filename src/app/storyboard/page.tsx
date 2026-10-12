'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Workflow,
  Plus,
  Search,
  Calendar,
  Filter,
  FileText,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Eye,
  Trash2,
  X,
  Upload,
  Image as ImageIcon,
  Paperclip,
  ShieldCheck,
  UserCheck,
  Settings,
  Users,
  Tags,
  LogOut,
  ChevronRight,
  FileCheck,
  Layers,
  Lock,
  Tag,
  Database
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import UserManagementModal from '@/components/UserManagementModal';
import IncidenceTypesModal from '@/components/IncidenceTypesModal';
import DatabaseBackupModal from '@/components/DatabaseBackupModal';
import AttachmentViewerModal, { AttachmentItem } from '@/components/AttachmentViewerModal';
import { INITIAL_PROJECTS, MockProject } from '@/lib/mockData';
import { StoryboardMilestone, StoryboardAttachment, INITIAL_STORYBOARD_MILESTONES } from '@/lib/mockStoryboardData';
import {
  saveAttachment,
  makeIdbUrl,
  isIdbUrl,
  getIdbId,
  getAttachment,
  downloadAttachment,
} from '@/lib/attachmentStorage';

export default function StoryboardPage() {
  const router = useRouter();

  // Estados de Datos de Proyectos e Hitos
  const [projects, setProjects] = useState<MockProject[]>(INITIAL_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('p-2419083');
  const [milestones, setMilestones] = useState<StoryboardMilestone[]>(INITIAL_STORYBOARD_MILESTONES);
  const [userRole, setUserRole] = useState('ADMINISTRADOR');

  // Estados de Filtros de Timeline
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState('TODAS');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Estados de Modales de Navegación y Configuración
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [isIncidenceTypesOpen, setIsIncidenceTypesOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Estado del Modal de Registro de Nuevo Hito
  const [isNewMilestoneModalOpen, setIsNewMilestoneModalOpen] = useState(false);
  const [newFecha, setNewFecha] = useState(new Date().toISOString().split('T')[0]);
  const [newHora, setNewHora] = useState('09:30');
  const [newArea, setNewArea] = useState<StoryboardMilestone['areaResponsable']>('Infraestructura');
  const [newEstado, setNewEstado] = useState<StoryboardMilestone['estadoTramite']>('Ejecución Física');
  const [newExpediente, setNewExpediente] = useState('');
  const [newComentario, setNewComentario] = useState('');
  const [newAttachments, setNewAttachments] = useState<StoryboardAttachment[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // Estado del Visor Oficial de Adjuntos (PDFs e Imágenes)
  const [viewerAttachment, setViewerAttachment] = useState<AttachmentItem | null>(null);
  const [viewerAllAttachments, setViewerAllAttachments] = useState<AttachmentItem[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

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
          console.error('Error cargando proyectos:', e);
        }
      }

      const savedMilestones = localStorage.getItem('app_storyboard_milestones');
      if (savedMilestones) {
        try {
          const parsed = JSON.parse(savedMilestones);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = parsed.map((m: StoryboardMilestone) => ({
              ...m,
              adjuntos: (m.adjuntos || []).map((att) => {
                let url = att.url;
                if (url.includes('dummy.pdf') || url.includes('w3.org')) {
                  url = '/doc_ejemplo.pdf';
                } else if (url.includes('unsplash.com')) {
                  url = '/images.jpg';
                }
                return { ...att, url };
              }),
            }));

            // Asegurar que si faltan los hitos de p-2419083, se agreguen automáticamente
            const has2419 = sanitized.some((m: StoryboardMilestone) => m.proyectoId === 'p-2419083');
            if (!has2419) {
              const default2419 = INITIAL_STORYBOARD_MILESTONES.filter((m) => m.proyectoId === 'p-2419083');
              const merged = [...default2419, ...sanitized];
              setMilestones(merged);
              localStorage.setItem('app_storyboard_milestones', JSON.stringify(merged));
            } else {
              setMilestones(sanitized);
              localStorage.setItem('app_storyboard_milestones', JSON.stringify(sanitized));
            }
          }
        } catch (e) {
          console.error('Error cargando hitos:', e);
        }
      }
    }
  }, []);

  const saveMilestonesToStorage = (updatedList: StoryboardMilestone[]) => {
    setMilestones(updatedList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_storyboard_milestones', JSON.stringify(updatedList));
    }
  };

  // Convertir adjunto de Storyboard al formato universal del Visor
  const convertToAttachmentItem = (att: StoryboardAttachment): AttachmentItem => {
    const isImg = att.tipo === 'IMAGEN' || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(att.nombre);
    return {
      id: att.id,
      nombreArchivo: att.nombre,
      urlArchivo: att.url,
      tipo: isImg ? 'image/jpeg' : 'application/pdf',
    };
  };

  // Abrir Visor Oficial (Lightbox para imágenes o Visor con toolbar para PDFs)
  const handleOpenViewer = (att: StoryboardAttachment, milestoneAttachments: StoryboardAttachment[] = []) => {
    const currentItem = convertToAttachmentItem(att);
    const allItems = milestoneAttachments.map(convertToAttachmentItem);
    setViewerAttachment(currentItem);
    setViewerAllAttachments(allItems);
    setIsViewerOpen(true);
  };

  // Descarga directa con nombre correcto
  const handleDownloadDirect = async (att: StoryboardAttachment) => {
    let url = att.url;
    if (isIdbUrl(url)) {
      const id = getIdbId(url);
      const dataUrl = await getAttachment(id);
      if (dataUrl) url = dataUrl;
    }
    downloadAttachment(url, att.nombre);
  };

  // Proyecto Seleccionado
  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0] || {
    id: 'p-2419083',
    cui: '2419083',
    nombre: 'CREACIÓN DEL SERVICIO DE TRANSITABILIDAD VIAL EN LA AV. CHINCHAYSUYO',
    provincia: 'Chiclayo',
    estado: 'EN_EJECUCION',
    asientosCount: 5
  };

  // Hitos filtrados del proyecto actual
  const projectMilestones = milestones
    .filter((m) => m.proyectoId === selectedProject.id)
    .filter((m) => {
      if (filterArea !== 'TODAS' && m.areaResponsable !== filterArea) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesExpediente = m.numeroExpediente.toLowerCase().includes(term);
        const matchesComment = m.comentario.toLowerCase().includes(term);
        const matchesArea = m.areaResponsable.toLowerCase().includes(term);
        const matchesEstado = m.estadoTramite.toLowerCase().includes(term);
        if (!matchesExpediente && !matchesComment && !matchesArea && !matchesEstado) return false;
      }
      if (fechaDesde && m.fechaHora.split(' ')[0] < fechaDesde) return false;
      if (fechaHasta && m.fechaHora.split(' ')[0] > fechaHasta) return false;
      return true;
    })
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));

  // Último número de expediente registrado
  const latestExpediente = projectMilestones.length > 0 ? projectMilestones[0].numeroExpediente : 'Sin Expediente';

  // Manejo de carga de archivos (guardado seguro en IndexedDB sin límite de 5MB)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setIsUploadingFiles(true);
      let loadedCount = 0;

      filesArray.forEach((file, idx) => {
        const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name);
        const ext = file.name.split('.').pop()?.toLowerCase() || (isImg ? 'jpg' : 'pdf');
        const attachmentId = `att-sb-${Date.now()}-${idx}`;
        const sizeInMB = file.size / (1024 * 1024);
        const tamano = sizeInMB >= 1 ? `${sizeInMB.toFixed(1)} MB` : `${(file.size / 1024).toFixed(1)} KB`;

        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = (ev.target?.result as string) || '';
          if (dataUrl) {
            await saveAttachment(attachmentId, dataUrl);
            setNewAttachments((prev) => [
              ...prev,
              {
                id: attachmentId,
                nombre: file.name,
                tipo: isImg ? 'IMAGEN' : 'DOCUMENTO',
                url: makeIdbUrl(attachmentId),
                tamano,
                extension: ext,
              },
            ]);
          }
          loadedCount++;
          if (loadedCount >= filesArray.length) {
            setIsUploadingFiles(false);
          }
        };
        reader.onerror = () => {
          loadedCount++;
          if (loadedCount >= filesArray.length) {
            setIsUploadingFiles(false);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    setNewAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  // Guardar Nuevo Hito
  const handleSaveMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpediente.trim()) {
      alert('Por favor ingrese el N.° de Expediente / Documento de Referencia.');
      return;
    }
    if (!newComentario.trim()) {
      alert('Por favor ingrese los comentarios u observaciones técnicas.');
      return;
    }

    const createdMilestone: StoryboardMilestone = {
      id: `sb-${Date.now()}`,
      proyectoId: selectedProject.id,
      fechaHora: `${newFecha} ${newHora}`,
      areaResponsable: newArea,
      estadoTramite: newEstado,
      numeroExpediente: newExpediente.trim().toUpperCase(),
      comentario: newComentario.trim(),
      adjuntos: [...newAttachments]
    };

    const updatedList = [createdMilestone, ...milestones];
    saveMilestonesToStorage(updatedList);

    // Reset Form
    setNewExpediente('');
    setNewComentario('');
    setNewAttachments([]);
    setIsNewMilestoneModalOpen(false);
  };

  // Obtener icono por Área
  const getAreaIcon = (area: StoryboardMilestone['areaResponsable']) => {
    switch (area) {
      case 'Supervisión DEAT':
        return <ShieldCheck className="w-5 h-5 text-red-700" />;
      case 'Infraestructura':
        return <Building2 className="w-5 h-5 text-blue-700" />;
      case 'Logística':
        return <Tag className="w-5 h-5 text-purple-700" />;
      case 'OPMI':
        return <CheckCircle2 className="w-5 h-5 text-emerald-700" />;
      case 'Formulación':
        return <FileText className="w-5 h-5 text-amber-700" />;
      case 'Tesorería':
        return <FileCheck className="w-5 h-5 text-teal-700" />;
      case 'Contraloría':
        return <Lock className="w-5 h-5 text-[#91000A]" />;
      default:
        return <Workflow className="w-5 h-5 text-gray-700" />;
    }
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
                  <Workflow className="w-4 h-4" />
                  <span>STORYBOARD / LÍNEA DE TIEMPO DE SEGUIMIENTO</span>
                </span>
                <h1 className="text-xl sm:text-2xl font-black font-display text-[#1A1C1C] mt-1">
                  Seguimiento Cronológico de Proyectos de Inversión
                </h1>

              </div>
            </div>
          </div>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">

            {/* SECCIÓN 1: SELECCIÓN DE PROYECTO Y FICHA RESUMEN */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E2E2] shadow-sm space-y-4">
              <label className="block text-xs font-bold text-[#5B403D] uppercase tracking-wider">
                1. Seleccione el Proyecto de Inversión (CUI)
              </label>

              <div>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F9F9F9] border-2 border-[#91000A]/30 rounded-xl text-xs font-bold text-[#1A1C1C] focus:outline-none focus:ring-2 focus:ring-[#91000A] transition-all cursor-pointer shadow-sm"
                >
                  {projects.map((p) => {
                    const fullText = `CUI ${p.cui} — ${p.nombre} (${p.provincia || 'Lambayeque'})`;
                    const labelText = fullText.length > 120 ? `${fullText.substring(0, 117)}...` : fullText;
                    return (
                      <option key={p.id} value={p.id} title={fullText}>
                        {labelText}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* FICHA RESUMEN DEL PROYECTO SELECCIONADO */}
              <div className="bg-[#F9F9F9] p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 bg-[#91000A] text-white text-[11px] font-mono font-bold rounded">
                      CUI N° {selectedProject.cui}
                    </span>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold rounded flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                      <span>ESTADO: {selectedProject.estado}</span>
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#1A1C1C] uppercase font-display leading-snug">
                    {selectedProject.nombre}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 font-medium">
                    <span>📍 Ubicación: <strong className="text-gray-900">{selectedProject.provincia || 'Chiclayo'}</strong></span>
                    <span>📑 Asientos Registrados: <strong className="text-gray-900">{selectedProject.asientosCount || 45}</strong></span>
                    <span>📂 Último Expediente: <strong className="font-mono text-[#91000A]">{latestExpediente}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewMilestoneModalOpen(true)}
                  className="w-full md:w-auto px-6 py-3 bg-[#91000A] hover:bg-[#720008] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4 text-yellow-300" />
                  <span>NUEVO HITO / ACTUALIZAR ESTADO</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN 2: FILTROS RÁPIDOS DE LA LÍNEA DE TIEMPO */}
            <div className="bg-white p-4 rounded-xl border border-[#E2E2E2] shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-[#5B403D] uppercase tracking-wider flex items-center space-x-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#91000A]" />
                  <span>Filtros Rápidos de la Línea de Tiempo ({projectMilestones.length} Hitos)</span>
                </span>
                {(searchTerm || filterArea !== 'TODAS' || fechaDesde || fechaHasta) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterArea('TODAS');
                      setFechaDesde('');
                      setFechaHasta('');
                    }}
                    className="text-[11px] font-bold text-[#91000A] hover:underline"
                  >
                    Restablecer Filtros
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Búsqueda por Expediente / Texto */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar N° Expediente o Texto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#F9F9F9] border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#91000A]"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                </div>

                {/* Filtro por Área Responsable */}
                <div>
                  <select
                    value={filterArea}
                    onChange={(e) => setFilterArea(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F9F9F9] border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#91000A]"
                  >
                    <option value="TODAS">Área: Todas las Oficinas</option>
                    <option value="Supervisión DEAT">🛡️ Supervisión DEAT</option>
                    <option value="Infraestructura">🏗️ Infraestructura</option>
                    <option value="Logística">🏷️ Logística</option>
                    <option value="OPMI">📊 OPMI</option>
                    <option value="Formulación">📝 Formulación</option>
                    <option value="Tesorería">💰 Tesorería</option>
                    <option value="Contraloría">🔐 Contraloría</option>
                  </select>
                </div>

                {/* Fecha Desde */}
                <div>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F9F9F9] border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#91000A]"
                    title="Fecha Inicial"
                  />
                </div>

                {/* Fecha Hasta */}
                <div>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F9F9F9] border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#91000A]"
                    title="Fecha Final"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: STORYBOARD / LÍNEA DE TIEMPO CRONOLÓGICA */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E2E2E2] shadow-sm space-y-6">
              {projectMilestones.length > 0 ? (
                <div className="relative border-l-2 border-[#91000A]/30 ml-4 sm:ml-6 pl-6 sm:pl-8 space-y-8">
                  {projectMilestones.map((m, idx) => (
                    <div key={m.id} className="relative group">
                      {/* Nodo Temático / Icono del Hito */}
                      <div className="absolute -left-[35px] sm:-left-[43px] top-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border-2 border-[#91000A] shadow-md flex items-center justify-center group-hover:scale-110 transition-all">
                        {getAreaIcon(m.areaResponsable)}
                      </div>

                      {/* Tarjeta del Hito ("StoryCard") */}
                      <div className="bg-[#F9F9F9] hover:bg-white p-5 rounded-xl border border-gray-200 hover:border-[#91000A]/40 shadow-sm hover:shadow-md transition-all space-y-3">
                        {/* Cabecera del Hito: Fecha + Áreas + Estado */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-1 bg-[#91000A] text-white text-[10px] font-mono font-bold rounded shadow-sm">
                              🗓️ {m.fechaHora}
                            </span>
                            <span className="px-2.5 py-1 bg-red-50 text-[#91000A] border border-red-200 text-[10px] font-bold rounded">
                              🏢 {m.areaResponsable}
                            </span>
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-bold rounded">
                              📌 ESTADO: {m.estadoTramite}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 bg-amber-50 px-3 py-1 rounded border border-amber-200 text-amber-900 font-mono text-xs font-extrabold w-fit">
                            <FileText className="w-3.5 h-3.5 text-amber-700" />
                            <span>N° EXP: {m.numeroExpediente}</span>
                          </div>
                        </div>

                        {/* Comentario u Observación Técnica */}
                        <p className="text-xs sm:text-sm text-gray-800 leading-relaxed font-sans font-medium">
                          {m.comentario}
                        </p>

                        {/* GALERÍA DE ADJUNTOS (FOTOS Y DOCUMENTOS) */}
                        {m.adjuntos && m.adjuntos.length > 0 && (
                          <div className="pt-2 border-t border-gray-200 space-y-2">
                            <p className="text-[11px] font-bold text-gray-500 uppercase flex items-center space-x-1">
                              <Paperclip className="w-3.5 h-3.5 text-[#91000A]" />
                              <span>Evidencias y Documentación Adjunta ({m.adjuntos.length})</span>
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                              {m.adjuntos.map((att) => {
                                const isImg = att.tipo === 'IMAGEN' || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(att.nombre);
                                return (
                                  <div
                                    key={att.id}
                                    className="bg-white p-2.5 rounded-lg border border-gray-200 hover:border-[#91000A] transition-all flex flex-col justify-between space-y-2 text-xs group/item shadow-sm hover:shadow-md"
                                  >
                                    {isImg ? (
                                      <div
                                        onClick={() => handleOpenViewer(att, m.adjuntos)}
                                        className="relative h-28 rounded-lg overflow-hidden bg-gray-100 cursor-pointer group-hover/item:opacity-95 transition-all shadow-inner"
                                      >
                                        <img
                                          src={att.url.startsWith('idb://') ? '/img/logo.png' : att.url}
                                          alt={att.nombre}
                                          className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 flex items-center justify-center text-white text-[11px] font-bold transition-opacity gap-1.5 backdrop-blur-[1px]">
                                          <Eye className="w-4 h-4 text-white" />
                                          <span>Ver Foto</span>
                                        </div>
                                        <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                          <ImageIcon className="w-3 h-3 text-emerald-400" />
                                          <span>FOTO</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div
                                        onClick={() => handleOpenViewer(att, m.adjuntos)}
                                        className="h-28 rounded-lg bg-gradient-to-b from-red-50 to-red-100/60 p-3 border border-red-200 flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer hover:bg-red-100 transition-colors group-hover/item:border-[#91000A] shadow-inner relative"
                                      >
                                        <div className="w-10 h-10 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-[#91000A] group-hover/item:scale-110 transition-transform shadow-xs">
                                          <FileText className="w-6 h-6 text-[#91000A]" />
                                        </div>
                                        <span className="text-[10px] font-black text-[#91000A] uppercase font-mono tracking-wider bg-white/90 px-2 py-0.5 rounded border border-red-200">
                                          {att.extension || 'PDF'}
                                        </span>
                                        <span className="text-[10px] font-bold text-[#91000A] flex items-center gap-1">
                                          <Eye className="w-3.5 h-3.5 text-[#91000A]" />
                                          <span>Ver PDF</span>
                                        </span>
                                      </div>
                                    )}

                                    <div className="space-y-0.5">
                                      <p className="text-[11px] font-bold text-gray-800 truncate" title={att.nombre}>
                                        {att.nombre}
                                      </p>
                                      <p className="text-[10px] text-gray-400 font-mono flex items-center justify-between">
                                        <span>{att.tamano}</span>
                                        <span className="text-[9px] uppercase font-bold text-gray-500">
                                          {isImg ? 'Imagen' : 'Documento'}
                                        </span>
                                      </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenViewer(att, m.adjuntos)}
                                        className="w-full py-1.5 bg-[#91000A] hover:bg-[#720008] text-white text-[10px] font-bold rounded transition-colors flex items-center justify-center space-x-1 cursor-pointer shadow-xs"
                                        title={isImg ? 'Ver Foto en Pantalla Completa' : 'Ver Documento PDF'}
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>{isImg ? 'Ver Foto' : 'Ver PDF'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadDirect(att)}
                                        className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold rounded transition-colors flex items-center justify-center space-x-1 cursor-pointer border border-gray-200"
                                        title="Descargar archivo original"
                                      >
                                        <Download className="w-3 h-3" />
                                        <span>Descargar</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center bg-[#F9F9F9] rounded-2xl border-2 border-dashed border-gray-300 space-y-3">
                  <Workflow className="w-12 h-12 text-gray-400 mx-auto" />
                  <h3 className="text-sm font-bold text-gray-700 uppercase font-display">
                    No se encontraron hitos en el Storyboard
                  </h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    No existen eventos registrados que coincidan con los criterios de filtrado seleccionados para este proyecto de inversión.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsNewMilestoneModalOpen(true)}
                    className="px-5 py-2.5 bg-[#91000A] hover:bg-[#720008] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow inline-flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-yellow-300" />
                    <span>Registrar Primer Hito</span>
                  </button>
                </div>
              )}
            </div>

          </main>
        </div>
      </div>

      {/* MODAL FORMULARIO: REGISTRAR NUEVO HITO / ACTUALIZAR ESTADO */}
      {isNewMilestoneModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center space-x-2">
                <Workflow className="w-5 h-5 text-[#91000A]" />
                <h3 className="text-sm font-extrabold text-[#1A1C1C] uppercase font-display">
                  Registrar Nuevo Hito / Actualizar Estado del Proyecto
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewMilestoneModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMilestone} className="space-y-4 text-xs">
              {/* CUI y Nombre del Proyecto */}
              <div className="bg-red-50 p-3 rounded-lg border border-red-200 space-y-0.5">
                <span className="text-[10px] font-bold text-[#91000A] uppercase font-mono">
                  Proyecto: CUI {selectedProject.cui}
                </span>
                <p className="font-bold text-gray-900 text-xs truncate">{selectedProject.nombre}</p>
              </div>

              {/* Fila 1: Fecha, Hora y Área Responsable */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Fecha del Evento *</label>
                  <input
                    type="date"
                    required
                    value={newFecha}
                    onChange={(e) => setNewFecha(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-[#91000A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Hora *</label>
                  <input
                    type="text"
                    required
                    value={newHora}
                    onChange={(e) => setNewHora(e.target.value)}
                    placeholder="HH:MM"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-[#91000A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Área / Oficina Responsable *</label>
                  <select
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value as StoryboardMilestone['areaResponsable'])}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-semibold focus:ring-2 focus:ring-[#91000A]"
                  >
                    <option value="Formulación">📝 Formulación</option>
                    <option value="OPMI">📊 OPMI</option>
                    <option value="Logística">🏷️ Logística</option>
                    <option value="Infraestructura">🏗️ Infraestructura</option>
                    <option value="Tesorería">💰 Tesorería</option>
                    <option value="Supervisión DEAT">🛡️ Supervisión DEAT</option>
                    <option value="Contraloría">🔐 Contraloría</option>
                  </select>
                </div>
              </div>

              {/* Fila 2: Estado del Trámite y N° de Expediente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Estado del Trámite *</label>
                  <select
                    value={newEstado}
                    onChange={(e) => setNewEstado(e.target.value as StoryboardMilestone['estadoTramite'])}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-bold text-[#91000A] focus:ring-2 focus:ring-[#91000A]"
                  >
                    <option value="En Formulación">En Formulación</option>
                    <option value="Elaboración de Bases">Elaboración de Bases</option>
                    <option value="Actos Preparatorios">Actos Preparatorios</option>
                    <option value="En Licitación">En Licitación</option>
                    <option value="Ejecución Física">Ejecución Física</option>
                    <option value="Liquidación">Liquidación</option>
                    <option value="Cierre Concluido">Cierre Concluido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">N.° Expediente / Doc. Referencia *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. EXP-2026-8942-GORE, OFICIO N° 045"
                    value={newExpediente}
                    onChange={(e) => setNewExpediente(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-[#91000A]"
                  />
                </div>
              </div>

              {/* Fila 3: Comentarios / Observaciones Técnicas */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Comentarios / Sustento Técnico *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describa los avances, aprobaciones técnicas, acuerdos tomados o hallazgos..."
                  value={newComentario}
                  onChange={(e) => setNewComentario(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#91000A]"
                ></textarea>
              </div>

              {/* Fila 4: Zona de Carga de Archivos (Drag & Drop) */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-gray-700">Adjuntar Evidencias (Fotos / PDFs / Hojas de Cálculo)</label>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                  }}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${isDraggingFile
                    ? 'border-[#91000A] bg-red-50'
                    : 'border-gray-300 hover:border-[#91000A] bg-[#F9F9F9]'
                    }`}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="storyboard-file-input"
                  />
                  <label htmlFor="storyboard-file-input" className="cursor-pointer space-y-1 block">
                    <Upload className="w-6 h-6 text-[#91000A] mx-auto" />
                    <p className="text-xs font-bold text-gray-700">
                      Arrastre aquí sus archivos o <span className="text-[#91000A] underline">examine su equipo</span>
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      Formatos permitidos: JPG, PNG, PDF, DOCX, XLSX (Soporta múltiples archivos y persistencia en alta fidelidad)
                    </p>
                  </label>
                </div>

                {/* Lista interactiva de archivos adjuntos antes de guardar */}
                {newAttachments.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Archivos Listos para Registrar ({newAttachments.length}):</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {newAttachments.map((att) => (
                        <div
                          key={att.id}
                          className="bg-gray-50 p-2 rounded border border-gray-200 flex items-center justify-between text-[11px]"
                        >
                          <div className="flex items-center space-x-2 truncate">
                            {att.tipo === 'IMAGEN' ? (
                              <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                            <span className="truncate font-semibold text-gray-800">{att.nombre}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.id)}
                            className="text-red-600 hover:text-red-800 p-1 shrink-0 cursor-pointer"
                            title="Eliminar adjunto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pie del Modal */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsNewMilestoneModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploadingFiles}
                  className="px-6 py-2 bg-[#91000A] hover:bg-[#720008] disabled:opacity-50 text-white font-extrabold rounded-lg shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  {isUploadingFiles ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Cargando archivos...</span>
                    </>
                  ) : (
                    <span>Guardar y Publicar Hito</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visor Oficial de Adjuntos (PDFs en Alta Definición con Toolbar e Imágenes con Lightbox) */}
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

      {/* Modal de Copias de Seguridad (Backups DB) */}
      <DatabaseBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
}
