'use client';

import React, { useState, useEffect } from 'react';
import {
  Tags,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  FileText,
  Layers,
  Check,
  Tag
} from 'lucide-react';

export interface IncidenceTypeRecord {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  colorBadge: 'blue' | 'amber' | 'red' | 'orange' | 'purple' | 'emerald';
  requiereRespuesta: boolean;
  plazoRespuestaDias: number;
  activo: boolean;
}

export const INITIAL_INCIDENCE_TYPES: IncidenceTypeRecord[] = [
  {
    id: 'it-1',
    codigo: 'INFORMATIVO',
    nombre: 'Informativo de Obra',
    descripcion: 'Asientos informativos sobre el avance físico, entregables o anotaciones diarias.',
    colorBadge: 'blue',
    requiereRespuesta: false,
    plazoRespuestaDias: 0,
    activo: true,
  },
  {
    id: 'it-2',
    codigo: 'CONSULTA_TECNICA',
    nombre: 'Consulta Técnica',
    descripcion: 'Consultas de residente sobre planos, especificaciones o detalles constructivos.',
    colorBadge: 'amber',
    requiereRespuesta: true,
    plazoRespuestaDias: 5,
    activo: true,
  },
  {
    id: 'it-3',
    codigo: 'RIESGO',
    nombre: 'Alerta de Riesgo Ley 29230',
    descripcion: 'Alertas tempranas sobre riesgos de retraso, desabastecimiento o paralización.',
    colorBadge: 'red',
    requiereRespuesta: true,
    plazoRespuestaDias: 3,
    activo: true,
  },
  {
    id: 'it-4',
    codigo: 'OBSERVACION',
    nombre: 'Observación Técnica',
    descripcion: 'Observaciones formuladas por la Supervisión sobre seguridad o calidad de materiales.',
    colorBadge: 'orange',
    requiereRespuesta: true,
    plazoRespuestaDias: 5,
    activo: true,
  },
  {
    id: 'it-5',
    codigo: 'VARIACION_OBRA',
    nombre: 'Variación de Trazo / Adicional',
    descripcion: 'Anotación sobre modificaciones de trazo, presupuesto adicional o deductivos de obra.',
    colorBadge: 'purple',
    requiereRespuesta: true,
    plazoRespuestaDias: 7,
    activo: true,
  },
];

