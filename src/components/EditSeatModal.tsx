'use client';

import React, { useState, useEffect } from 'react';
import { Edit3, Save, X, Paperclip, FileText, Image as ImageIcon, Trash2, AlertCircle } from 'lucide-react';
import { MockIncidenceEntry } from '@/lib/mockData';

interface EditSeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidence: MockIncidenceEntry | null;
  onSaveSeat: (updatedSeat: MockIncidenceEntry) => void;
}

export default function EditSeatModal({
  isOpen,
  onClose,
  incidence,
  onSaveSeat,
}: EditSeatModalProps) {
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [tipoIncidencia, setTipoIncidencia] = useState<'RIESGO' | 'CONSULTA_TECNICA' | 'OBSERVACION' | 'INFORMATIVO' | 'MODIFICACION_ESTRUCTURAL'>('CONSULTA_TECNICA');
  const [adjuntos, setAdjuntos] = useState<{ id: string; nombreArchivo: string; urlArchivo: string; tipo: string }[]>([]);

  useEffect(() => {
    if (incidence) {
      setTitulo(incidence.titulo || '');
      setContenido(incidence.contenido || '');
      setTipoIncidencia(incidence.tipoIncidencia || 'CONSULTA_TECNICA');
      setAdjuntos(incidence.adjuntos || []);
    }
  }, [incidence]);

  if (!isOpen || !incidence) return null;

  const handleRemoveAttachment = (attId: string) => {
    setAdjuntos((prev) => prev.filter((a) => a.id !== attId));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !contenido.trim()) {
      alert('Por favor ingrese el título y contenido del asiento.');
      return;
    }

    const now = new Date();
    const fechaFormat = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const updatedSeat: MockIncidenceEntry = {
      ...incidence,
      titulo: titulo.toUpperCase(),
      contenido: contenido,
      tipoIncidencia: tipoIncidencia,
      adjuntos: adjuntos,
      solicitudEdicionPendiente: false,
      edicionPermitida: false, // permiso consumido
      editado: true,
      fechaUltimaEdicion: fechaFormat,
    };

    onSaveSeat(updatedSeat);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 border border-[#E2E2E2] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center space-x-2 text-[#91000A]">
            <Edit3 className="w-5 h-5" />
            <h3 className="text-base font-bold font-display uppercase tracking-wider">
              Editar Asiento Autorizado — N° {(incidence as any).numeroCorrelativoFormatted || incidence.numeroCorrelativo.toString().padStart(4, '0')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Autorización Supervisor */}
        <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-lg text-emerald-900 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Autorización Aprobada:</strong> Esta edición fue previamente aprobada por el Supervisor de Obra.
          </span>
        </div>

        {/* Formulario de Edición */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Tipo de Incidencia */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#5B403D] mb-1">
              Tipo de Incidencia
            </label>
            <select
              value={tipoIncidencia}
              onChange={(e: any) => setTipoIncidencia(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#8F706C]/40 rounded-md text-xs font-semibold text-[#1A1C1C]"
            >
              <option value="CONSULTA_TECNICA">Consulta Técnica</option>
              <option value="RIESGO">Riesgo / Alerta Ley 29230</option>
              <option value="OBSERVACION">Observación</option>
              <option value="MODIFICACION_ESTRUCTURAL">Modificación / Adicional</option>
              <option value="INFORMATIVO">Asiento Informativo</option>
            </select>
          </div>

          {/* Título */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#5B403D] mb-1">
              Título del Asiento
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#8F706C]/40 rounded-md text-xs font-bold uppercase text-[#1A1C1C]"
            />
          </div>

          {/* Contenido */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-[#5B403D] mb-1">
              Contenido Textual del Asiento
            </label>
            <textarea
              required
              rows={6}
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#8F706C]/40 rounded-md text-xs text-[#1A1C1C] leading-relaxed font-sans"
            />
          </div>

          {/* Adjuntos */}
          {adjuntos.length > 0 && (
            <div>
              <label className="block font-semibold uppercase tracking-wider text-[#5B403D] mb-1 flex items-center space-x-1">
                <Paperclip className="w-3.5 h-3.5 text-[#91000A]" />
                <span>Anexos y Documentos Adjuntos ({adjuntos.length}):</span>
              </label>
              <div className="space-y-1.5">
                {adjuntos.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2 bg-gray-50 border rounded-md text-xs"
                  >
                    <span className="font-semibold text-gray-800 truncate max-w-md">
                      📄 {att.nombreArchivo}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                      title="Eliminar adjunto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end space-x-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#91000A] hover:bg-[#B71C1C] text-white text-xs font-bold rounded-lg shadow-md flex items-center space-x-1.5 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios Editados</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
