'use client';

import React, { useState } from 'react';
import { Edit3, Send, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { MockIncidenceEntry } from '@/lib/mockData';

interface RequestSeatEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidence: MockIncidenceEntry | null;
  onSubmitRequest: (incidenceId: string, motivo: string) => void;
}

export default function RequestSeatEditModal({
  isOpen,
  onClose,
  incidence,
  onSubmitRequest,
}: RequestSeatEditModalProps) {
  const [motivo, setMotivo] = useState('');

  if (!isOpen || !incidence) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      alert('Por favor detalle el motivo de la corrección o edicion del asiento.');
      return;
    }
    onSubmitRequest(incidence.id, motivo);
    setMotivo('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 border border-[#E2E2E2] shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center space-x-2 text-[#91000A]">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="text-sm font-bold font-display uppercase tracking-wider">
              Solicitar Permiso de Edición de Asiento
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Asiento */}
        <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-xs space-y-1">
          <p className="font-mono font-bold text-[#91000A]">
            ASIENTO N° {(incidence as any).numeroCorrelativoFormatted || incidence.numeroCorrelativo.toString().padStart(4, '0')}
          </p>
          <p className="font-bold text-gray-800 line-clamp-1">{incidence.titulo}</p>
          <p className="text-gray-600 text-[11px]">Autor original: {incidence.autorNombre} ({incidence.autorCargo})</p>
        </div>

        {/* Advertencia Legal */}
        <div className="bg-amber-50 p-3 rounded-lg border border-amber-300 text-amber-900 text-xs flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-snug">
            <strong>Ley N° 29230 (OxI):</strong> Para garantizar la inmutabilidad de los registros digitales, toda modificación de un asiento requiere la <strong>autorización expresa del Supervisor de Obra</strong>.
          </p>
        </div>

        {/* Formulario de Solicitud */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5B403D] mb-1.5">
              Motivo o Justificación de la Edición <span className="text-red-600">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="EJEMPLO: Corrección de error de digitación en las especificaciones del acero de refuerzo en el plano HE-04..."
              className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#8F706C]/40 rounded-lg text-xs text-[#1A1C1C] focus:ring-2 focus:ring-[#91000A]"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t">
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
              <Send className="w-4 h-4" />
              <span>Notificar al Supervisor</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
