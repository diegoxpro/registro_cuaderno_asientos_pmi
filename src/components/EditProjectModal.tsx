'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Building2, 
  UserCheck, 
  ShieldCheck, 
  Archive, 
  UserX, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  User as UserIcon,
  RefreshCw
} from 'lucide-react';
import { MockProject } from '@/lib/mockData';
import { getRegisteredUsers, AppUser } from '@/lib/users';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  project: MockProject | null;
  onSaveProject: (updatedProject: MockProject) => void;
}

export default function EditProjectModal({
  isOpen,
  onClose,
  project,
  onSaveProject,
}: Props) {
  const [nombre, setNombre] = useState('');
  const [cui, setCui] = useState('');
  const [nConvenio, setNConvenio] = useState('');
  const [modalidad, setModalidad] = useState('OxI LEY 29230');
  const [fase, setFase] = useState('Ejecución Física');
  const [entidadEjecutora, setEntidadEjecutora] = useState('');
  const [entidadSupervisora, setEntidadSupervisora] = useState('');
  const [provincia, setProvincia] = useState('Chiclayo');
  const [estadoObra, setEstadoObra] = useState('En Ejecución');
  const [estado, setEstado] = useState<'ACTIVO' | 'PAUSADO' | 'CONCLUIDO'>('ACTIVO');

  // Residente Reassignment State
  const [residenteNombre, setResidenteNombre] = useState('');
  const [residenteCIP, setResidenteCIP] = useState('');
  const [selectedResidenteUserId, setSelectedResidenteUserId] = useState('');

  // Supervisor Reassignment State
  const [supervisorNombre, setSupervisorNombre] = useState('');
  const [supervisorCIP, setSupervisorCIP] = useState('');
  const [selectedSupervisorUserId, setSelectedSupervisorUserId] = useState('');

  // Registered Users for quick dropdown selection
  const [registeredUsers, setRegisteredUsers] = useState<Omit<AppUser, 'contrasena'>[]>([]);

  useEffect(() => {
    if (isOpen && project) {
      setNombre(project.nombre || '');
      setCui(project.cui || '');
      setNConvenio(project.nConvenio || '');
      setModalidad(project.modalidad || 'OxI LEY 29230');
      setFase(project.fase || 'Ejecución Física');
      setEntidadEjecutora(project.entidadEjecutora || '');
      setEntidadSupervisora(project.entidadSupervisora || '');
      setProvincia(project.provincia || 'Chiclayo');
      setEstadoObra(project.estadoObra || 'En Ejecución');
      setEstado(project.estado || 'ACTIVO');

      setResidenteNombre(project.residenteNombre || '');
      setResidenteCIP(project.residenteCIP || '');
      setSupervisorNombre(project.supervisorNombre || '');
      setSupervisorCIP(project.supervisorCIP || '');

      setSelectedResidenteUserId('');
      setSelectedSupervisorUserId('');

      // Cargar lista de usuarios para reasignar rápidamente
      const users = getRegisteredUsers();
      setRegisteredUsers(users);
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  // Filtrar residentes y supervisores del registro
  const residentesList = registeredUsers.filter(
    (u) => u.rol === 'RESIDENTE' || u.rolDisplay?.toLowerCase().includes('residente')
  );
  const supervisoresList = registeredUsers.filter(
    (u) => u.rol === 'SUPERVISOR_DE_OBRA' || u.rol === 'SUPERVISOR_DE_PROYECTO' || u.rolDisplay?.toLowerCase().includes('supervisor')
  );

  // Manejar selección rápida de Residente desde el registro
  const handleSelectResidenteUser = (userId: string) => {
    setSelectedResidenteUserId(userId);
    if (!userId) return;
    const found = registeredUsers.find((u) => u.id === userId || u.dni === userId);
    if (found) {
      setResidenteNombre(`Ing. ${found.nombre} ${found.apellidos}`);
      setResidenteCIP(found.cip || `CIP-${found.dni}`);
    }
  };

  // Manejar selección rápida de Supervisor desde el registro
  const handleSelectSupervisorUser = (userId: string) => {
    setSelectedSupervisorUserId(userId);
    if (!userId) return;
    const found = registeredUsers.find((u) => u.id === userId || u.dni === userId);
    if (found) {
      setSupervisorNombre(`Ing. ${found.nombre} ${found.apellidos}`);
      setSupervisorCIP(found.cip || `CIP-${found.dni}`);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: MockProject = {
      ...project,
      nombre: nombre.toUpperCase(),
      cui,
      nConvenio,
      modalidad,
      fase,
      entidadEjecutora,
      entidadSupervisora,
      provincia,
      estadoObra,
      estado,
      residenteNombre: residenteNombre.trim() ? residenteNombre : null,
      residenteCIP: residenteCIP.trim() ? residenteCIP : null,
      supervisorNombre: supervisorNombre.trim() ? supervisorNombre : null,
      supervisorCIP: supervisorCIP.trim() ? supervisorCIP : null,
    };

    onSaveProject(updated);
    onClose();
  };

  const handleArchiveProject = () => {
    const isAlreadyConcluido = project.estado === 'CONCLUIDO' || estado === 'CONCLUIDO';
    
    if (!isAlreadyConcluido) {
      if (!confirm(`⚠️ Requisito de Archivo (Supervisión):\n\nPara archivar este proyecto y su Cuaderno Digital de Incidencias, la obra debe estar en estado 'CONCLUIDO'.\n\n¿Desea cambiar el estado del proyecto CUI ${project.cui} a 'CONCLUIDO' y archivarlo en la sección de Archivos de Cuadernos?`)) {
        return;
      }
    } else {
      if (!confirm(`¿Está seguro de archivar el proyecto CUI ${project.cui} (${project.nombre}) y su Cuaderno Digital de Incidencias? Se trasladará a la sección 'Archivos de Cuadernos'.`)) {
        return;
      }
    }

    const userNameStr = typeof window !== 'undefined' ? (localStorage.getItem('user_name') || 'Ing. Supervisor') : 'Supervisor';
    const userRoleStr = typeof window !== 'undefined' ? (localStorage.getItem('user_role') || 'SUPERVISOR') : 'SUPERVISOR';

    const updated: MockProject = {
      ...project,
      nombre,
      cui,
      nConvenio,
      modalidad,
      fase: 'Liquidación / Archivo',
      entidadEjecutora,
      entidadSupervisora,
      provincia,
      estadoObra: 'Obra Concluida / Cuaderno Digital Archivado',
      estado: 'CONCLUIDO',
      archivado: true,
      fechaArchivado: new Date().toLocaleString(),
      archivadoPor: `${userNameStr} (${userRoleStr})`,
      residenteNombre: residenteNombre.trim() ? residenteNombre : null,
      residenteCIP: residenteCIP.trim() ? residenteCIP : null,
      supervisorNombre: supervisorNombre.trim() ? supervisorNombre : null,
      supervisorCIP: supervisorCIP.trim() ? supervisorCIP : null,
    };
    onSaveProject(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-3xl w-full border border-[#E2E2E2] shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="bg-[#91000A] text-white p-4 px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg border border-white/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display tracking-wide uppercase">
                Edición de Proyecto y Reasignación de Personal
              </h2>
              <p className="text-xs text-red-100 font-mono">
                CUI: {project.cui} — GORE Lambayeque
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-red-100 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 flex-1 overflow-y-auto text-xs">
          
          {/* Seccion 1: Datos Principales del Proyecto */}
          <div className="space-y-3 bg-[#F9F9F9] p-4 rounded-lg border border-[#E2E2E2]">
            <h3 className="font-bold text-[#91000A] uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <FileText className="w-4 h-4" />
              <span>1. Información General e Identificación del Proyecto</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* CUI */}
              <div>
                <label className="block font-semibold text-[#5B403D] mb-1">CUI (Código Único de Inversión) *</label>
                <input
                  type="text"
                  required
                  value={cui}
                  onChange={(e) => setCui(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-mono font-bold text-[#91000A]"
                />
              </div>

              {/* Convenio */}
              <div>
                <label className="block font-semibold text-[#5B403D] mb-1">N° de Convenio / Contrato</label>
                <input
                  type="text"
                  value={nConvenio}
                  onChange={(e) => setNConvenio(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-mono"
                />
              </div>

              {/* Provincia */}
              <div>
                <label className="block font-semibold text-[#5B403D] mb-1">Provincia *</label>
                <select
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-semibold"
                >
                  <option value="Chiclayo">Chiclayo</option>
                  <option value="Ferreñafe">Ferreñafe</option>
                  <option value="Lambayeque">Lambayeque</option>
                </select>
              </div>

              {/* Nombre completo */}
              <div className="col-span-full">
                <label className="block font-semibold text-[#5B403D] mb-1">Nombre Completo de la Inversión Pública *</label>
                <textarea
                  rows={2}
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-bold text-gray-900 focus:ring-2 focus:ring-[#91000A]"
                />
              </div>

              {/* Modalidad */}
              <div>
                <label className="block font-semibold text-[#5B403D] mb-1">Modalidad de Ejecución</label>
                <select
                  value={modalidad}
                  onChange={(e) => setModalidad(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded"
                >
                  <option value="OxI LEY 29230">OxI LEY 29230</option>
                  <option value="CONTRATA">CONTRATA</option>
                  <option value="ADMINISTRACIÓN DIRECTA">ADMINISTRACIÓN DIRECTA</option>
                </select>
              </div>

              {/* Fase */}
              <div>
                <label className="block font-semibold text-[#5B403D] mb-1">Fase de la Inversión</label>
                <select
                  value={fase}
                  onChange={(e) => setFase(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded"
                >
                  <option value="Ejecución Física">Ejecución Física</option>
                  <option value="Expediente Técnico">Expediente Técnico</option>
                  <option value="Liquidación">Liquidación</option>
                </select>
              </div>

              {/* Empresa Ejecutora de la Obra */}
              <div>
                <label className="block font-semibold text-[#5B403D] mb-1">
                  Empresa Ejecutora de la Obra <span className="text-[#BA1A1A]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cosapi S.A. / Consorcio Ejecutor Norte"
                  value={entidadEjecutora}
                  onChange={(e) => setEntidadEjecutora(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-semibold text-[#1A1C1C]"
                />
              </div>

              {/* Entidad Privada Supervisora */}
              <div>
                <label className="block font-semibold text-[#5B403D] mb-1">
                  Entidad Privada Supervisora <span className="text-[#BA1A1A]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cesel S.A. / Empresa Supervisora del Norte"
                  value={entidadSupervisora}
                  onChange={(e) => setEntidadSupervisora(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-semibold text-[#1A1C1C]"
                />
              </div>
            </div>
          </div>

          {/* Seccion 2: Reasignación de Residente y Supervisor */}
          <div className="space-y-3 bg-red-50/40 p-4 rounded-lg border-2 border-[#91000A]/30">
            <h3 className="font-bold text-[#91000A] uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4" />
                <span>2. Reasignación de Personal Técnico Responsable (Residente y Supervisor)</span>
              </span>
              <span className="text-[10px] bg-red-100 text-[#91000A] px-2 py-0.5 rounded font-bold border border-red-200">
                Administrador / Supervisor Permisos
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* REASIGNACIÓN DE RESIDENTE */}
              <div className="bg-white p-3.5 rounded border border-gray-300 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <strong className="text-xs text-gray-900 flex items-center space-x-1">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Residente de Obra</span>
                  </strong>
                  {residenteNombre ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Asignado
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      Sin Residente
                    </span>
                  )}
                </div>

                {/* Dropdown de Selección Rápida de Residente */}
                {registeredUsers.length > 0 && (
                  <div className="bg-emerald-50/50 p-2 rounded border border-emerald-200">
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1 flex items-center space-x-1">
                      <RefreshCw className="w-3 h-3 text-emerald-700" />
                      <span>Cargar desde Registro de Usuarios (Residente):</span>
                    </label>
                    <select
                      value={selectedResidenteUserId}
                      onChange={(e) => handleSelectResidenteUser(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded text-xs text-gray-900 font-semibold focus:ring-1 focus:ring-emerald-600"
                    >
                      <option value="">-- Seleccionar de Usuarios Registrados --</option>
                      {registeredUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} {u.apellidos} ({u.rolDisplay || u.rol}) — DNI: {u.dni} {u.cip ? `| ${u.cip}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Campos de texto de Residente */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5B403D]">Nombres y Apellidos del Residente</label>
                    <input
                      type="text"
                      placeholder="Ej: Ing. Juan Pérez Valdivia"
                      value={residenteNombre}
                      onChange={(e) => setResidenteNombre(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#8F706C]/40 rounded font-semibold text-xs text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#5B403D]">CIP / Registro Profesional</label>
                    <input
                      type="text"
                      placeholder="Ej: CIP-234891"
                      value={residenteCIP}
                      onChange={(e) => setResidenteCIP(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#8F706C]/40 rounded font-mono text-xs text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* REASIGNACIÓN DE SUPERVISOR */}
              <div className="bg-white p-3.5 rounded border border-gray-300 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <strong className="text-xs text-gray-900 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#91000A]" />
                    <span>Supervisor de Obra</span>
                  </strong>
                  {supervisorNombre ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Asignado
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      Sin Supervisor
                    </span>
                  )}
                </div>

                {/* Dropdown de Selección Rápida de Supervisor */}
                {registeredUsers.length > 0 && (
                  <div className="bg-red-50/50 p-2 rounded border border-red-200">
                    <label className="block text-[11px] font-bold text-[#91000A] mb-1 flex items-center space-x-1">
                      <RefreshCw className="w-3 h-3 text-[#91000A]" />
                      <span>Cargar desde Registro de Usuarios (Supervisor):</span>
                    </label>
                    <select
                      value={selectedSupervisorUserId}
                      onChange={(e) => handleSelectSupervisorUser(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-red-300 rounded text-xs text-gray-900 font-semibold focus:ring-1 focus:ring-[#91000A]"
                    >
                      <option value="">-- Seleccionar de Usuarios Registrados --</option>
                      {registeredUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} {u.apellidos} ({u.rolDisplay || u.rol}) — DNI: {u.dni} {u.cip ? `| ${u.cip}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Campos de texto de Supervisor */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5B403D]">Nombres / Consorcio Supervisor</label>
                    <input
                      type="text"
                      placeholder="Ej: Ing. María Torres Ugarte"
                      value={supervisorNombre}
                      onChange={(e) => setSupervisorNombre(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#8F706C]/40 rounded font-semibold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#5B403D]">CIP / Registro / Contrato Supervisión</label>
                    <input
                      type="text"
                      placeholder="Ej: CIP-198273"
                      value={supervisorCIP}
                      onChange={(e) => setSupervisorCIP(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#8F706C]/40 rounded font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Seccion 3: Estado y Archivamiento de la Obra */}
          <div className="bg-white p-4 rounded-lg border border-[#E2E2E2] space-y-3">
            <h3 className="font-bold text-[#91000A] uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <Archive className="w-4 h-4" />
              <span>3. Estado Operativo y Opción de Archivamiento</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block font-semibold text-[#5B403D] mb-1">Estado de Ejecución *</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as 'ACTIVO' | 'PAUSADO' | 'CONCLUIDO')}
                  className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-bold text-xs"
                >
                  <option value="ACTIVO">● ACTIVO (Habilitado para registro de asientos)</option>
                  <option value="PAUSADO">● PAUSADO (En paralización / Evaluación)</option>
                  <option value="CONCLUIDO">● CONCLUIDO / ARCHIVADO (Cierre de Cuaderno)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#5B403D] mb-1">Descripción del Estado de Obra</label>
                <input
                  type="text"
                  placeholder="Ej: En Ejecución Física (Avance 42.5%)"
                  value={estadoObra}
                  onChange={(e) => setEstadoObra(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded text-xs"
                />
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#E2E2E2]">
            <button
              type="button"
              onClick={handleArchiveProject}
              className="w-full sm:w-auto px-4 py-2 bg-gray-100 hover:bg-red-100 text-red-800 border border-red-300 rounded font-bold text-xs flex items-center justify-center space-x-1.5 transition-all"
            >
              <Archive className="w-4 h-4 text-red-700" />
              <span>Archivar Proyecto (Marcar Concluido)</span>
            </button>

            <div className="flex space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-400 text-gray-700 rounded font-semibold hover:bg-gray-100"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-[#91000A] text-white font-bold rounded hover:bg-[#B71C1C] shadow flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Cambios del Proyecto</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
