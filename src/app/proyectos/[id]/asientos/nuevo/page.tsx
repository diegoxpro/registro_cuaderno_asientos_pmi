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
import { INITIAL_PROJECTS, INITIAL_INCIDENCES, MockIncidenceEntry, MockProject } from '@/lib/mockData';
import Sidebar from '@/components/Sidebar';
import { getStoredIncidenceTypes } from '@/components/IncidenceTypesModal';
import { saveAttachment, makeIdbUrl } from '@/lib/attachmentStorage';

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

// Extensiones prohibidas de scripts, ejecutable y sistema
const RESTRICTED_EXTENSIONS = [
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'cmd', 'bat', 'sh', 'bash', 'ps1', 'psm1', 'vbs', 'vbe', 'wsf', 'wsh',
  'exe', 'msi', 'com', 'scr', 'cpl', 'gadget', 'jar', 'py', 'php', 'rb',
  'dll', 'sys', 'drv', 'reg', 'htc', 'pif', 'application'
];

export default function NuevoAsientoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<MockProject>(EMPTY_PROJECT);

  // Estado con la lista completa de incidencias (locales + estáticas)
  const [allIncidences, setAllIncidences] = useState<MockIncidenceEntry[]>([]);

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

      // 2. Buscar el proyecto por id o cui, o último seleccionado, o el primer proyecto disponible
      const lastSelectedId = localStorage.getItem('last_selected_project_id');
      const foundProject =
        baseProjects.find((p) => p.id === id || p.cui === id) ||
        (lastSelectedId ? baseProjects.find((p) => p.id === lastSelectedId || p.cui === lastSelectedId) : undefined) ||
        baseProjects[0] ||
        EMPTY_PROJECT;

      setProject(foundProject);

      const activeProjId = foundProject.id || id;
      if (activeProjId) {
        localStorage.setItem('last_selected_project_id', activeProjId);
      }

      // 3. Cargar incidencias existentes y recuperar huérfanas
      const storageKey = `custom_incidences_${activeProjId}`;
      let savedList: MockIncidenceEntry[] = [];
      const savedStr = localStorage.getItem(storageKey);
      if (savedStr) {
        try {
          const parsed = JSON.parse(savedStr);
          if (Array.isArray(parsed)) savedList = parsed;
        } catch (e) {
          console.error(e);
        }
      }

      // Rescatar asientos huérfanos que hayan podido guardarse bajo custom_incidences_ o custom_incidences_undefined
      const orphanStr = localStorage.getItem('custom_incidences_') || localStorage.getItem('custom_incidences_undefined');
      if (orphanStr && activeProjId) {
        try {
          const orphans = JSON.parse(orphanStr);
          if (Array.isArray(orphans) && orphans.length > 0) {
            const seenIds = new Set(savedList.map((x) => x.id));
            const toAdd = orphans.filter((x) => !seenIds.has(x.id));
            if (toAdd.length > 0) {
              savedList = [...toAdd, ...savedList];
              localStorage.setItem(storageKey, JSON.stringify(savedList));
            }
            localStorage.removeItem('custom_incidences_');
            localStorage.removeItem('custom_incidences_undefined');
          }
        } catch (e) {}
      }

      const initialList = INITIAL_INCIDENCES[activeProjId] || INITIAL_INCIDENCES['p-2704014'] || [];
      setAllIncidences([...savedList, ...initialList]);

      // Consultar lista actualizada de asientos del servidor para correlativos precisos
      fetch(`/api/incidences?projectId=${activeProjId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.incidences) && data.incidences.length > 0) {
            setAllIncidences(data.incidences);
            localStorage.setItem(storageKey, JSON.stringify(data.incidences));
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
  const [adjuntos, setAdjuntos] = useState<{ id: string; name: string; size: string; type: string }[]>([]);
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

    filesArray.forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      
      if (RESTRICTED_EXTENSIONS.includes(ext)) {
        rejectedFiles.push(file.name);
      } else {
        const sizeInMB = file.size / (1024 * 1024);
        const formattedSize = sizeInMB >= 1 
          ? `${sizeInMB.toFixed(2)} MB` 
          : `${(file.size / 1024).toFixed(1)} KB`;

        const mime = file.type || (ext === 'pdf' ? 'application/pdf' : `image/${ext}`);
        const attachmentId = `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        // Leer el archivo como Base64 y guardarlo en IndexedDB (sin límite de 5MB)
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = (e.target?.result as string) || '';
          
          if (dataUrl && dataUrl.startsWith('data:')) {
            // Guardar en IndexedDB el contenido binario real
            await saveAttachment(attachmentId, dataUrl);
            
            setAdjuntos((prev) => [
              ...prev,
              {
                id: attachmentId,
                name: file.name,
                size: formattedSize || '1.2 MB',
                type: ext.toUpperCase() || 'DOCUMENTO',
                // Guardar la URL completa para mostrar preview inmediato
                url: dataUrl,
                // Referencia IndexedDB para persistencia duradera
                idbRef: makeIdbUrl(attachmentId),
                mimeType: mime,
              },
            ]);
          } else {
            setFileError('⚠️ Error al leer el archivo. Intente nuevamente.');
          }
        };
        reader.onerror = () => {
          setFileError(`⚠️ No se pudo leer el archivo "${file.name}". Verifique que no esté dañado.`);
        };
        reader.readAsDataURL(file);
      }
    });

    if (rejectedFiles.length > 0) {
      setFileError(`⚠️ ARCHIVO NO PERMITIDO POR SEGURIDAD: No se permite adjuntar scripts, archivos ejecutable o de sistema (${rejectedFiles.join(', ')}).`);
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

    const targetProjectId = project.id || id || (typeof window !== 'undefined' ? localStorage.getItem('last_selected_project_id') : '') || '';

    const storedRole = (typeof window !== 'undefined' ? localStorage.getItem('user_role') : null) || 'Supervisor de Obra';
    const storedName = (typeof window !== 'undefined' ? localStorage.getItem('user_name') : null) || 'Ing. Responsable de Obra';
    const storedCip = (typeof window !== 'undefined' ? localStorage.getItem('user_cip') : null) || 'CIP-701234';

    // Construcción de la nueva incidencia registrada
    const newIncidence = {
      id: `e-new-${Date.now()}`,
      numeroCorrelativo: esRespuesta && selectedParentInc ? selectedParentInc.numeroCorrelativo : siguienteCorrelativo,
      numeroCorrelativoFormatted: displayNumeroCorrelativo,
      tipoIncidencia: tipoIncidencia,
      titulo: titulo,
      contenido: contenido,
      fechaHora: formattedDate,
      autorNombre: storedName,
      autorCargo: storedRole,
      autorCIP: storedCip,
      firmadoDigitalmente: true,
      esRespuestaDeId: esRespuesta && asientoRespondidoId ? asientoRespondidoId : null,
      respuestas: [],
      estadoGestion: esRespuesta ? 'Atendido / Respuesta Registrada' : 'Asiento Informativo (Sin acción requerida)',
      plazoDiasRespuesta: tipoIncidencia === 'CONSULTA_TECNICA' ? 10 : undefined,
      adjuntos: adjuntos.map((att: any) => ({
        id: att.id,
        nombreArchivo: att.name,
        // Usar la referencia IndexedDB (idb://) para persistencia; el viewer la resolverá
        urlArchivo: att.idbRef || att.url || '#',
        tipo: att.mimeType || (att.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      })),
    };

    if (typeof window !== 'undefined') {
      const incidenceForStorage = {
        ...newIncidence,
        adjuntos: (newIncidence.adjuntos || []).map((att: any) => ({
          id: att.id,
          nombreArchivo: att.nombreArchivo,
          // Guardar referencia idb:// en localStorage (muy pequeña, no supera límite)
          urlArchivo: att.urlArchivo || '#',
          tipo: att.tipo,
        })),
      };

      const storageKey = `custom_incidences_${targetProjectId}`;
      const existingStr = localStorage.getItem(storageKey);
      const existingList = existingStr ? JSON.parse(existingStr) : [];

      try {
        localStorage.setItem(storageKey, JSON.stringify([incidenceForStorage, ...existingList]));
      } catch (quotaErr) {
        // Si se excede la cuota, limpiar las entradas más antiguas y reintentar
        console.warn('localStorage lleno, limpiando entradas antiguas...', quotaErr);
        const trimmedList = existingList.slice(0, Math.max(Math.floor(existingList.length / 2), 5));
        try {
          localStorage.setItem(storageKey, JSON.stringify([incidenceForStorage, ...trimmedList]));
        } catch (retryErr) {
          // Último intento: guardar solo la nueva entrada
          console.error('Reintento fallido, guardando solo nueva entrada:', retryErr);
          try {
            localStorage.setItem(storageKey, JSON.stringify([incidenceForStorage]));
          } catch (finalErr) {
            console.error('No se pudo guardar en localStorage:', finalErr);
          }
        }
      }

      // 🔔 PERSISTENCIA INMEDIATA EN BASE DE DATOS POSTGRESQL Y SERVIDOR
      try {
        await fetch('/api/incidences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incidenceForStorage),
        });
      } catch (apiErr) {
        console.error('Error al guardar asiento en /api/incidences:', apiErr);
      }

      // 🔔 ACTUALIZAR CONTADOR DE ASIENTOS EN app_projects_list Y GUARDAR ÚLTIMO PROYECTO SELECCIONADO
      const savedProjects = localStorage.getItem('app_projects_list');
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((p: MockProject) => {
              if (p.id === targetProjectId || p.cui === project.cui) {
                return { ...p, asientosCount: (p.asientosCount || 0) + 1 };
              }
              return p;
            });
            localStorage.setItem('app_projects_list', JSON.stringify(updated));
          }
        } catch (e) {
          console.error('Error al actualizar contador de asientos del proyecto:', e);
        }
      }
      if (targetProjectId) {
        localStorage.setItem('last_selected_project_id', targetProjectId);
      }

      // 🔔 NOTIFICACIÓN AUTOMÁTICA AL SUPERVISOR Y ADMINISTRADOR
      const notificationItem = {
        id: `notif-${Date.now()}`,
        proyectoId: targetProjectId,
        cuiProyecto: project.cui,
        nombreProyecto: project.nombre,
        asientoId: newIncidence.id,
        numeroCorrelativo: displayNumeroCorrelativo,
        tipoIncidencia: tipoIncidencia,
        tituloAsiento: titulo,
        autorNombre: storedName,
        autorCargo: storedRole,
        fechaHora: formattedDate,
        destinatariosRoles: ['SUPERVISOR', 'SUPERVISOR_DE_OBRA', 'ADMINISTRADOR', 'ADMIN', 'JEFE_DE_PROYECTO'],
        leido: false,
        esRespuesta: esRespuesta,
        mensaje: esRespuesta 
          ? `💬 Se registró el Asiento Respuesta N° ${displayNumeroCorrelativo} por ${storedRole} en la obra CUI ${project.cui}`
          : `🔔 Se generó el nuevo Asiento N° ${displayNumeroCorrelativo} (${tipoIncidencia.replace('_', ' ')}) por ${storedRole} en la obra CUI ${project.cui}`,
      };

      const notifKey = 'app_notifications_list';
      const savedNotifsStr = localStorage.getItem(notifKey);
      const notifsList = savedNotifsStr ? JSON.parse(savedNotifsStr) : [];
      try {
        localStorage.setItem(notifKey, JSON.stringify([notificationItem, ...notifsList]));
      } catch (notifQuotaErr) {
        // Limitar notificaciones a las últimas 50
        const trimmedNotifs = notifsList.slice(0, 50);
        try {
          localStorage.setItem(notifKey, JSON.stringify([notificationItem, ...trimmedNotifs]));
        } catch (e) {
          console.error('No se pudo guardar notificación:', e);
        }
      }
    }

    setTimeout(() => {
      alert(`✅ Asiento registrado exitosamente en el Cuaderno Digital con numeración: N° ${displayNumeroCorrelativo}.`);
      window.location.href = `/proyectos/${targetProjectId}`;
    }, 600);
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
                    Permitidos: PDF, DWG, DOCX, XLSX, JPG, PNG, MP4, ZIP, RAR
                  </span>
                </div>

                {/* Input File Oculto */}
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={(e) => handleFileProcess(e.target.files)}
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
