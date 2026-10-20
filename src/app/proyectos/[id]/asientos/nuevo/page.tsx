'use client';

import React, { useState, useEffect, use, useRef } from 'react';
import useRouter from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  UploadCloud, 
  HelpCircle, 
  Save, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  FileText,
  AlertTriangle,
  FileWarning
} from 'lucide-react';
import { INITIAL_PROJECTS, MockProject } from '@/lib/mockData';
import { useIncidences, saveIncidence, uploadAttachments } from '@/lib/useIncidences';
import Sidebar from '@/components/Sidebar';
import { getStoredIncidenceTypes } from '@/components/IncidenceTypesModal';
import { validateUpload, getExtension, MAX_ATTACHMENT_BYTES, ALLOWED_EXTENSIONS } from '@/lib/attachmentRules';

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

export default function NuevoAsientoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<MockProject>(EMPTY_PROJECT);

  // Asientos existentes del proyecto, leídos de la base de datos (para correlativo y respuestas)
  const { incidences: allIncidences } = useIncidences(project.id || id);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Obtener lista de proyectos desde localStorage o INITIAL_PROJECTS
      const savedProjects = localStorage.getItem('app_projects_list');
      let baseProjects = INITIAL_PROJECTS;
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed) && parsed.length > 0) {
            baseProjects = parsed;
          }
        } catch (e) {
          console.error('Error al parsear proyectos en nuevo asiento:', e);
        }
      }

      // 2. Mostrar el proyecto de la URL (por id o CUI) mientras se confirma con el servidor
      const cachedProject = baseProjects.find((p) => p.id === id || p.cui === id);
      if (cachedProject) setProject(cachedProject);

      // El proyecto debe existir en el servidor y ser accesible para el usuario
      fetch('/api/projects', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.projects)) {
            const p = data.projects.find((x: MockProject) => x.id === id || x.cui === id);
            if (p) {
              setProject(p);
              localStorage.setItem('last_selected_project_id', p.id);
            } else {
              setProject(EMPTY_PROJECT);
            }
          }
        })
        .catch(() => {});

      // Preseleccionar asiento a responder si viene con el parámetro responderId
      const urlParams = new URLSearchParams(window.location.search);
      const responderId = urlParams.get('responderId');
      if (responderId) {
        setEsRespuesta(true);
        setAsientoRespondidoId(responderId);
      }
    }
  }, [id]);

  // Siguiente número correlativo autogenerado basado en el número máximo existente
  const maxCorrelativo = allIncidences.reduce((max, inc) => {
    const num = Number(inc.numeroCorrelativo) || 0;
    return num > max ? num : max;
  }, 0);

  const siguienteCorrelativo = maxCorrelativo > 0 ? maxCorrelativo + 1 : 1;

  // Form State
  const [incidenceTypesList, setIncidenceTypesList] = useState(() => getStoredIncidenceTypes());
  const [tipoIncidencia, setTipoIncidencia] = useState('CONSULTA_TECNICA');
  const [esRespuesta, setEsRespuesta] = useState(false);
  const [asientoRespondidoId, setAsientoRespondidoId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  // Archivos elegidos: se suben al servidor al registrar el asiento (no se guardan en el navegador)
  const [adjuntos, setAdjuntos] = useState<{ id: string; name: string; size: string; type: string; file: File }[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const maxChars = 4000;
  const selectedParentInc = allIncidences.find(
    (inc) => inc.id === asientoRespondidoId || inc.numeroCorrelativo.toString() === asientoRespondidoId
  );

  const displayNumeroCorrelativo = esRespuesta && selectedParentInc
    ? `${selectedParentInc.numeroCorrelativo.toString().padStart(4, '0')}-R`
    : `${siguienteCorrelativo.toString().padStart(4, '0')}`;

  const handleTituloChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitulo(e.target.value.toUpperCase());
  };

  const handleFileProcess = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    const rejectedFiles: string[] = [];

    const accepted: { id: string; name: string; size: string; type: string; file: File }[] = [];
    filesArray.forEach((file) => {
      const problem = validateUpload(file.name, file.size);
      if (problem) {
        rejectedFiles.push(problem);
        return;
      }
      const sizeInMB = file.size / (1024 * 1024);
      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        size: sizeInMB >= 1 ? `${sizeInMB.toFixed(2)} MB` : `${(file.size / 1024).toFixed(1)} KB`,
        type: getExtension(file.name).toUpperCase() || 'DOCUMENTO',
        file,
      });
    });
    // Evitar duplicados si se elige el mismo archivo dos veces
    setAdjuntos((prev) => [...prev, ...accepted.filter((a) => !prev.some((p) => p.id === a.id))]);

    if (rejectedFiles.length > 0) {
      setFileError(`⚠️ ARCHIVO NO PERMITIDO: ${rejectedFiles.join(' ')}`);
    } else {
      setFileError(null);
    }
  };

  const handleSubmitAsiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !contenido) {
      alert('Por favor ingrese el título y contenido del asiento.');
      return;
    }

    setLoading(true);

    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const targetProjectId = project.id;
    if (!targetProjectId) {
      alert('❌ No se encontró el proyecto en la base de datos o no tiene acceso a él. No se puede registrar el asiento.');
      setLoading(false);
      return;
    }

    const storedRole = (typeof window !== 'undefined' ? localStorage.getItem('user_role') : null) || 'Supervisor de Obra';
    const storedName = (typeof window !== 'undefined' ? localStorage.getItem('user_name') : null) || 'Ing. Responsable de Obra';
    const storedCip = (typeof window !== 'undefined' ? localStorage.getItem('user_cip') : null) || 'CIP-701234';

    // Construcción de la nueva incidencia registrada con persistencia directa en PostgreSQL
    // Sin id ni correlativo: el servidor los asigna al guardar en la base de datos
    const newIncidence = {
      proyectoId: targetProjectId,
      tipoIncidencia: tipoIncidencia,
      titulo: titulo,
      contenido: contenido,
      fechaHora: formattedDate,
      autorNombre: storedName,
      autorCargo: storedRole,
      autorCIP: storedCip,
      esRespuestaDeId: esRespuesta && asientoRespondidoId ? asientoRespondidoId : null,
      estadoGestion: esRespuesta ? 'Atendido / Respuesta Registrada' : 'Asiento Informativo (Sin acción requerida)',
      plazoDiasRespuesta: tipoIncidencia === 'CONSULTA_TECNICA' ? 10 : undefined,
    };

    try {
      // Guardado directo en PostgreSQL: si falla, no se registra nada
      const savedIncidence = await saveIncidence(newIncidence);
      const finalCorrelativo = savedIncidence.numeroCorrelativo;
      const finalDisplayCorrelativo = String(finalCorrelativo).padStart(4, '0');

      // Subir los adjuntos al servidor; si fallan, el asiento ya quedó registrado y se avisa
      let attachmentWarning = '';
      if (adjuntos.length > 0) {
        try {
          await uploadAttachments(savedIncidence.id, adjuntos.map((a) => a.file));
        } catch (uploadErr) {
          attachmentWarning = `

⚠️ El asiento se registró, pero los adjuntos NO se guardaron: ${
            uploadErr instanceof Error ? uploadErr.message : 'error de conexión'
          }. Puede volver a adjuntarlos editando el asiento.`;
        }
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('last_selected_project_id', targetProjectId);

        // Notificación automática
        const notificationItem = {
          id: `notif-${Date.now()}`,
          proyectoId: targetProjectId,
          cuiProyecto: project.cui,
          nombreProyecto: project.nombre,
          asientoId: savedIncidence.id,
          numeroCorrelativo: finalDisplayCorrelativo,
          tipoIncidencia: tipoIncidencia,
          tituloAsiento: titulo,
          autorNombre: storedName,
          autorCargo: storedRole,
          fechaHora: formattedDate,
          destinatariosRoles: ['SUPERVISOR', 'SUPERVISOR_DE_OBRA', 'ADMINISTRADOR', 'ADMIN', 'JEFE_DE_PROYECTO'],
          leido: false,
          esRespuesta: esRespuesta,
          mensaje: esRespuesta 
            ? `💬 Se registró el Asiento Respuesta N° ${finalDisplayCorrelativo} por ${storedRole} en la obra CUI ${project.cui}`
            : `🔔 Se generó el nuevo Asiento N° ${finalDisplayCorrelativo} (${tipoIncidencia.replace('_', ' ')}) por ${storedRole} en la obra CUI ${project.cui}`,
        };

        const notifKey = 'app_notifications_list';
        const savedNotifsStr = localStorage.getItem(notifKey);
        const notifsList = savedNotifsStr ? JSON.parse(savedNotifsStr) : [];
        try {
          localStorage.setItem(notifKey, JSON.stringify([notificationItem, ...notifsList.slice(0, 49)]));
        } catch (e) {}
      }

      alert(`✅ Asiento N° ${finalDisplayCorrelativo} registrado y guardado exitosamente en la BASE DE DATOS.${attachmentWarning}`);
      window.location.href = `/proyectos/${targetProjectId}`;
    } catch (err: any) {
      console.error('Error al registrar asiento en base de datos:', err);
      alert(`⚠️ ERROR AL GUARDAR EN LA BASE DE DATOS: ${err?.message || 'Error de conexión con el servidor'}. Por favor, intente nuevamente.`);
      setLoading(false);
      return;
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col text-[#1A1C1C]">
      {/* Layout Flex con Sidebar Desplegable Persistente */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Topbar del Proyecto */}
          <header className="bg-white border-b border-[#E2E2E2] py-3 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href={`/proyectos/${project.id}`} className="p-1.5 rounded-full hover:bg-gray-100 text-[#5B403D]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="font-mono font-bold text-xs text-[#91000A]">CUI {project.cui}</span>
            <h1 className="text-sm font-bold font-display text-[#1A1C1C]">Cuaderno de Incidencias Digital</h1>
          </div>
        </div>

        <div className="text-xs text-right hidden sm:block">
          <p className="font-bold text-[#91000A]">GORE LAMBAYEQUE</p>
          <p className="text-[10px] text-gray-500">Ley N° 29230 — Obras por Impuestos</p>
        </div>
      </header>

      {/* Main Grid: Formulario + Guía Lateral */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Columna Izquierda: Formulario (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header del Formulario */}
            <div className="bg-[#91000A] text-white p-5 rounded-lg shadow-md flex items-center justify-between">
              <div>
                <span className="text-xs text-red-100 font-semibold uppercase tracking-wider">Registro de Asiento Digital</span>
                <h2 className="text-xl font-bold font-display mt-0.5">
                  Nuevo Asiento - Correlativo N° {displayNumeroCorrelativo}
                </h2>
              </div>
              <div className="bg-white/10 px-3 py-1.5 rounded border border-white/20 text-xs font-mono font-bold text-red-100">
                AUTOGENERADO
              </div>
            </div>

            {/* Form Card */}
            <form onSubmit={handleSubmitAsiento} className="bg-white p-6 rounded-lg border border-[#E2E2E2] shadow-sm space-y-5">
              
              {/* Tipo de Incidencia */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5B403D] mb-1.5">
                  Tipo de Incidencia <span className="text-[#BA1A1A]">*</span>
                </label>
                <select
                  value={tipoIncidencia}
                  onChange={(e) => setTipoIncidencia(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F9F9F9] border border-[#8F706C]/40 rounded text-xs text-[#1A1C1C] font-semibold focus:ring-2 focus:ring-[#91000A]"
                >
                  {incidenceTypesList.filter((t) => t.activo).map((t) => (
                    <option key={t.id} value={t.codigo}>
                      {t.nombre} ({t.codigo}) {t.requiereRespuesta ? `— Requiere Respuesta (${t.plazoRespuestaDias}d)` : '— Informativo'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Checkbox "Es respuesta a un asiento anterior" */}
              <div className="bg-red-50/50 p-3 rounded border border-red-100 space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-[#1A1C1C]">
                  <input
                    type="checkbox"
                    checked={esRespuesta}
                    onChange={(e) => setEsRespuesta(e.target.checked)}
                    className="w-4 h-4 text-[#91000A] focus:ring-[#91000A] rounded border-gray-300"
                  />
                  <span>Es respuesta o atención a un asiento registrado previamente</span>
                </label>

                {/* Desplegable de asientos anteriores si checkbox está marcado */}
                {esRespuesta && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-[#5B403D] mb-1">
                      Seleccione el Asiento al que responde:
                    </label>
                    <select
                      value={asientoRespondidoId}
                      onChange={(e) => setAsientoRespondidoId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded text-xs text-[#1A1C1C]"
                    >
                      <option value="">-- Seleccionar Asiento Pendiente --</option>
                      {allIncidences.map((inc) => (
                        <option key={inc.id} value={inc.id}>
                          Asiento N° {inc.numeroCorrelativo.toString().padStart(4, '0')} — {inc.titulo} ({inc.autorCargo})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Título del Asiento */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5B403D]">
                    Título del Asiento <span className="text-[#BA1A1A]">*</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">SE CONVIERTE A MAYÚSCULAS</span>
                </div>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={handleTituloChange}
                  placeholder="EJEMPLO: CONSULTA SOBRE CAMBIO DE ESPECIFICACIÓN TÉCNICA DE CEMENTO EN BLOQUE C"
                  className="w-full px-3 py-2.5 bg-[#F9F9F9] border border-[#8F706C]/40 rounded text-xs text-[#1A1C1C] font-semibold tracking-wide uppercase focus:ring-2 focus:ring-[#91000A]"
                />
              </div>

              {/* Editor de Texto Enriquecido (RTE Simulado) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5B403D]">
                    Contenido del Asiento (Texto Enriquecido) <span className="text-[#BA1A1A]">*</span>
                  </label>
                  <span className={`text-[11px] font-mono ${contenido.length > maxChars ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                    {contenido.length} / {maxChars} caracteres
                  </span>
                </div>

                {/* Toolbar RTE */}
                <div className="border border-[#8F706C]/40 rounded-t bg-gray-100 p-1.5 flex items-center space-x-1 border-b-0">
                  <button type="button" className="p-1 hover:bg-gray-200 rounded text-gray-700" title="Negrita">
                    <Bold className="w-4 h-4" />
                  </button>
                  <button type="button" className="p-1 hover:bg-gray-200 rounded text-gray-700" title="Cursiva">
                    <Italic className="w-4 h-4" />
                  </button>
                  <div className="h-4 w-px bg-gray-300 mx-1"></div>
                  <button type="button" className="p-1 hover:bg-gray-200 rounded text-gray-700" title="Lista con viñetas">
                    <List className="w-4 h-4" />
                  </button>
                  <button type="button" className="p-1 hover:bg-gray-200 rounded text-gray-700" title="Lista numerada">
                    <ListOrdered className="w-4 h-4" />
                  </button>
                </div>

                {/* Textarea */}
                <textarea
                  required
                  rows={8}
                  maxLength={maxChars}
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                  placeholder="Detalle de forma objetiva, precisa y fundamentada los hechos técnicos u observaciones registradas..."
                  className="w-full p-3 bg-[#F9F9F9] border border-[#8F706C]/40 rounded-b text-xs text-[#1A1C1C] focus:ring-2 focus:ring-[#91000A] focus:outline-none leading-relaxed"
                />
              </div>

              {/* Sección de Archivos Adjuntos con Validación de Seguridad */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5B403D]">
                    Archivos Adjuntos / Evidencia Fotográfica / Planos
                  </label>
                  <span className="text-[10px] text-gray-500 font-sans">
                    Permitidos: PDF, imágenes, Office, DWG/DXF, KML/KMZ, ZIP/RAR · máx. {MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB por archivo
                  </span>
                </div>

                {/* Input File Oculto */}
                <input
                  type="file"
                  multiple
                  accept={Object.keys(ALLOWED_EXTENSIONS).map((ext) => `.${ext}`).join(',')}
                  ref={fileInputRef}
                  onChange={(e) => {
                    handleFileProcess(e.target.files);
                    e.target.value = ''; // permitir volver a elegir el mismo archivo
                  }}
                  className="hidden"
                />

                {/* Zona Dropzone Drag & Drop */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFileProcess(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#91000A] bg-red-50'
                      : 'border-[#8F706C]/40 bg-[#F9F9F9] hover:bg-gray-50'
                  }`}
                >
                  <UploadCloud className="w-8 h-8 text-[#91000A] mx-auto mb-1" />
                  <div className="text-xs font-bold text-[#1A1C1C]">
                    Arrastre sus documentos, planos o fotos aquí
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    O haga clic para examinar archivos en su equipo
                  </p>

                  <div className="mt-2 inline-block px-3 py-1 bg-[#91000A]/10 text-[#91000A] rounded text-xs font-bold hover:bg-[#91000A]/20 transition-all">
                    + Seleccionar Archivos Adjuntos
                  </div>
                </div>

                {/* Mensaje de Alerta de Seguridad por Archivo Prohibido */}
                {fileError && (
                  <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded text-xs text-[#93000A] font-medium flex items-start space-x-2 animate-in fade-in">
                    <FileWarning className="w-5 h-5 text-[#91000A] shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span>{fileError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFileError(null)}
                      className="text-red-700 hover:text-red-900 font-bold ml-2"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Nota Informativa sobre Archivos Prohibidos */}
                <p className="text-[11px] text-[#5B403D] mt-2 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-700 shrink-0" />
                  <span>
                    <strong>Filtro de Seguridad Activo:</strong> Se restringe automáticamente cualquier script, ejecutable o archivo de sistema (.js, .cmd, .bat, .exe, .sh, .ps1, .vbs).
                  </span>
                </p>

                {/* Lista de adjuntos agregados */}
                {adjuntos.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[11px] font-bold text-gray-700">Archivos listos para firmar ({adjuntos.length}):</p>
                    {adjuntos.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded text-xs shadow-sm hover:border-gray-300 transition-colors">
                        <div className="flex items-center space-x-2 overflow-hidden">
                          <FileText className="w-4 h-4 text-[#91000A] shrink-0" />
                          <span className="font-semibold text-gray-800 truncate">{att.name}</span>
                          <span className="text-[10px] text-gray-500 font-mono">({att.size})</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-600 uppercase border">
                            {att.type}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAdjuntos(adjuntos.filter(a => a.id !== att.id))}
                          className="text-red-600 hover:text-red-800 font-bold ml-2 px-1 text-xs"
                          title="Quitar archivo"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones de Acción */}
              <div className="pt-4 border-t border-[#E2E2E2] flex items-center justify-between">
                <Link
                  href={`/proyectos/${project.id}`}
                  className="px-4 py-2 border border-[#8F706C] text-[#5B403D] rounded text-xs font-semibold hover:bg-gray-100"
                >
                  Cancelar
                </Link>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => alert('Asiento guardado como borrador local.')}
                    className="px-4 py-2 border border-[#91000A] text-[#91000A] rounded text-xs font-bold hover:bg-red-50 flex items-center space-x-1"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Borrador</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-[#91000A] hover:bg-[#B71C1C] text-white rounded text-xs font-bold shadow-md flex items-center space-x-1.5"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Registrar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Columna Derecha: Guía de Registro (1 Col) */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-lg border border-[#E2E2E2] shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-[#91000A] border-b pb-2">
                <HelpCircle className="w-5 h-5" />
                <h3 className="font-bold font-display text-sm">Guía de Registro de Asientos</h3>
              </div>

              <div className="space-y-3 text-xs text-[#5B403D] leading-relaxed">
                <div className="bg-red-50 p-3 rounded border border-red-200 space-y-1">
                  <strong className="text-[#91000A] font-bold block">1. Carácter de Declaración Jurada</strong>
                  <p>
                    Todo asiento firmado digitalmente es inalterable y posee valor de declaración jurada conforme al D.S. N° 038-2026-EF.
                  </p>
                </div>

                <div className="space-y-1">
                  <strong className="text-[#1A1C1C] font-bold block">2. Numeración Correlativa Automática</strong>
                  <p>
                    El correlativo N° {siguienteCorrelativo.toString().padStart(4, '0')} se asigna automáticamente al momento del firmado digital.
                  </p>
                </div>

                <div className="space-y-1">
                  <strong className="text-[#1A1C1C] font-bold block">3. Plazos para Respuestas de Supervisión</strong>
                  <p>
                    Las **Consultas Técnicas** disponen de un plazo máximo de 5 días hábiles para pronunciamiento de la Supervisión.
                  </p>
                </div>

                <div className="space-y-1">
                  <strong className="text-[#1A1C1C] font-bold block">4. Incidencias de Riesgo (Ley 29230)</strong>
                  <p>
                    Al clasificar como RIESGO, se enviará una notificación automática a la Dirección Ejecutiva de Alianzas Técnicas (DEAT).
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t text-[11px] text-[#8F706C] flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-green-700 shrink-0" />
                <span>Soporte Técnico DEAT: (074) 606000 ext. 140</span>
              </div>
            </div>
          </div>

        </div>
      </main>
        </div>
      </div>
    </div>
  );
}
