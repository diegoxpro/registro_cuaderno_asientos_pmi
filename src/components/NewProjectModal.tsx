'use client';

import React, { useState } from 'react';
import { 
  X, 
  Check, 
  ArrowLeft, 
  ArrowRight, 
  Calendar as CalendarIcon, 
  UserCheck, 
  ShieldCheck, 
  Building2,
  CheckCircle2
} from 'lucide-react';
import { MockProject } from '@/lib/mockData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveProject: (newProject: MockProject) => void;
}

export default function NewProjectModal({ isOpen, onClose, onSaveProject }: Props) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Datos Generales State
  const [cui, setCui] = useState('');
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [convenio, setConvenio] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [entidadSupervisora, setEntidadSupervisora] = useState('');
  const [plazo, setPlazo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');

  // Step 2: Ubicación State
  const [provincia, setProvincia] = useState('Chiclayo');
  const [distrito, setDistrito] = useState('Chiclayo');
  const [localidad, setLocalidad] = useState('');

  // Step 3: Responsables RBAC State
  // Residente / Proyectista
  const [residenteDni, setResidenteDni] = useState('');
  const [residenteNombre, setResidenteNombre] = useState('');
  const [residenteCip, setResidenteCip] = useState('');
  const [residenteCelular, setResidenteCelular] = useState('');
  const [residenteEmail, setResidenteEmail] = useState('');
  const [residenteFirmar, setResidenteFirmar] = useState(true);

  // Supervisor
  const [supervisorDni, setSupervisorDni] = useState('');
  const [supervisorNombre, setSupervisorNombre] = useState('');
  const [supervisorCip, setSupervisorCip] = useState('');
  const [supervisorEmpresa, setSupervisorEmpresa] = useState('');
  const [supervisorEmail, setSupervisorEmail] = useState('');
  const [supervisorFirmar, setSupervisorFirmar] = useState(true);

  if (!isOpen) return null;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 1) {
      if (!cui || !nombre || !empresa) {
        alert('Por favor complete los campos obligatorios (*)');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!provincia || !distrito) {
        alert('Por favor seleccione la Provincia y Distrito (*)');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
  };

  const handleFinalSubmit = () => {
    const createdProject: MockProject = {
      id: `p-${cui || Date.now()}`,
      cui: cui || `2456${Math.floor(100 + Math.random() * 900)}`,
      nombre: nombre.toUpperCase() || 'PROYECTO DE INVERSIÓN',
      nConvenio: convenio || `CONVENIO OXI-0${Math.floor(10 + Math.random() * 90)}-2026-GR.LAMB`,
      modalidad: 'OXI LEY 29230',
      fase: 'Ejecución Física',
      entidadEjecutora: empresa || 'Empresa Ejecutora de Obra S.A.C.',
      entidadSupervisora: entidadSupervisora || 'Entidad Privada Supervisora S.A.',
      residenteNombre: residenteNombre ? `Ing. ${residenteNombre}` : null,
      residenteCIP: residenteCip ? `CIP-${residenteCip}` : null,
      supervisorNombre: supervisorNombre ? `Ing. ${supervisorNombre}` : (supervisorEmpresa || null),
      supervisorCIP: supervisorCip ? `CIP-${supervisorCip}` : null,
      estado: 'ACTIVO',
      provincia: provincia || 'Chiclayo',
      estadoObra: 'En Ejecución (Habilitado)',
      asientosCount: 0,
    };

    onSaveProject(createdProject);
    onClose();
  };

  const handleSaveDraft = () => {
    alert('Borrador del proyecto guardado localmente.');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl border border-[#E2E2E2] overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-[#E2E2E2] flex items-start justify-between bg-white">
          <div>
            <h2 className="text-xl font-bold font-display text-[#1A1C1C]">
              Registro y Asignación de Proyecto de Inversión
            </h2>
            <p className="text-xs text-[#8F706C] mt-0.5 font-sans">
              Complete los datos para habilitar el proyecto en el sistema.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-[#F3F3F3] px-6 py-4 border-b border-[#E2E2E2]">
          <div className="max-w-2xl mx-auto flex items-center justify-between relative">
            
            {/* Step 1 Indicator */}
            <div className="flex flex-col items-center relative z-10">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm transition-all ${
                  currentStep === 1
                    ? 'bg-[#91000A] text-white ring-4 ring-red-100'
                    : currentStep > 1
                    ? 'bg-[#91000A] text-white'
                    : 'bg-white text-gray-500 border border-gray-300'
                }`}
              >
                {currentStep > 1 ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
              </div>
              <span className={`text-xs font-bold mt-1.5 ${currentStep >= 1 ? 'text-[#1A1C1C]' : 'text-gray-400'}`}>
                Datos Generales
              </span>
            </div>

            {/* Connecting Line 1-2 */}
            <div className="flex-1 h-0.5 mx-2 bg-gray-200 relative -top-3">
              <div
                className="h-full bg-[#91000A] transition-all duration-300"
                style={{ width: currentStep >= 2 ? '100%' : '0%' }}
              ></div>
            </div>

            {/* Step 2 Indicator */}
            <div className="flex flex-col items-center relative z-10">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm transition-all ${
                  currentStep === 2
                    ? 'bg-[#91000A] text-white ring-4 ring-red-100'
                    : currentStep > 2
                    ? 'bg-[#91000A] text-white'
                    : 'bg-white text-gray-500 border border-gray-300'
                }`}
              >
                {currentStep > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
              </div>
              <span className={`text-xs font-bold mt-1.5 ${currentStep >= 2 ? 'text-[#1A1C1C]' : 'text-gray-400'}`}>
                Ubicación
              </span>
            </div>

            {/* Connecting Line 2-3 */}
            <div className="flex-1 h-0.5 mx-2 bg-gray-200 relative -top-3">
              <div
                className="h-full bg-[#91000A] transition-all duration-300"
                style={{ width: currentStep >= 3 ? '100%' : '0%' }}
              ></div>
            </div>

            {/* Step 3 Indicator */}
            <div className="flex flex-col items-center relative z-10">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm transition-all ${
                  currentStep === 3
                    ? 'bg-[#91000A] text-white ring-4 ring-red-100'
                    : 'bg-white text-gray-500 border border-gray-300'
                }`}
              >
                3
              </div>
              <span className={`text-xs font-bold mt-1.5 ${currentStep === 3 ? 'text-[#1A1C1C]' : 'text-gray-400'}`}>
                Responsables (RBAC)
              </span>
            </div>

          </div>
        </div>

        {/* Form Body Container */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs text-[#1A1C1C]">
          
          {/* PASO 1: Datos Generales */}
          {currentStep === 1 && (
            <form id="step-1-form" onSubmit={handleNextStep} className="space-y-4">
              
              {/* CUI */}
              <div>
                <label className="block font-bold text-[#1A1C1C] mb-1">
                  CUI <span className="text-[#91000A]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 2456789"
                  value={cui}
                  onChange={(e) => setCui(e.target.value)}
                  className="w-full max-w-sm px-3.5 py-2.5 bg-white border border-[#8F706C]/40 rounded-lg text-xs text-[#1A1C1C] focus:outline-none focus:ring-2 focus:ring-[#91000A] focus:border-transparent font-mono"
                />
              </div>

              {/* Nombre Oficial del Proyecto */}
              <div>
                <label className="block font-bold text-[#1A1C1C] mb-1">
                  Nombre Oficial del Proyecto <span className="text-[#91000A]">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Nombre completo del proyecto según expediente..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#8F706C]/40 rounded-lg text-xs text-[#1A1C1C] focus:outline-none focus:ring-2 focus:ring-[#91000A] leading-relaxed"
                />
              </div>

              {/* Monto de Inversión y N° de Convenio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#1A1C1C] mb-1">
                    Monto de Inversión (S/.) <span className="text-[#91000A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#8F706C]/40 rounded-lg text-xs text-[#1A1C1C] font-mono focus:ring-2 focus:ring-[#91000A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A1C1C] mb-1">
                    N° de Convenio de Inversión
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 045-2023"
                    value={convenio}
                    onChange={(e) => setConvenio(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#8F706C]/40 rounded-lg text-xs text-[#1A1C1C] font-mono focus:ring-2 focus:ring-[#91000A]"
                  />
                </div>
              </div>

              {/* Empresa Ejecutora de la Obra y Entidad Privada Supervisora */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#1A1C1C] mb-1">
                    Empresa Ejecutora de la Obra <span className="text-[#91000A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Cosapi S.A. / Consorcio Ejecutor"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#8F706C]/40 rounded-lg text-xs text-[#1A1C1C] focus:outline-none focus:ring-2 focus:ring-[#91000A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A1C1C] mb-1">
                    Entidad Privada Supervisora <span className="text-[#91000A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Cesel S.A. Ingenieros Consultores"
                    value={entidadSupervisora}
                    onChange={(e) => setEntidadSupervisora(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#8F706C]/40 rounded-lg text-xs text-[#1A1C1C] focus:outline-none focus:ring-2 focus:ring-[#91000A]"
                  />
                </div>
              </div>

              {/* Plazo Contractual & Fecha Inicio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#1A1C1C] mb-1">
                    Plazo Contractual (días calendario) <span className="text-[#91000A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 180"
                    value={plazo}
                    onChange={(e) => setPlazo(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#8F706C]/40 rounded-lg text-xs text-[#1A1C1C] font-mono focus:ring-2 focus:ring-[#91000A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A1C1C] mb-1">
                    Fecha de Inicio Estimada
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#8F706C]/40 rounded-lg text-xs text-[#1A1C1C] focus:ring-2 focus:ring-[#91000A]"
                    />
                    <CalendarIcon className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

            </form>
          )}

          {/* PASO 2: Ubicación */}
          {currentStep === 2 && (
            <form id="step-2-form" onSubmit={handleNextStep} className="space-y-4">
              
              {/* Provincia */}
              <div>
                <label className="block font-bold text-[#1A1C1C] mb-1">
                  Provincia <span className="text-[#91000A]">*</span>
                </label>
                <select
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#8F706C]/40 rounded-lg text-xs text-[#1A1C1C] focus:ring-2 focus:ring-[#91000A]"
                >
                  <option value="">Seleccione Provincia</option>
                  <option value="Chiclayo">Chiclayo</option>
                  <option value="Ferreñafe">Ferreñafe</option>
                  <option value="Lambayeque">Lambayeque</option>
                </select>
              </div>

              {/* Distrito y Localidad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#1A1C1C] mb-1">
                    Distrito <span className="text-[#91000A]">*</span>
                  </label>
                  <select
                    value={distrito}
                    onChange={(e) => setDistrito(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#8F706C]/40 rounded-lg text-xs text-[#1A1C1C] focus:ring-2 focus:ring-[#91000A]"
                  >
                    <option value="Chiclayo">Chiclayo</option>
                    <option value="La Victoria">La Victoria</option>
                    <option value="José Leonardo Ortiz">José Leonardo Ortiz</option>
                    <option value="Ferreñafe">Ferreñafe</option>
                    <option value="Lambayeque">Lambayeque</option>
                    <option value="Íllimo">Íllimo</option>
                    <option value="Móchumi">Móchumi</option>
                    <option value="Olmos">Olmos</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1A1C1C] mb-1">
                    Localidad / Centro Poblado
                  </label>
                  <input
                    type="text"
                    placeholder="Especifique ubicación exacta"
                    value={localidad}
                    onChange={(e) => setLocalidad(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#8F706C]/40 rounded-lg text-xs text-[#1A1C1C] focus:ring-2 focus:ring-[#91000A]"
                  />
                </div>
              </div>

            </form>
          )}

          {/* PASO 3: Responsables (RBAC) */}
          {currentStep === 3 && (
            <div className="space-y-5">
              
              {/* Seccion 1: Residente / Proyectista */}
              <div className="bg-white rounded-lg border border-[#E2E2E2] p-4 space-y-3">
                <div className="flex items-center space-x-2 text-[#91000A]">
                  <UserCheck className="w-5 h-5 text-[#91000A]" />
                  <h3 className="font-bold font-display text-sm">Residente / Proyectista</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#1A1C1C] mb-1">DNI *</label>
                    <input
                      type="text"
                      placeholder="Ingrese DNI"
                      value={residenteDni}
                      onChange={(e) => setResidenteDni(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#8F706C]/30 rounded text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1A1C1C] mb-1">Nombres Completos *</label>
                    <input
                      type="text"
                      placeholder="Nombre y Apellidos"
                      value={residenteNombre}
                      onChange={(e) => setResidenteNombre(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#8F706C]/30 rounded text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1A1C1C] mb-1">Registro CIP/CAP *</label>
                    <input
                      type="text"
                      placeholder="N° de Colegiatura"
                      value={residenteCip}
                      onChange={(e) => setResidenteCip(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#8F706C]/30 rounded text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1A1C1C] mb-1">Celular</label>
                    <input
                      type="text"
                      placeholder="Teléfono móvil"
                      value={residenteCelular}
                      onChange={(e) => setResidenteCelular(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#8F706C]/30 rounded text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-[#1A1C1C] mb-1">Correo Electrónico *</label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.pe"
                      value={residenteEmail}
                      onChange={(e) => setResidenteEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#8F706C]/30 rounded text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setResidenteFirmar(!residenteFirmar)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      residenteFirmar ? 'bg-[#91000A]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        residenteFirmar ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="font-bold text-xs text-[#1A1C1C]">Habilitado para Firmar (RBAC)</span>
                </div>
              </div>

              {/* Seccion 2: Supervisor */}
              <div className="bg-white rounded-lg border border-[#E2E2E2] p-4 space-y-3">
                <div className="flex items-center space-x-2 text-[#91000A]">
                  <ShieldCheck className="w-5 h-5 text-[#91000A]" />
                  <h3 className="font-bold font-display text-sm">Supervisor</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#1A1C1C] mb-1">DNI *</label>
                    <input
                      type="text"
                      placeholder="Ingrese DNI"
                      value={supervisorDni}
                      onChange={(e) => setSupervisorDni(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#8F706C]/30 rounded text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1A1C1C] mb-1">Nombres Completos *</label>
                    <input
                      type="text"
                      placeholder="Nombre y Apellidos"
                      value={supervisorNombre}
                      onChange={(e) => setSupervisorNombre(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#8F706C]/30 rounded text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1A1C1C] mb-1">Registro CIP/CAP *</label>
                    <input
                      type="text"
                      placeholder="N° de Colegiatura"
                      value={supervisorCip}
                      onChange={(e) => setSupervisorCip(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#8F706C]/30 rounded text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1A1C1C] mb-1">Empresa Supervisora</label>
                    <input
                      type="text"
                      placeholder="Razón social de la supervisión"
                      value={supervisorEmpresa}
                      onChange={(e) => setSupervisorEmpresa(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#8F706C]/30 rounded text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-[#1A1C1C] mb-1">Correo Electrónico *</label>
                    <input
                      type="email"
                      placeholder="correo@supervision.pe"
                      value={supervisorEmail}
                      onChange={(e) => setSupervisorEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#8F706C]/30 rounded text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setSupervisorFirmar(!supervisorFirmar)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      supervisorFirmar ? 'bg-[#91000A]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        supervisorFirmar ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="font-bold text-xs text-[#1A1C1C]">Habilitado para Firmar (RBAC)</span>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 px-6 border-t border-[#E2E2E2] bg-white flex items-center justify-between">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-3 py-2 text-[#1A1C1C] hover:text-[#91000A] font-bold text-xs flex items-center space-x-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
            ) : (
              <div></div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 border border-[#8F706C] text-[#1A1C1C] hover:bg-gray-50 rounded-lg text-xs font-bold transition-all"
            >
              Guardar como Borrador
            </button>

            {currentStep < 3 ? (
              <button
                type="submit"
                form={`step-${currentStep}-form`}
                className="px-5 py-2 bg-[#5A5A5A] hover:bg-[#404040] text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow transition-all"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-5 py-2 bg-[#91000A] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-md transition-all"
              >
                <span>Habilitar Cuaderno de Incidencias</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
