'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Download,
  Cloud,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  RotateCcw,
  Trash2,
  ExternalLink,
  Key,
  Folder,
  UploadCloud,
  FileCode,
  Info,
  Server
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface LocalBackupFile {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  path: string;
}

export default function DatabaseBackupModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'generate' | 'gdrive' | 'history'>('generate');

  // Estado formulario Generar Backup
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [storeLocal, setStoreLocal] = useState(true);
  const [uploadGDrive, setUploadGDrive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{ success: boolean; message: string; downloadUrl?: string; gdriveUrl?: string } | null>(null);

  // Estado Google Drive
  const [gdriveConfig, setGdriveConfig] = useState({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    folderId: '',
    folderName: 'Backups_Cuaderno_Obra_GORE',
    autoBackupEnabled: false,
  });
  const [hasGdriveCredentials, setHasGdriveCredentials] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isTestingGDrive, setIsTestingGDrive] = useState(false);
  const [gdriveTestResult, setGdriveTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSavingGDrive, setIsSavingGDrive] = useState(false);
  const [gdriveSaveMsg, setGdriveSaveMsg] = useState<string | null>(null);

  // Estado Historial & Restauración
  const [historyList, setHistoryList] = useState<LocalBackupFile[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string } | null>(null);

  // Cargar datos al abrir modal
  useEffect(() => {
    if (isOpen) {
      loadGDriveConfig();
      loadHistory();
      setGenResult(null);
      setRestoreResult(null);
    }
  }, [isOpen]);

  const loadGDriveConfig = async () => {
    try {
      const res = await fetch('/api/backup/gdrive/config');
      const data = await res.json();
      if (data.success) {
        setGdriveConfig(data.config);
        setHasGdriveCredentials(data.hasCredentials);
      }
    } catch (err) {
      console.error('Error cargando configuración GDrive:', err);
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/backup/list');
      const data = await res.json();
      if (data.success) {
        setHistoryList(data.backups || []);
      }
    } catch (err) {
      console.error('Error cargando historial de backups:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!isOpen) return null;

  // Manejar Generación de Backup
  const handleGenerateBackup = async (directDownload: boolean) => {
    setIsGenerating(true);
    setGenResult(null);

    try {
      // Obtener snapshot local por si la DB Postgres no está activa en el servidor
      let clientSnapshot: any = undefined;
      if (typeof window !== 'undefined') {
        try {
          clientSnapshot = {
            users: JSON.parse(localStorage.getItem('app_registered_users') || '[]'),
            projects: JSON.parse(localStorage.getItem('app_projects_list') || '[]'),
            incidences: JSON.parse(localStorage.getItem('app_incidences_list') || '[]'),
            assignments: JSON.parse(localStorage.getItem('app_user_assignments') || '[]'),
          };
        } catch (e) {
          console.warn('No se pudo empaquetar snapshot de localStorage:', e);
        }
      }

      const payload = {
        password: usePassword ? password : '',
        storeLocal,
        uploadGDrive,
        downloadDirect: directDownload,
        clientSnapshot,
      };

      if (directDownload) {
        // Petición blob para descarga directa en el navegador
        const response = await fetch('/api/backup/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Error generando archivo de descarga.');
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = `backup_cuaderno_db_${new Date().toISOString().slice(0, 10)}.zip`;
        if (contentDisposition && contentDisposition.includes('filename=')) {
          fileName = contentDisposition.split('filename=')[1].replace(/"/g, '');
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setGenResult({
          success: true,
          message: `Backup descargado correctamente en su equipo (${(blob.size / 1024 / 1024).toFixed(2)} MB).`,
        });
      } else {
        // Generar en servidor / GDrive
        const response = await fetch('/api/backup/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Error procesando backup.');
        }

        setGenResult({
          success: true,
          message: `Backup generado con éxito: ${data.filename} (${(data.sizeBytes / 1024 / 1024).toFixed(2)} MB).` +
            (data.isEncrypted ? ' protegida con cifrado ZIP.' : ''),
          gdriveUrl: data.gdriveWebViewLink,
        });
      }

      loadHistory();
    } catch (err: any) {
      setGenResult({
        success: false,
        message: err.message || 'Ocurrió un error inesperado al generar el backup.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Guardar GDrive
  const handleSaveGDrive = async () => {
    setIsSavingGDrive(true);
    setGdriveSaveMsg(null);
    try {
      const res = await fetch('/api/backup/gdrive/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', config: gdriveConfig }),
      });
      const data = await res.json();
      if (data.success) {
        setGdriveSaveMsg('Configuración de Google Drive guardada con éxito.');
        loadGDriveConfig();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setGdriveSaveMsg(`Error: ${err.message}`);
    } finally {
      setIsSavingGDrive(false);
    }
  };

  // Probar GDrive
  const handleTestGDrive = async () => {
    setIsTestingGDrive(true);
    setGdriveTestResult(null);
    try {
      const res = await fetch('/api/backup/gdrive/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', config: gdriveConfig }),
      });
      const data = await res.json();
      setGdriveTestResult(data);
    } catch (err: any) {
      setGdriveTestResult({ success: false, message: err.message });
    } finally {
      setIsTestingGDrive(false);
    }
  };

  // Eliminar Backup local
  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`¿Está seguro de eliminar permanentemente el respaldo ${filename}?`)) return;
    try {
      const res = await fetch(`/api/backup/list?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadHistory();
      } else {
        alert(data.error || 'Error al eliminar backup.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Restaurar BD desde archivo local
  const handleRestoreLocalFile = async (filename: string) => {
    if (!confirm(`⚠️ ATENCIÓN: ¡Restaurar un backup actualizará los registros de la base de datos! ¿Desea continuar con el archivo ${filename}?`)) return;
    setIsRestoring(true);
    setRestoreResult(null);
    try {
      const formData = new FormData();
      formData.append('filename', filename);

      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setRestoreResult(data);
    } catch (err: any) {
      setRestoreResult({ success: false, message: err.message });
    } finally {
      setIsRestoring(false);
    }
  };

  // Restaurar BD desde archivo subido (.sql)
  const handleRestoreUploadedFile = async () => {
    if (!selectedRestoreFile) return;
    if (!confirm(`⚠️ ATENCIÓN: ¿Desea restaurar la base de datos desde el archivo subido '${selectedRestoreFile.name}'?`)) return;

    setIsRestoring(true);
    setRestoreResult(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedRestoreFile);

      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setRestoreResult(data);
      if (data.success) {
        setSelectedRestoreFile(null);
      }
    } catch (err: any) {
      setRestoreResult({ success: false, message: err.message });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl border border-[#E2E2E2] w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera Modal */}
        <div className="bg-[#91000A] text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Database className="w-6 h-6 text-red-100" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Copias de Seguridad (Backups)</h2>
              <p className="text-xs text-red-200">Respaldo de Base de Datos en PC y Google Drive — GORE Lambayeque</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors focus:outline-none"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* NAVEGACIÓN PESTAÑAS */}
        <div className="flex border-b border-[#E2E2E2] bg-gray-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'generate'
                ? 'border-[#91000A] text-[#91000A] bg-white rounded-t-lg shadow-sm'
                : 'border-transparent text-gray-600 hover:text-[#91000A]'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Generar Respaldo</span>
          </button>

          <button
            onClick={() => setActiveTab('gdrive')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'gdrive'
                ? 'border-[#91000A] text-[#91000A] bg-white rounded-t-lg shadow-sm'
                : 'border-transparent text-gray-600 hover:text-[#91000A]'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Google Drive</span>
            {hasGdriveCredentials && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Configurado"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-[#91000A] text-[#91000A] bg-white rounded-t-lg shadow-sm'
                : 'border-transparent text-gray-600 hover:text-[#91000A]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial y Restauración</span>
            {historyList.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-[#91000A] rounded-full font-bold">
                {historyList.length}
              </span>
            )}
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
        <div className="p-6 overflow-y-auto flex-1 text-sm text-[#1A1C1C] space-y-6">

          {/* ================= PESTAÑA 1: GENERAR BACKUP ================= */}
          {activeTab === 'generate' && (
            <div className="space-y-6">
              
              {/* Tarjeta Informativa */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-[#91000A] p-4 rounded-r-lg shadow-sm flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-[#91000A] mt-0.5 flex-shrink-0" />
                <div className="text-xs text-[#5B403D] space-y-1">
                  <p className="font-bold text-[#91000A]">Generador de Copia de Seguridad PostgreSQL</p>
                  <p>
                    Extrae la estructura SQL completa de tablas, proyectos, usuarios y asientos de incidencias, empaquetándolos en un archivo ZIP de alta compresión.
                  </p>
                </div>
              </div>

              {/* Opciones de Seguridad ZIP */}
              <div className="bg-gray-50 p-4 rounded-lg border border-[#E2E2E2] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-xs text-[#1A1C1C]">
                    <input
                      type="checkbox"
                      checked={usePassword}
                      onChange={(e) => setUsePassword(e.target.checked)}
                      className="rounded text-[#91000A] focus:ring-[#91000A] w-4 h-4"
                    />
                    <Lock className="w-4 h-4 text-[#91000A]" />
                    <span>Proteger archivo ZIP con contraseña de seguridad</span>
                  </label>
                  {usePassword && (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Cifrado AES-256
                    </span>
                  )}
                </div>

                {usePassword && (
                  <div className="pt-2 animate-fadeIn">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Contraseña para descomprimir el backup:
                    </label>
                    <div className="relative max-w-md">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Ingrese clave segura..."
                        className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md text-xs focus:ring-[#91000A] focus:border-[#91000A]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Conserve esta clave. Se requerirá para abrir o restaurar este archivo `.zip`.
                    </p>
                  </div>
                )}
              </div>

              {/* Destinos del Backup */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Destino del Respaldo
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className={`p-3.5 border rounded-lg flex items-center space-x-3 cursor-pointer transition-all ${
                    storeLocal ? 'border-[#91000A] bg-red-50/40 shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={storeLocal}
                      onChange={(e) => setStoreLocal(e.target.checked)}
                      className="rounded text-[#91000A] focus:ring-[#91000A] w-4 h-4"
                    />
                    <HardDrive className="w-5 h-5 text-[#91000A]" />
                    <div>
                      <div className="font-bold text-xs text-[#1A1C1C]">Servidor Local (PC)</div>
                      <div className="text-[11px] text-gray-500">Guarda en carpetas internas del sistema</div>
                    </div>
                  </label>

                  <label className={`p-3.5 border rounded-lg flex items-center space-x-3 cursor-pointer transition-all ${
                    uploadGDrive ? 'border-[#91000A] bg-red-50/40 shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={uploadGDrive}
                      onChange={(e) => setUploadGDrive(e.target.checked)}
                      disabled={!hasGdriveCredentials}
                      className="rounded text-[#91000A] focus:ring-[#91000A] w-4 h-4"
                    />
                    <Cloud className={`w-5 h-5 ${hasGdriveCredentials ? 'text-[#91000A]' : 'text-gray-400'}`} />
                    <div>
                      <div className="font-bold text-xs text-[#1A1C1C] flex items-center space-x-1">
                        <span>Google Drive (Nube)</span>
                        {!hasGdriveCredentials && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-normal">
                            No configurado
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500">Sube copia directa a su carpeta de Drive</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Resultados o Alertas */}
              {genResult && (
                <div className={`p-4 rounded-lg border text-xs flex items-start space-x-3 ${
                  genResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  {genResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 flex-1">
                    <p className="font-bold">{genResult.message}</p>
                    {genResult.gdriveUrl && (
                      <a
                        href={genResult.gdriveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-emerald-700 hover:underline font-bold"
                      >
                        <span>Ver en Google Drive</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Botones Acción */}
              <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => handleGenerateBackup(false)}
                  disabled={isGenerating}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-gray-600" />
                  ) : (
                    <Server className="w-4 h-4 text-gray-600" />
                  )}
                  <span>Generar en Servidor / Nube</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateBackup(true)}
                  disabled={isGenerating}
                  className="px-5 py-2.5 bg-[#91000A] hover:bg-[#b71c1c] text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Download className="w-4 h-4 text-white" />
                  )}
                  <span>Generar y Descargar en PC (.ZIP)</span>
                </button>
              </div>

            </div>
          )}

          {/* ================= PESTAÑA 2: GOOGLE DRIVE ================= */}
          {activeTab === 'gdrive' && (
            <div className="space-y-6">

              {/* Banner Estado Conexión */}
              <div className={`p-4 rounded-lg border text-xs flex items-center justify-between ${
                hasGdriveCredentials
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center space-x-3">
                  <Cloud className={`w-6 h-6 ${hasGdriveCredentials ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <div>
                    <span className="font-bold text-sm block">
                      {hasGdriveCredentials ? 'Google Drive Conectado' : 'Conexión a Google Drive No Configurada'}
                    </span>
                    <span className="text-[11px] opacity-80">
                      {hasGdriveCredentials
                        ? `Carpeta de respaldo activa: "${gdriveConfig.folderName}"`
                        : 'Configure su Client ID y Refresh Token para activar respaldos automáticos en la nube.'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestGDrive}
                  disabled={isTestingGDrive}
                  className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-md font-bold text-xs text-gray-700 shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isTestingGDrive ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span>Probar Conexión</span>
                </button>
              </div>

              {gdriveTestResult && (
                <div className={`p-3 rounded-md border text-xs flex items-start space-x-2 ${
                  gdriveTestResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {gdriveTestResult.success ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                  <span>{gdriveTestResult.message}</span>
                </div>
              )}

              {/* Formulario Credenciales GDrive */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Google OAuth Client ID:
                  </label>
                  <input
                    type="text"
                    value={gdriveConfig.clientId}
                    onChange={(e) => setGdriveConfig({ ...gdriveConfig, clientId: e.target.value })}
                    placeholder="xxxxxxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-[#91000A] focus:border-[#91000A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Google OAuth Client Secret:
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={gdriveConfig.clientSecret}
                      onChange={(e) => setGdriveConfig({ ...gdriveConfig, clientSecret: e.target.value })}
                      placeholder="GOCSPX-xxxxxxxxxxxx"
                      className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md text-xs focus:ring-[#91000A] focus:border-[#91000A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Google OAuth Refresh Token:
                  </label>
                  <input
                    type="text"
                    value={gdriveConfig.refreshToken}
                    onChange={(e) => setGdriveConfig({ ...gdriveConfig, refreshToken: e.target.value })}
                    placeholder="1//0gxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-mono focus:ring-[#91000A] focus:border-[#91000A]"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Permite refrescar el Access Token automáticamente en segundo plano sin caducar.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nombre de Carpeta en Google Drive:
                  </label>
                  <input
                    type="text"
                    value={gdriveConfig.folderName}
                    onChange={(e) => setGdriveConfig({ ...gdriveConfig, folderName: e.target.value })}
                    placeholder="Backups_Cuaderno_Obra_GORE"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-[#91000A] focus:border-[#91000A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Folder ID Específico (Opcional):
                  </label>
                  <input
                    type="text"
                    value={gdriveConfig.folderId || ''}
                    onChange={(e) => setGdriveConfig({ ...gdriveConfig, folderId: e.target.value })}
                    placeholder="ID de carpeta destino en Drive..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-[#91000A] focus:border-[#91000A]"
                  />
                </div>

              </div>

              {gdriveSaveMsg && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-xs">
                  {gdriveSaveMsg}
                </div>
              )}

              {/* Guía rápida */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2 text-xs text-gray-600">
                <div className="font-bold text-gray-800 flex items-center space-x-1.5">
                  <Info className="w-4 h-4 text-[#91000A]" />
                  <span>¿Cómo obtener credenciales de Google Drive API?</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px]">
                  <li>Ingrese a <strong>Google Cloud Console</strong> (console.cloud.google.com).</li>
                  <li>Habilite la API de <strong>Google Drive API</strong>.</li>
                  <li>Cree credenciales de tipo <strong>ID de cliente de OAuth 2.0</strong>.</li>
                  <li>Generar Refresh Token con alcance `https://www.googleapis.com/auth/drive.file`.</li>
                </ol>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveGDrive}
                  disabled={isSavingGDrive}
                  className="px-5 py-2.5 bg-[#91000A] hover:bg-[#b71c1c] text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSavingGDrive ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Guardar Configuración GDrive</span>
                </button>
              </div>

            </div>
          )}

          {/* ================= PESTAÑA 3: HISTORIAL & RESTAURACIÓN ================= */}
          {activeTab === 'history' && (
            <div className="space-y-6">

              {/* Sección Restaurar Archivo Externo */}
              <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-lg space-y-3">
                <div className="flex items-center space-x-2 font-bold text-xs text-amber-900">
                  <RotateCcw className="w-4 h-4 text-amber-700" />
                  <span>Restaurar Base de Datos desde Archivo Externo (.sql)</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="file"
                    accept=".sql"
                    onChange={(e) => setSelectedRestoreFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#91000A] file:text-white hover:file:bg-[#b71c1c]"
                  />

                  {selectedRestoreFile && (
                    <button
                      type="button"
                      onClick={handleRestoreUploadedFile}
                      disabled={isRestoring}
                      className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-md shadow transition-colors flex items-center space-x-1.5 whitespace-nowrap disabled:opacity-50"
                    >
                      {isRestoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                      <span>Ejecutar Restauración SQL</span>
                    </button>
                  )}
                </div>
              </div>

              {restoreResult && (
                <div className={`p-3 rounded-md border text-xs flex items-start space-x-2 ${
                  restoreResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {restoreResult.success ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                  <span>{restoreResult.message}</span>
                </div>
              )}

              {/* Tabla de Backups Locales */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Backups Almacenados en Servidor
                  </h3>
                  <button
                    onClick={loadHistory}
                    className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-800"
                    title="Actualizar lista"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {historyList.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500 text-xs">
                    No hay copias de seguridad guardadas en el servidor local.
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 border-b border-gray-200 font-bold text-gray-700">
                        <tr>
                          <th className="px-4 py-2.5">Nombre del Archivo</th>
                          <th className="px-4 py-2.5">Tamaño</th>
                          <th className="px-4 py-2.5">Fecha</th>
                          <th className="px-4 py-2.5 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {historyList.map((item) => (
                          <tr key={item.filename} className="hover:bg-red-50/30 transition-colors">
                            <td className="px-4 py-3 font-mono text-gray-900 flex items-center space-x-2">
                              <FileCode className="w-4 h-4 text-[#91000A]" />
                              <span>{item.filename}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {(item.sizeBytes / 1024 / 1024).toFixed(2)} MB
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {new Date(item.createdAt).toLocaleString('es-PE')}
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button
                                onClick={() => handleRestoreLocalFile(item.filename)}
                                className="p-1.5 text-amber-700 hover:bg-amber-50 rounded transition-colors"
                                title="Restaurar este backup"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBackup(item.filename)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Eliminar archivo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Pie de Modal */}
        <div className="bg-gray-50 border-t border-[#E2E2E2] px-6 py-3 flex items-center justify-between text-xs text-gray-500">
          <span>Gobierno Regional Lambayeque &copy; {new Date().getFullYear()}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-gray-300 hover:bg-gray-100 rounded-md font-bold text-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