export function getStoredIncidenceTypes(): IncidenceTypeRecord[] {
  if (typeof window === 'undefined') return INITIAL_INCIDENCE_TYPES;
  try {
    const saved = localStorage.getItem('app_incidence_types_list');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error al leer app_incidence_types_list:', e);
  }
  return INITIAL_INCIDENCE_TYPES;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function IncidenceTypesModal({ isOpen, onClose }: Props) {
  const [types, setTypes] = useState<IncidenceTypeRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('TODOS');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [colorBadge, setColorBadge] = useState<IncidenceTypeRecord['colorBadge']>('blue');
  const [requiereRespuesta, setRequiereRespuesta] = useState(true);
  const [plazoRespuestaDias, setPlazoRespuestaDias] = useState(5);
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setTypes(getStoredIncidenceTypes());
    }
  }, [isOpen]);

  const saveTypesToStorage = (newList: IncidenceTypeRecord[]) => {
    setTypes(newList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_incidence_types_list', JSON.stringify(newList));
    }
  };

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingId(null);
    setCodigo('');
    setNombre('');
    setDescripcion('');
    setColorBadge('amber');
    setRequiereRespuesta(true);
    setPlazoRespuestaDias(5);
    setActivo(true);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: IncidenceTypeRecord) => {
    setEditingId(item.id);
    setCodigo(item.codigo);
    setNombre(item.nombre);
    setDescripcion(item.descripcion);
    setColorBadge(item.colorBadge);
    setRequiereRespuesta(item.requiereRespuesta);
    setPlazoRespuestaDias(item.plazoRespuestaDias);
    setActivo(item.activo);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo || !nombre) {
      alert('Por favor complete los campos obligatorios (*)');
      return;
    }

    const cleanCodigo = codigo.toUpperCase().replace(/\s+/g, '_');

    let updatedList: IncidenceTypeRecord[];
    if (editingId) {
      updatedList = types.map((t) =>
        t.id === editingId
          ? {
            ...t,
            codigo: cleanCodigo,
            nombre,
            descripcion,
            colorBadge,
            requiereRespuesta,
            plazoRespuestaDias: requiereRespuesta ? Number(plazoRespuestaDias) : 0,
            activo,
          }
          : t
      );
    } else {
      const newRecord: IncidenceTypeRecord = {
        id: `it-${Date.now()}`,
        codigo: cleanCodigo,
        nombre,
        descripcion,
        colorBadge,
        requiereRespuesta,
        plazoRespuestaDias: requiereRespuesta ? Number(plazoRespuestaDias) : 0,
        activo: true,
      };
      updatedList = [newRecord, ...types];
    }

    saveTypesToStorage(updatedList);
    setIsFormOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`¿Está seguro de eliminar el Tipo de Incidencia "${name}"?`)) {
      const updatedList = types.filter((t) => t.id !== id);
      saveTypesToStorage(updatedList);
    }
  };

  const handleToggleStatus = (id: string) => {
    const updatedList = types.map((t) => (t.id === id ? { ...t, activo: !t.activo } : t));
    saveTypesToStorage(updatedList);
  };

  // Filtrado de lista
  const filteredTypes = types.filter((t) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      t.nombre.toLowerCase().includes(query) ||
      t.codigo.toLowerCase().includes(query) ||
      t.descripcion.toLowerCase().includes(query);

    let matchesEstado = true;
    if (filterEstado === 'ACTIVOS') matchesEstado = t.activo;
    else if (filterEstado === 'INACTIVOS') matchesEstado = !t.activo;

    return matchesSearch && matchesEstado;
  });

  const getColorBadgeUI = (color: IncidenceTypeRecord['colorBadge'], label: string) => {
    switch (color) {
      case 'red':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#FFDAD6] text-[#93000A] border border-[#E4BEB9]">{label}</span>;
      case 'amber':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">{label}</span>;
      case 'orange':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-300">{label}</span>;
      case 'purple':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">{label}</span>;
      case 'emerald':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">{label}</span>;
      case 'blue':
      default:
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">{label}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-5xl w-full border border-[#E2E2E2] shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">

        {/* Header Modal */}
        <div className="bg-[#91000A] text-white p-4 px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg border border-white/20">
              <Tags className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display tracking-wide uppercase">
                Registro de Tipos de Incidencia de Obra
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-red-100 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto text-xs text-[#1A1C1C]">

          {/* Subheader: Buscador, Filtro y Botón Nuevo */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F9F9F9] p-3 rounded-lg border border-[#E2E2E2]">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Buscar por Nombre, Código o Descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#8F706C]/30 rounded text-xs focus:ring-2 focus:ring-[#91000A]"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" />
              </div>

              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-[#8F706C]/30 rounded text-xs focus:ring-1 focus:ring-[#91000A]"
              >
                <option value="TODOS">Estado: Todos</option>
                <option value="ACTIVOS">🟢 Solo Activos</option>
                <option value="INACTIVOS">🔴 Inactivos</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-[#91000A] hover:bg-[#B71C1C] text-white rounded text-xs font-bold shadow-sm flex items-center justify-center space-x-1.5 transition-all w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Tipo de Incidencia</span>
            </button>
          </div>

          {/* Formulario de Registro / Edición (Inline CRUD Form) */}
          {isFormOpen && (
            <div className="bg-red-50/40 p-5 rounded-lg border-2 border-[#91000A]/30 shadow-md space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-[#91000A]/20 pb-2">
                <h3 className="text-sm font-bold font-display text-[#91000A] uppercase flex items-center space-x-2">
                  <Tag className="w-4 h-4" />
                  <span>{editingId ? 'Editar Tipo de Incidencia' : 'Registrar Nuevo Tipo de Incidencia'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-gray-500 hover:text-red-700 font-bold"
                >
                  ✕ Cancelar
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Código */}
                  <div>
                    <label className="block font-semibold text-[#5B403D] mb-1">
                      Código Único * <span className="text-[10px] text-gray-400 font-mono">(Ej: CONSULTA_TECNICA)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="EJ: ADICIONAL_OBRA"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-mono font-bold focus:ring-2 focus:ring-[#91000A]"
                    />
                  </div>

                  {/* Nombre */}
                  <div>
                    <label className="block font-semibold text-[#5B403D] mb-1">
                      Nombre Descriptivo del Tipo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Adicional / Variación de Obra"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded focus:ring-2 focus:ring-[#91000A]"
                    />
                  </div>

                  {/* Color de Insignia (Badge Color) */}
                  <div>
                    <label className="block font-semibold text-[#5B403D] mb-1">
                      Color de Insignia Visual
                    </label>
                    <select
                      value={colorBadge}
                      onChange={(e) => setColorBadge(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-semibold"
                    >
                      <option value="blue">🔵 Azul (Informativo / General)</option>
                      <option value="amber">🟡 Ámbar (Consulta Técnica)</option>
                      <option value="red">🔴 Rojo (Alerta de Riesgo)</option>
                      <option value="orange">🟠 Naranja (Observación de Campo)</option>
                      <option value="purple">🟣 Púrpura (Adicionales / Variación)</option>
                      <option value="emerald">🟢 Esmeralda (Conformidad / Cierre)</option>
                    </select>
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block font-semibold text-[#5B403D] mb-1">
                    Descripción / Alcance Técnico
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Especifique el objetivo y alcance normativo de esta categoría de asiento digital..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded focus:ring-2 focus:ring-[#91000A]"
                  />
                </div>

                {/* Opciones de Respuesta y Plazo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded border border-red-200">
                  <label className="flex items-center space-x-2 font-semibold text-[#5B403D] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiereRespuesta}
                      onChange={(e) => setRequiereRespuesta(e.target.checked)}
                      className="rounded text-[#91000A] focus:ring-[#91000A]"
                    />
                    <span>¿Requiere atención o respuesta obligatoria de la Supervisión?</span>
                  </label>

                  {requiereRespuesta && (
                    <div className="flex items-center space-x-2">
                      <label className="font-semibold text-[#5B403D]">Plazo Máximo de Respuesta (Días hábiles):</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={plazoRespuestaDias}
                        onChange={(e) => setPlazoRespuestaDias(Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-[#F9F9F9] border border-gray-300 rounded font-mono font-bold text-center"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-[#91000A]/20">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 border border-gray-400 text-gray-700 rounded font-semibold hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#91000A] text-white font-bold rounded hover:bg-[#B71C1C] shadow flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingId ? 'Guardar Cambios' : 'Registrar Tipo de Incidencia'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* GRID / TABLA DE TIPOS DE INCIDENCIA REGISTRADOS */}
          <div className="bg-white rounded-lg border border-[#E2E2E2] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#91000A] text-white uppercase font-display tracking-wider text-[11px]">
                    <th className="py-3 px-4 font-bold">Código</th>
                    <th className="py-3 px-4 font-bold">Nombre del Tipo de Incidencia</th>
                    <th className="py-3 px-4 font-bold max-w-xs">Descripción y Alcance</th>
                    <th className="py-3 px-4 font-bold text-center">Atención Requerida</th>
                    <th className="py-3 px-4 font-bold text-center">Estado</th>
                    <th className="py-3 px-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E2E2]">
                  {filteredTypes.map((t) => (
                    <tr key={t.id} className="hover:bg-red-50/30 transition-colors">
                      {/* Código */}
                      <td className="py-3 px-4 font-mono font-bold text-[#91000A]">
                        {t.codigo}
                      </td>

                      {/* Nombre & Insignia */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-gray-900">{t.nombre}</span>
                          {getColorBadgeUI(t.colorBadge, t.codigo)}
                        </div>
                      </td>

                      {/* Descripción */}
                      <td className="py-3 px-4 max-w-sm text-gray-600">
                        <p className="line-clamp-2 leading-relaxed">{t.descripcion}</p>
                      </td>

                      {/* Atención Requerida & Plazo */}
                      <td className="py-3 px-4 text-center">
                        {t.requiereRespuesta ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 inline-flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>{t.plazoRespuestaDias} Días Hábiles</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-300">
                            Solo Registro (Sin Plazo)
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(t.id)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${t.activo
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                            }`}
                          title="Clic para cambiar estado activo/inactivo"
                        >
                          {t.activo ? '🟢 ACTIVO' : '⚪ INACTIVO'}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 bg-gray-100 hover:bg-red-100 text-[#91000A] rounded border border-gray-300 transition-all inline-flex items-center"
                          title="Editar Tipo de Incidencia"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(t.id, t.nombre)}
                          className="p-1.5 bg-gray-100 hover:bg-red-700 hover:text-white text-red-600 rounded border border-gray-300 transition-all inline-flex items-center"
                          title="Eliminar Tipo de Incidencia"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredTypes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 font-medium">
                        No se encontraron tipos de incidencia registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
