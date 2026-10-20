'use client';

import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2, 
  ShieldAlert, 
  ShieldCheck,
  Mail, 
  Phone, 
  FileText, 
  Key, 
  KeyRound,
  User as UserIcon,
  Briefcase,
  Settings,
  Send,
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';
import SmtpConfigModal from '@/components/SmtpConfigModal';
import { SmtpConfig, getSmtpConfig, isSmtpConfigured } from '@/lib/smtp';

export interface UserRecord {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  cip?: string;
  email: string;
  telefono: string;
  modContrato?: string;
  usuario: string;
  contrasena: string;
  rol: 'Jefe de Proyecto' | 'Administrador' | 'Supervisor de obra' | 'Supervisor de Proyecto' | 'Residente';
  otpEnabled?: boolean;
}

const INITIAL_USERS: UserRecord[] = [
  {
    id: 'u-1',
    nombre: 'Carlos',
    apellidos: 'Mendoza Silva',
    dni: '70123456',
    cip: 'CIP-112233',
    email: 'diegomartingv@gmail.com',
    telefono: '912345678',
    modContrato: 'Nombrado 276',
    usuario: 'admin',
    contrasena: 'admin123',
    rol: 'Administrador',
    otpEnabled: false,
  },
  {
    id: 'u-jleon',
    nombre: 'Jorge',
    apellidos: 'León',
    dni: '74859612',
    cip: 'CIP-234567',
    email: 'jleon@regionlambayeque.gob.pe',
    telefono: '987654321',
    modContrato: 'CAS',
    usuario: 'jleon',
    contrasena: 'Jleon26',
    rol: 'Residente',
    otpEnabled: false,
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserManagementModal({ isOpen, onClose }: Props) {
  const [users, setUsers] = useState<UserRecord[]>(INITIAL_USERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRol, setFilterRol] = useState('TODOS');
  
  // SMTP & Notification State
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(() => getSmtpConfig());
  const [sendEmailOnSave, setSendEmailOnSave] = useState(true);
  const [sendingEmailForId, setSendingEmailForId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // State del modal de edición / creación
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string; email?: string; dni?: string; usuario?: string } | null>(null);

  // Form State
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [dni, setDni] = useState('');
  const [cip, setCip] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [modContrato, setModContrato] = useState('CAS');
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [rol, setRol] = useState<UserRecord['rol']>('Residente');
  const [otpEnabled, setOtpEnabled] = useState(true);

function parseUserRecordRole(rol?: unknown, rolDisplay?: unknown): UserRecord['rol'] {
  const disp = String(rolDisplay || '').trim();
  if (disp === 'Supervisor de Proyecto') return 'Supervisor de Proyecto';
  if (disp === 'Jefe de Proyecto') return 'Jefe de Proyecto';
  if (disp === 'Supervisor de obra') return 'Supervisor de obra';
  if (disp === 'Administrador') return 'Administrador';
  if (disp === 'Residente') return 'Residente';

  const r = String(rol || '').trim().toUpperCase();
  if (r === 'SUPERVISOR_DE_PROYECTO' || r.includes('SUPERVISOR_PROYECTO')) return 'Supervisor de Proyecto';
  if (r === 'JEFE_DE_PROYECTO' || r.includes('JEFE')) return 'Jefe de Proyecto';
  if (r === 'SUPERVISOR_DE_OBRA' || (r.includes('SUPERVISOR') && !r.includes('PROYECTO'))) return 'Supervisor de obra';
  if (r === 'ADMINISTRADOR' || r.includes('ADMIN')) return 'Administrador';
  return 'Residente';
}

  // Sincronizar usuarios desde el servidor (/api/users)
  const syncUsersFromServer = React.useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users) && data.users.length > 0) {
          const mapped: UserRecord[] = data.users.map((u: Record<string, unknown>) => ({
            id: String(u.id || `u-${Date.now()}`),
            nombre: String(u.nombre || ''),
            apellidos: String(u.apellidos || ''),
            dni: String(u.dni || ''),
            cip: u.cip ? String(u.cip) : undefined,
            email: String(u.email || ''),
            telefono: String(u.telefono || ''),
            modContrato: u.modContrato ? String(u.modContrato) : undefined,
            usuario: String(u.usuario || u.dni || ''),
            contrasena: '', // El servidor nunca devuelve contraseñas
            rol: parseUserRecordRole(u.rol, u.rolDisplay),
            otpEnabled: u.otpEnabled !== undefined ? Boolean(u.otpEnabled) : true,
          }));
          setUsers(mapped);
          if (typeof window !== 'undefined') {
            localStorage.setItem('app_registered_users', JSON.stringify(data.users));
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Servidor /api/users no disponible temporalmente, usando localStorage:', e);
    }

    // Fallback a localStorage si el servidor no responde
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_registered_users');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mapped: UserRecord[] = parsed.map((u: Record<string, unknown>) => ({
              id: String(u.id || `u-${Date.now()}`),
              nombre: String(u.nombre || ''),
              apellidos: String(u.apellidos || ''),
              dni: String(u.dni || ''),
              cip: u.cip ? String(u.cip) : undefined,
              email: String(u.email || ''),
              telefono: String(u.telefono || ''),
              modContrato: u.modContrato ? String(u.modContrato) : undefined,
              usuario: String(u.usuario || u.dni || ''),
              contrasena: '', // El servidor nunca devuelve contraseñas
              rol: parseUserRecordRole(u.rol, u.rolDisplay),
              otpEnabled: u.otpEnabled !== undefined ? Boolean(u.otpEnabled) : true,
            }));
            setUsers(mapped);
          }
        } catch (e) {
          console.error('Error al parsear usuarios guardados', e);
        }
      }
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      const config = getSmtpConfig();
      setSmtpConfig(config);
      setSendEmailOnSave(config.autoSendOnRegister);
      syncUsersFromServer();
    }
  }, [isOpen, syncUsersFromServer]);

  React.useEffect(() => {
    syncUsersFromServer();
  }, [syncUsersFromServer]);

  const saveUsersToStorage = (updatedUsers: UserRecord[]) => {
    setUsers(updatedUsers);
    if (typeof window !== 'undefined') {
      const appUsers = updatedUsers.map((u) => {
        let rolEnum: 'ADMINISTRADOR' | 'RESIDENTE' | 'SUPERVISOR_DE_OBRA' | 'JEFE_DE_PROYECTO' | 'SUPERVISOR_DE_PROYECTO' = 'RESIDENTE';
        if (u.rol === 'Administrador') rolEnum = 'ADMINISTRADOR';
        else if (u.rol === 'Supervisor de obra') rolEnum = 'SUPERVISOR_DE_OBRA';
        else if (u.rol === 'Jefe de Proyecto') rolEnum = 'JEFE_DE_PROYECTO';
        else if (u.rol === 'Supervisor de Proyecto') rolEnum = 'SUPERVISOR_DE_PROYECTO';

        return {
          ...u,
          contrasena: undefined,
          rol: rolEnum,
          rolDisplay: u.rol,
        };
      });
      localStorage.setItem('app_registered_users', JSON.stringify(appUsers));
    }
  };

  const sendUserCredentialsMail = async (userRecord: UserRecord) => {
    setSendingEmailForId(userRecord.id);
    setNotification(null);

    try {
      const res = await fetch('/api/smtp/send-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: smtpConfig,
          user: userRecord,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNotification({
          type: 'success',
          message: `Credenciales de acceso enviadas correctamente al correo ${userRecord.email}`,
        });
      } else {
        setNotification({
          type: 'error',
          message: `No se pudo despachar el correo: ${data.error || 'Error desconocido'}. Verifique la configuración SMTP.`,
        });
      }
    } catch (err: unknown) {
      console.error('Error al despachar credenciales por correo:', err);
      setNotification({
        type: 'error',
        message: 'Error de conexión o red al intentar despachar el correo de credenciales.',
      });
    } finally {
      setSendingEmailForId(null);
    }
  };

  const sendUserOtpMail = async (userRecord: UserRecord) => {
    setSendingEmailForId(`otp-${userRecord.id}`);
    setNotification(null);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: userRecord.usuario || userRecord.dni,
          email: userRecord.email,
          nombre: userRecord.nombre,
          apellidos: userRecord.apellidos,
          config: smtpConfig,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNotification({
          type: 'success',
          message: `🔑 Código OTP de 2FA generado [${data.code}] y despachado al correo ${userRecord.email}`,
        });
      } else {
        setNotification({
          type: 'error',
          message: `No se pudo despachar el OTP: ${data.error || 'Error desconocido'}.`,
        });
      }
    } catch (err) {
      console.error('Error al despachar OTP:', err);
      setNotification({
        type: 'error',
        message: 'Error de red al despachar el código de prueba OTP 2FA.',
      });
    } finally {
      setSendingEmailForId(null);
    }
  };


  if (!isOpen) return null;

  const handleOpenAddForm = () => {
    setEditingUserId(null);
    setNombre('');
    setApellidos('');
    setDni('');
    setCip('');
    setEmail('');
    setTelefono('');
    setModContrato('CAS');
    setUsuario('');
    setContrasena('');
    setRol('Residente');
    setOtpEnabled(isSmtpConfigured(smtpConfig));
    setSendEmailOnSave(smtpConfig.autoSendOnRegister);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (u: UserRecord) => {
    setEditingUserId(u.id);
    setNombre(u.nombre);
    setApellidos(u.apellidos);
    setDni(u.dni);
    setCip(u.cip || '');
    setEmail(u.email);
    setTelefono(u.telefono);
    setModContrato(u.modContrato || 'CAS');
    setUsuario(u.usuario);
    setContrasena(''); // Vacío = conservar la contraseña actual
    setRol(u.rol);
    setOtpEnabled(isSmtpConfigured(smtpConfig) && u.otpEnabled !== false);
    setSendEmailOnSave(false); // Por defecto no reenviar al editar
    setIsFormOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !apellidos || !dni || !email || !telefono) {
      alert('Por favor complete los campos obligatorios (*)');
      return;
    }

    if (!editingUserId && contrasena.trim().length < 8) {
      alert('Ingrese una contraseña de al menos 8 caracteres para el nuevo usuario.');
      return;
    }
    if (editingUserId && contrasena && contrasena.trim().length < 8) {
      alert('La nueva contraseña debe tener al menos 8 caracteres (deje el campo vacío para conservar la actual).');
      return;
    }

    if (otpEnabled && !isSmtpConfigured(smtpConfig)) {
      alert('⚠️ No es posible activar la Autenticación de Doble Factor (2FA OTP) si el Servidor SMTP no está correctamente configurado.');
      setIsSmtpModalOpen(true);
      return;
    }

    let updatedList: UserRecord[];
    let savedUser: UserRecord;

    if (editingUserId) {
      // Editar existente
      savedUser = {
        id: editingUserId,
        nombre,
        apellidos,
        dni,
        cip,
        email,
        telefono,
        modContrato,
        usuario: usuario || dni,
        contrasena,
        rol,
        otpEnabled,
      };
      updatedList = users.map((u) => u.id === editingUserId ? savedUser : u);
    } else {
      // Crear nuevo
      savedUser = {
        id: `u-${Date.now()}`,
        nombre,
        apellidos,
        dni,
        cip,
        email,
        telefono,
        modContrato,
        usuario: usuario || dni,
        contrasena,
        rol,
        otpEnabled,
      };
      updatedList = [savedUser, ...users];
    }

    saveUsersToStorage(updatedList);
    setIsFormOpen(false);

    // Persistir y sincronizar inmediatamente con el servidor
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...savedUser,
          rolDisplay: savedUser.rol,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        await syncUsersFromServer();
        setNotification({ type: 'error', message: `No se pudo guardar el usuario: ${data.error || 'Error del servidor'}` });
        return;
      }
      await syncUsersFromServer();
    } catch (apiErr) {
      console.warn('No se pudo guardar el usuario en el servidor:', apiErr);
      setNotification({ type: 'error', message: 'Error de conexión: el usuario no se guardó en el servidor.' });
      return;
    }

    // Enviar correo si está activado
    if (sendEmailOnSave) {
      if (isSmtpConfigured(smtpConfig)) {
        await sendUserCredentialsMail(savedUser);
      } else {
        setNotification({
          type: 'info',
          message: 'Usuario guardado correctamente en el servidor. Sin embargo, el servidor SMTP no está configurado para enviar correos automáticamente.',
        });
      }
    } else {
      setNotification({
        type: 'success',
        message: editingUserId ? 'Datos de usuario actualizados correctamente en el servidor.' : 'Nuevo usuario registrado y guardado exitosamente en el servidor.',
      });
    }
  };

  const handleRequestDelete = (u: UserRecord) => {
    setUserToDelete({
      id: u.id,
      name: `${u.nombre} ${u.apellidos}`.trim(),
      email: u.email,
      dni: u.dni,
      usuario: u.usuario,
    });
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    const target = userToDelete;

    // Actualizar estado local y localStorage eliminando por id, email o dni
    const updatedList = users.filter(
      (u) => u.id !== target.id && (!target.email || u.email !== target.email) && (!target.dni || u.dni !== target.dni)
    );
    saveUsersToStorage(updatedList);

    // Notificar al endpoint API para eliminar del servidor y BD
    try {
      await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: target.id,
          email: target.email,
          dni: target.dni,
          usuario: target.usuario,
        }),
      });
    } catch (err) {
      console.warn('Sincronización de eliminación API no completada:', err);
    }

    setNotification({
      type: 'success',
      message: `El usuario "${target.name}" ha sido eliminado exitosamente del sistema.`,
    });
    setUserToDelete(null);
  };

  // Filtrado de usuarios
  const filteredUsers = users.filter((u) => {
    const query = searchTerm.toLowerCase();
    const fullName = `${u.nombre} ${u.apellidos}`.toLowerCase();
    const matchesSearch =
      fullName.includes(query) ||
      u.dni.includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.cip && u.cip.toLowerCase().includes(query));

    const matchesRol = filterRol === 'TODOS' || u.rol === filterRol;
    return matchesSearch && matchesRol;
  });

  const getRolBadge = (r: UserRecord['rol']) => {
    switch (r) {
      case 'Jefe de Proyecto':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">Jefe de Proyecto</span>;
      case 'Administrador':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-900 border border-red-300">Administrador</span>;
      case 'Supervisor de obra':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">Supervisor de obra</span>;
      case 'Supervisor de Proyecto':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">Supervisor de Proyecto</span>;
      case 'Residente':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">Residente</span>;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-lg max-w-5xl w-full border border-[#E2E2E2] shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
          
          {/* Modal Header */}
          <div className="bg-[#91000A] text-white p-4 px-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg border border-white/20">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold font-display tracking-wide uppercase">
                  Administración y Registro de Usuarios
                </h2>
                <p className="text-xs text-red-100 font-sans">
                  Gestión de accesos, roles y notificaciones SMTP GORE Lambayeque
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
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            
            {/* Banner de Notificaciones de Envío */}
            {notification && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
                  notification.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : notification.type === 'error'
                    ? 'bg-red-50 text-red-900 border-red-300'
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {notification.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : notification.type === 'error' ? (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span className="font-medium">{notification.message}</span>
                </div>
                <button
                  onClick={() => setNotification(null)}
                  className="text-xs font-bold text-gray-500 hover:text-gray-800 ml-3"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Sub-header con Buscador, Filtro, Botón SMTP y Botón Nuevo */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F9F9F9] p-3 rounded-lg border border-[#E2E2E2]">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Buscar por Nombre, DNI, Email, CIP..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#8F706C]/30 rounded text-xs focus:ring-2 focus:ring-[#91000A]"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" />
                </div>

                <select
                  value={filterRol}
                  onChange={(e) => setFilterRol(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-[#8F706C]/30 rounded text-xs focus:ring-1 focus:ring-[#91000A]"
                >
                  <option value="TODOS">Rol: Todos</option>
                  <option value="Jefe de Proyecto">Jefe de Proyecto</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Supervisor de obra">Supervisor de obra</option>
                  <option value="Supervisor de Proyecto">Supervisor de Proyecto</option>
                  <option value="Residente">Residente</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                {/* Botón de Configuración SMTP */}
                <button
                  type="button"
                  onClick={() => setIsSmtpModalOpen(true)}
                  className={`px-3 py-2 rounded text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all ${
                    isSmtpConfigured(smtpConfig)
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                  title="Configurar servidor SMTP para envío de correos"
                >
                  <Settings className="w-4 h-4 text-[#91000A]" />
                  <span>Configuración SMTP</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSmtpConfigured(smtpConfig) ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                    }`}
                  />
                </button>

                {/* Botón Registrar Nuevo Usuario */}
                <button
                  type="button"
                  onClick={handleOpenAddForm}
                  className="px-4 py-2 bg-[#91000A] hover:bg-[#B71C1C] text-white rounded text-xs font-bold shadow-sm flex items-center justify-center space-x-1.5 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Registrar Nuevo Usuario</span>
                </button>
              </div>
            </div>

            {/* Formulario Inline / Modal Secundario de Registro */}
            {isFormOpen && (
              <div className="bg-red-50/40 p-5 rounded-lg border-2 border-[#91000A]/30 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-[#91000A]/20 pb-2">
                  <h3 className="text-sm font-bold font-display text-[#91000A] uppercase flex items-center space-x-2">
                    <UserIcon className="w-4 h-4" />
                    <span>{editingUserId ? 'Editar Datos de Usuario' : 'Registrar Nuevo Usuario'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="text-xs text-gray-500 hover:text-red-700 font-bold"
                  >
                    ✕ Cancelar
                  </button>
                </div>

                <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Nombre */}
                    <div>
                      <label className="block font-semibold text-[#5B403D] mb-1">Nombre *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Carlos"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded focus:ring-2 focus:ring-[#91000A]"
                      />
                    </div>

                    {/* Apellidos */}
                    <div>
                      <label className="block font-semibold text-[#5B403D] mb-1">Apellidos *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Mendoza Silva"
                        value={apellidos}
                        onChange={(e) => setApellidos(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded focus:ring-2 focus:ring-[#91000A]"
                      />
                    </div>

                    {/* DNI */}
                    <div>
                      <label className="block font-semibold text-[#5B403D] mb-1">DNI *</label>
                      <input
                        type="text"
                        required
                        maxLength={8}
                        placeholder="8 dígitos"
                        value={dni}
                        onChange={(e) => setDni(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-mono focus:ring-2 focus:ring-[#91000A]"
                      />
                    </div>

                    {/* CIP */}
                    <div>
                      <label className="block font-semibold text-[#5B403D] mb-1">CIP (Colegio de Ingenieros)</label>
                      <input
                        type="text"
                        placeholder="Ej: CIP-182930"
                        value={cip}
                        onChange={(e) => setCip(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-mono"
                      />
                    </div>

                    {/* Correo */}
                    <div>
                      <label className="block font-semibold text-[#5B403D] mb-1">Correo Electrónico *</label>
                      <input
                        type="email"
                        required
                        placeholder="correo@regionlambayeque.gob.pe"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded focus:ring-2 focus:ring-[#91000A]"
                      />
                    </div>

                    {/* Teléfono */}
                    <div>
                      <label className="block font-semibold text-[#5B403D] mb-1">Teléfono / Celular *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: 974829102"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-mono"
                      />
                    </div>

                    {/* Mod. Contrato */}
                    <div>
                      <label className="block font-semibold text-[#5B403D] mb-1">Modalidad de Contrato</label>
                      <select
                        value={modContrato}
                        onChange={(e) => setModContrato(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded"
                      >
                        <option value="CAS">CAS</option>
                        <option value="Locación de Servicios">Locación de Servicios</option>
                        <option value="Orden de Servicio">Orden de Servicio</option>
                        <option value="Nombrado DL 276">Nombrado DL 276</option>
                        <option value="Terceros">Terceros</option>
                      </select>
                    </div>

                    {/* Usuario */}
                    <div>
                      <label className="block font-semibold text-[#5B403D] mb-1">Usuario de Sistema</label>
                      <input
                        type="text"
                        placeholder="Ej: cmendoza (opcional)"
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded font-mono"
                      />
                    </div>

                    {/* Contraseña */}
                    <div>
                      <label className="block font-semibold text-[#5B403D] mb-1">Contraseña</label>
                      <input
                        type="password"
                        placeholder={editingUserId ? 'Dejar vacío para no cambiar' : 'Mínimo 8 caracteres'}
                        value={contrasena}
                        onChange={(e) => setContrasena(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#8F706C]/40 rounded"
                      />
                    </div>
                  </div>

                  {/* Rol Selector - COMBOBOX DE SELECCIÓN DE ROL */}
                  <div>
                    <label className="block font-semibold text-[#5B403D] mb-1">
                      Rol de Acceso al Sistema <span className="text-[#BA1A1A]">*</span>
                    </label>
                    <select
                      value={rol}
                      onChange={(e) => setRol(e.target.value as UserRecord['rol'])}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#8F706C]/40 rounded-md font-semibold text-xs text-[#1A1C1C] focus:outline-none focus:ring-2 focus:ring-[#91000A] focus:border-transparent transition-all shadow-sm cursor-pointer"
                    >
                      <option value="Jefe de Proyecto">Jefe de Proyecto — Acceso y supervisión global de proyectos</option>
                      <option value="Administrador">Administrador — Acceso total y gestión de usuarios</option>
                      <option value="Supervisor de obra">Supervisor de obra — Aprobación de asientos y edición</option>
                      <option value="Supervisor de Proyecto">Supervisor de Proyecto — Supervisión técnica de proyectos</option>
                      <option value="Residente">Residente — Registro de asientos y cuaderno digital</option>
                    </select>
                  </div>

                  {/* Interruptor de Autenticación de Doble Factor (2FA OTP) */}
                  <div className={`p-3 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm ${
                    isSmtpConfigured(smtpConfig) ? 'bg-white border-emerald-300' : 'bg-amber-50/80 border-amber-300'
                  }`}>
                    <label className={`flex items-center space-x-2 text-xs font-semibold ${
                      isSmtpConfigured(smtpConfig) ? 'text-[#5B403D] cursor-pointer' : 'text-gray-500 cursor-not-allowed'
                    }`}>
                      <input
                        type="checkbox"
                        disabled={!isSmtpConfigured(smtpConfig)}
                        checked={isSmtpConfigured(smtpConfig) && otpEnabled}
                        onChange={(e) => {
                          if (!isSmtpConfigured(smtpConfig)) {
                            alert('⚠️ Para activar la Autenticación de Doble Factor (2FA OTP) es obligatorio configurar primero el servidor SMTP.');
                            return;
                          }
                          setOtpEnabled(e.target.checked);
                        }}
                        className="rounded text-[#91000A] focus:ring-[#91000A] w-4 h-4 disabled:opacity-50"
                      />
                      <span className="flex items-center space-x-1.5">
                        <KeyRound className={`w-4 h-4 ${isSmtpConfigured(smtpConfig) ? 'text-emerald-700' : 'text-amber-700'}`} />
                        <span>Requerir Autenticación de Doble Factor (2FA OTP) para inicio de sesión</span>
                      </span>
                    </label>

                    <div className="flex items-center space-x-2 shrink-0">
                      {!isSmtpConfigured(smtpConfig) ? (
                        <button
                          type="button"
                          onClick={() => setIsSmtpModalOpen(true)}
                          className="text-[11px] text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded border border-amber-400 font-bold transition-colors flex items-center space-x-1"
                          title="Haga clic para configurar el Servidor SMTP"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                          <span>⚠️ Configurar SMTP para Activar 2FA</span>
                        </button>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          otpEnabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-gray-100 text-gray-600 border border-gray-300'
                        }`}>
                          {otpEnabled ? '🛡️ 2FA OTP Activo' : '⚪ 2FA Desactivado'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Interruptor de Envío SMTP por Correo */}
                  <div className="bg-white p-3 rounded border border-red-200 flex items-center justify-between shadow-sm">
                    <label className="flex items-center space-x-2 text-xs font-semibold text-[#5B403D] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendEmailOnSave}
                        onChange={(e) => setSendEmailOnSave(e.target.checked)}
                        className="rounded text-[#91000A] focus:ring-[#91000A]"
                      />
                      <span className="flex items-center space-x-1.5">
                        <Mail className="w-4 h-4 text-[#91000A]" />
                        <span>Enviar credenciales de acceso al correo consignado ({email || 'correo@dominio.pe'})</span>
                      </span>
                    </label>

                    {!isSmtpConfigured(smtpConfig) && (
                      <button
                        type="button"
                        onClick={() => setIsSmtpModalOpen(true)}
                        className="text-[11px] text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded border border-amber-300 font-bold transition-colors"
                      >
                        ⚠️ Configurar SMTP requerida
                      </button>
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
                      <UserPlus className="w-4 h-4" />
                      <span>{editingUserId ? 'Actualizar Usuario' : 'Guardar y Despachar Credenciales'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tabla de Usuarios Registrados */}
            <div className="bg-white rounded-lg border border-[#E2E2E2] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#91000A] text-white uppercase font-display tracking-wider text-[11px]">
                      <th className="py-3 px-4 font-bold">Usuario / DNI</th>
                      <th className="py-3 px-4 font-bold">Nombres y Apellidos</th>
                      <th className="py-3 px-4 font-bold">Contacto (Correo & Teléfono)</th>
                      <th className="py-3 px-4 font-bold">CIP / Mod. Contrato</th>
                      <th className="py-3 px-4 font-bold text-center">Rol Asignado</th>
                      <th className="py-3 px-4 font-bold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E2E2]">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="py-3 px-4 font-mono">
                          <strong className="text-[#91000A] text-xs block">{u.usuario || u.dni}</strong>
                          <span className="text-[10px] text-gray-500">DNI: {u.dni}</span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-xs text-gray-900">{u.nombre} {u.apellidos}</div>
                        </td>

                        <td className="py-3 px-4 space-y-0.5">
                          <div className="flex items-center space-x-1 text-gray-700">
                            <Mail className="w-3 h-3 text-[#91000A]" />
                            <span>{u.email}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-500 text-[11px]">
                            <Phone className="w-3 h-3" />
                            <span>{u.telefono}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 space-y-0.5">
                          <span className="font-mono text-gray-800 block">{u.cip || 'S/N'}</span>
                          <span className="text-[10px] text-gray-500">{u.modContrato || 'N/A'}</span>
                        </td>

                        <td className="py-3 px-4 text-center space-y-1">
                          {getRolBadge(u.rol)}
                          {u.otpEnabled !== false ? (
                            <div className="flex items-center justify-center space-x-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>2FA OTP Activo</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-1 text-[10px] text-gray-500 font-bold bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                              <span>⚪ 2FA Desactivado</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => sendUserOtpMail(u)}
                            disabled={sendingEmailForId === `otp-${u.id}`}
                            className="p-1.5 bg-gray-100 hover:bg-amber-50 text-amber-800 hover:text-amber-900 rounded border border-gray-300 transition-all disabled:opacity-50 inline-flex items-center"
                            title="Probar y enviar código OTP 2FA por correo"
                          >
                            {sendingEmailForId === `otp-${u.id}` ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                            ) : (
                              <KeyRound className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => sendUserCredentialsMail(u)}
                            disabled={sendingEmailForId === u.id}
                            className="p-1.5 bg-gray-100 hover:bg-emerald-50 text-emerald-700 hover:text-emerald-900 rounded border border-gray-300 transition-all disabled:opacity-50 inline-flex items-center"
                            title="Reenviar credenciales de acceso por correo"
                          >
                            {sendingEmailForId === u.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(u)}
                            className="p-1.5 bg-gray-100 hover:bg-red-100 text-[#91000A] rounded border border-gray-300 transition-all inline-flex items-center"
                            title="Editar Usuario"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestDelete(u)}
                            className="p-1.5 bg-gray-100 hover:bg-red-100 text-red-700 hover:text-red-900 rounded border border-gray-300 transition-all inline-flex items-center"
                            title="Eliminar Usuario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-[#F9F9F9] p-3 border-t text-xs text-gray-500 flex justify-between items-center">
                <span>Total de usuarios registrados: <strong>{users.length}</strong></span>
                <span>GORE Lambayeque — Sistema de Incidencias Digital</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Modal de Confirmación de Eliminación de Usuario */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full border border-red-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-[#91000A] text-white p-4 px-5 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-bold border border-white/20">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-display uppercase tracking-wide">
                  Confirmar Eliminación
                </h3>
                <p className="text-[11px] text-red-100">
                  Esta acción es irreversible
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs text-gray-700">
              <p>
                ¿Está seguro de que desea eliminar al usuario <strong className="text-gray-900 font-bold">{userToDelete.name}</strong>?
              </p>
              {userToDelete.email && (
                <div className="bg-red-50 p-2.5 rounded border border-red-200 text-[11px] text-red-900 space-y-1">
                  <div><strong>Correo:</strong> {userToDelete.email}</div>
                  {userToDelete.dni && <div><strong>DNI:</strong> {userToDelete.dni}</div>}
                </div>
              )}
              <p className="text-gray-500 text-[11px]">
                El usuario perderá inmediatamente todos los permisos y credenciales de acceso al sistema.
              </p>
            </div>

            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, Eliminar Usuario</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Secundario de Configuración SMTP */}
      <SmtpConfigModal
        isOpen={isSmtpModalOpen}
        onClose={() => setIsSmtpModalOpen(false)}
        onConfigSaved={(updatedConfig) => {
          setSmtpConfig(updatedConfig);
          setSendEmailOnSave(updatedConfig.autoSendOnRegister);
        }}
      />
    </>
  );
}
