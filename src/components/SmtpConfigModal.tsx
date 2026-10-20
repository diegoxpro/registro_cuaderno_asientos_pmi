'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Server,
  Key,
  ShieldCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Sliders,
  Sparkles,
  Lock,
  UserCheck
} from 'lucide-react';
import {
  SmtpConfig,
  PublicSmtpConfig,
  DEFAULT_SMTP_CONFIG,
  fetchSmtpConfig,
  saveSmtpConfigToServer,
  readLegacyLocalSmtpConfig,
  clearLegacyLocalSmtpConfig,
} from '@/lib/smtp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: PublicSmtpConfig) => void;
}

export default function SmtpConfigModal({ isOpen, onClose, onConfigSaved }: Props) {
  const [config, setConfig] = useState<SmtpConfig>(DEFAULT_SMTP_CONFIG);
  const [testRecipient, setTestRecipient] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  // La contraseña nunca viaja al navegador: solo se sabe si hay una guardada
  const [hasStoredPassword, setHasStoredPassword] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [migrationNotice, setMigrationNotice] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTestResult(null);
    setSaveStatus(null);
    setSaveError(null);
    setMigrationNotice(false);
    setIsLoadingConfig(true);

    fetchSmtpConfig()
      .then((server) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hasPassword, configured, updatedAt, updatedBy, ...fields } = server;
        const legacy = readLegacyLocalSmtpConfig();
        if (!configured && legacy) {
          // Migración: precargar la configuración que este navegador tenía guardada
          setConfig(legacy);
          setMigrationNotice(true);
        } else {
          setConfig({ ...fields, pass: '' });
        }
        setHasStoredPassword(hasPassword);
        setLastUpdate(updatedAt ? `${new Date(updatedAt).toLocaleString('es-PE')}${updatedBy ? ` por ${updatedBy}` : ''}` : null);
        const source = !configured && legacy ? legacy : fields;
        setTestRecipient(source.fromEmail || source.user || '');
      })
      .catch((err) => setSaveError(err instanceof Error ? err.message : 'No se pudo cargar la configuración SMTP.'))
      .finally(() => setIsLoadingConfig(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (presetName: 'GMAIL' | 'OUTLOOK' | 'MAILTRAP') => {
    setTestResult(null);
    switch (presetName) {
      case 'GMAIL':
        setConfig((prev) => ({
          ...prev,
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
        }));
        break;
      case 'OUTLOOK':
        setConfig((prev) => ({
          ...prev,
          host: 'smtp.office365.com',
          port: 587,
          secure: false,
        }));
        break;
      case 'MAILTRAP':
        setConfig((prev) => ({
          ...prev,
          host: 'sandbox.smtp.mailtrap.io',
          port: 2525,
          secure: false,
        }));
        break;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.pass && !hasStoredPassword) {
      setSaveError('Ingrese la contraseña del servidor SMTP.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const saved = await saveSmtpConfigToServer(config);
      clearLegacyLocalSmtpConfig();
      setMigrationNotice(false);
      setHasStoredPassword(saved.hasPassword);
      setConfig((prev) => ({ ...prev, pass: '' }));
      setLastUpdate(saved.updatedAt ? `${new Date(saved.updatedAt).toLocaleString('es-PE')}${saved.updatedBy ? ` por ${saved.updatedBy}` : ''}` : null);
      setSaveStatus('Configuración SMTP guardada para todo el sistema.');
      onConfigSaved?.(saved);
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar la configuración SMTP.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.host || !config.user || (!config.pass && !hasStoredPassword)) {
      setTestResult({
        success: false,
        message: 'Por favor complete el Host, Usuario y Contraseña antes de probar.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          testRecipient: testRecipient || config.fromEmail || config.user,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Conexión SMTP exitosa y correo de prueba enviado.',
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'No se pudo conectar con el servidor SMTP.',
        });
      }
    } catch (err: unknown) {
      console.error(err);
      setTestResult({
        success: false,
        message: 'Error de red o servidor al enviar correo de prueba.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full border border-[#E2E2E2] shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#91000A] text-white p-4 px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg border border-white/20">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display tracking-wide uppercase">
                Configuración de Servidor SMTP
              </h2>
              <p className="text-xs text-red-100 font-sans">
                Configuración general del sistema · solo el administrador puede modificarla
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-red-100 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 flex-1 overflow-y-auto text-xs">
          
          {isLoadingConfig && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-gray-600 font-semibold">Cargando configuración del servidor…</div>
          )}
          {migrationNotice && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 font-semibold">
              Se cargó la configuración que estaba guardada solo en este navegador. Pulse <strong>Guardar</strong> para aplicarla a todo el sistema (después se borrará de este navegador).
            </div>
          )}
          {!migrationNotice && lastUpdate && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-900">
              Configuración general vigente · última modificación: {lastUpdate}
            </div>
          )}

          {/* Quick Presets */}
          <div className="bg-[#F9F9F9] p-3.5 rounded-lg border border-[#E2E2E2] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#5B403D] flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#91000A]" />
                <span>Plantillas Rápidas de Servidor:</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('GMAIL')}
                className="px-3 py-2 bg-white hover:bg-red-50 text-gray-800 border border-gray-300 rounded font-semibold flex items-center justify-center space-x-1.5 transition-all hover:border-[#91000A]"
              >
                <span>Gmail SMTP</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('OUTLOOK')}
                className="px-3 py-2 bg-white hover:bg-red-50 text-gray-800 border border-gray-300 rounded font-semibold flex items-center justify-center space-x-1.5 transition-all hover:border-[#91000A]"
              >
                <span>Outlook / Office365</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('MAILTRAP')}
                className="px-3 py-2 bg-white hover:bg-red-50 text-gray-800 border border-gray-300 rounded font-semibold flex items-center justify-center space-x-1.5 transition-all hover:border-[#91000A]"
              >
                <span>Mailtrap (Pruebas)</span>
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Host SMTP */}
            <div>
              <label className="block font-semibold text-[#5B403D] mb-1 flex items-center space-x-1">
                <Server className="w-3.5 h-3.5 text-[#91000A]" />
                <span>Servidor SMTP (Host) *</span>
              </label>
              <input
                type="text"
                required
                placeholder="ej: smtp.gmail.com o mail.gob.pe"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-mono focus:ring-2 focus:ring-[#91000A]"
              />
            </div>

            {/* Puerto */}
            <div>
              <label className="block font-semibold text-[#5B403D] mb-1 flex items-center space-x-1">
                <Sliders className="w-3.5 h-3.5 text-[#91000A]" />
                <span>Puerto *</span>
              </label>
              <div className="flex space-x-2 items-center">
                <input
                  type="number"
                  required
                  placeholder="587"
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-mono focus:ring-2 focus:ring-[#91000A]"
                />
                <label className="flex items-center space-x-1.5 cursor-pointer whitespace-nowrap text-[11px] font-semibold text-gray-700 bg-gray-50 p-2 rounded border">
                  <input
                    type="checkbox"
                    checked={config.secure}
                    onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
                    className="rounded text-[#91000A] focus:ring-[#91000A]"
                  />
                  <span>Usar SSL/TLS (Puerto 465)</span>
                </label>
              </div>
            </div>

            {/* Usuario SMTP */}
            <div>
              <label className="block font-semibold text-[#5B403D] mb-1 flex items-center space-x-1">
                <UserCheck className="w-3.5 h-3.5 text-[#91000A]" />
                <span>Usuario SMTP (Email Autenticado) *</span>
              </label>
              <input
                type="text"
                required
                placeholder="notificaciones@regionlambayeque.gob.pe"
                value={config.user}
                onChange={(e) => setConfig({ ...config, user: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-mono focus:ring-2 focus:ring-[#91000A]"
              />
            </div>

            {/* Contraseña SMTP */}
            <div>
              <label className="block font-semibold text-[#5B403D] mb-1 flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5 text-[#91000A]" />
                <span>Contraseña / App Password *</span>
              </label>
              <input
                type="password"
                required={!hasStoredPassword}
                autoComplete="new-password"
                placeholder={hasStoredPassword ? 'Guardada · dejar vacío para conservarla' : '••••••••••••••••'}
                value={config.pass}
                onChange={(e) => setConfig({ ...config, pass: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-mono focus:ring-2 focus:ring-[#91000A]"
              />
              <span className="text-[10px] text-gray-500 block mt-0.5">
                Para Gmail u Outlook se recomienda usar una <em>Contraseña de Aplicación</em>.
              </span>
            </div>

            {/* Nombre del Remitente */}
            <div>
              <label className="block font-semibold text-[#5B403D] mb-1">Nombre Visible del Remitente</label>
              <input
                type="text"
                placeholder="Ej: GORE Lambayeque - Registro de Asientos"
                value={config.fromName}
                onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded focus:ring-2 focus:ring-[#91000A]"
              />
            </div>

            {/* Correo del Remitente */}
            <div>
              <label className="block font-semibold text-[#5B403D] mb-1">Correo de Salida (From)</label>
              <input
                type="email"
                placeholder="notificaciones@regionlambayeque.gob.pe"
                value={config.fromEmail}
                onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-mono focus:ring-2 focus:ring-[#91000A]"
              />
            </div>
          </div>

          {/* Option Toggle */}
          <div className="bg-red-50/50 p-3 rounded-lg border border-[#91000A]/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <strong className="text-[#91000A] text-xs block">Envío Automático al Registrar Usuarios</strong>
              <p className="text-[11px] text-gray-600">
                Enviar inmediatamente un correo con credenciales a la dirección del usuario al completar el formulario de registro.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={config.autoSendOnRegister}
                onChange={(e) => setConfig({ ...config, autoSendOnRegister: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#91000A]"></div>
            </label>
          </div>

          {/* Test Connection Section */}
          <div className="border-t border-[#E2E2E2] pt-4 space-y-3">
            <h4 className="font-bold text-[#91000A] uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <Send className="w-3.5 h-3.5" />
              <span>Probar Conexión SMTP y Envío de Correo</span>
            </h4>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="email"
                placeholder="Correo destinatario de prueba"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="w-full sm:flex-1 px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-mono"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full sm:w-auto px-4 py-2 bg-gray-800 hover:bg-black text-white font-bold rounded flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Conectando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Correo de Prueba</span>
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded border text-xs flex items-start space-x-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-red-50 text-red-800 border-red-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong>{testResult.success ? 'Conexión Exitosa' : 'Error de Conexión'}</strong>
                  <p className="text-[11px] mt-0.5">{testResult.message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Feedback banner on save */}
          {saveStatus && (
            <div className="p-3 bg-green-100 text-green-800 border border-green-300 rounded font-semibold text-center flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-700" />
              <span>{saveStatus}</span>
            </div>
          )}

          {saveError && (
            <div className="p-3 bg-[#FFDAD6] text-[#93000A] border border-[#BA1A1A]/40 rounded font-semibold text-center">⚠️ {saveError}</div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-3 border-t border-[#E2E2E2]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-400 text-gray-700 rounded font-semibold hover:bg-gray-100"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoadingConfig}
              className="px-5 py-2 bg-[#91000A] text-white font-bold rounded hover:bg-[#B71C1C] shadow flex items-center space-x-1.5 disabled:opacity-60"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSaving ? 'Guardando…' : 'Guardar Configuración SMTP'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
