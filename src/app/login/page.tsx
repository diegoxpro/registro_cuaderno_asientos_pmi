'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  FileCheck2, 
  HelpCircle, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  KeyRound, 
  RefreshCw, 
  ArrowLeft, 
  Mail, 
  Sparkles
} from 'lucide-react';
import { AppUser } from '@/lib/users';
import { purgeLegacyIncidenceCache } from '@/lib/useIncidences';

// Datos del usuario que devuelve el servidor (sin contraseña)
type SessionUser = Omit<AppUser, 'contrasena'>;

export default function LoginPage() {
  const router = useRouter();
  
  // Login Steps: 'CREDENTIALS' -> 'OTP'
  const [step, setStep] = useState<'CREDENTIALS' | 'OTP'>('CREDENTIALS');

  // Credentials State
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [activeUser, setActiveUser] = useState<SessionUser | null>(null);
  const [generatedOtpCode, setGeneratedOtpCode] = useState<string>('');
  const [timerSeconds, setTimerSeconds] = useState<number>(300); // 5 minutos (300 s)
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [otpSentEmail, setOtpSentEmail] = useState<string>('');

  // Status & Messaging State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<SessionUser | null>(null);

  // Refs for 6 OTP input boxes
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer Effect for OTP Expiration (5 min) and Resend Cooldown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'OTP' && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timerSeconds]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Autofocus first OTP digit on step change
  useEffect(() => {
    if (step === 'OTP') {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Al llegar al login se cierra cualquier sesión previa (los botones "Salir" apuntan aquí)
  useEffect(() => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  }, []);

  // Paso 1: Manejar Validación de Credenciales (siempre en el servidor)
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessUser(null);
    setLoading(true);

    if (!dni.trim() || !password) {
      setErrorMessage('Por favor ingrese tanto el DNI/Usuario como la contraseña.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: dni, password }),
      });
      const apiData = await res.json();

      if (!res.ok || !apiData.success || !apiData.user) {
        setErrorMessage(apiData.error || 'Credenciales de acceso incorrectas.');
        setLoading(false);
        return;
      }

      if (apiData.requiresOtp) {
        triggerSendOtp(apiData.user);
      } else {
        completeLogin(apiData.user);
      }
    } catch (err) {
      console.error('Error al procesar credenciales:', err);
      setErrorMessage('No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.');
      setLoading(false);
    }
  };

  // Solicitar al servidor la generación y envío del código OTP
  const triggerSendOtp = (user: SessionUser) => {
    setActiveUser(user);
    setOtpDigits(['', '', '', '', '', '']);
    setGeneratedOtpCode('');
    setTimerSeconds(300);
    setResendCooldown(10); // Reducido a 10s para pruebas y reenvíos rápidos
    setOtpSentEmail(user.email);
    setLoading(false);
    setStep('OTP');

    fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.email) setOtpSentEmail(data.email);
          // Solo llega en modo desarrollo (botón "Autocompletar")
          if (data.code) setGeneratedOtpCode(data.code);
          if (!data.emailSent && data.emailErrorMessage && !data.code) setErrorMessage(data.emailErrorMessage);
        } else if (data.expired) {
          backToCredentials(data.error);
        } else {
          setErrorMessage(data.error || 'No se pudo generar el código OTP.');
        }
      })
      .catch(() => {
        setErrorMessage('No se pudo solicitar el código OTP. Intente reenviarlo.');
      });
  };

  const backToCredentials = (message?: string) => {
    setStep('CREDENTIALS');
    setActiveUser(null);
    setGeneratedOtpCode('');
    setOtpDigits(['', '', '', '', '', '']);
    setErrorMessage(message || null);
  };

  // Paso 2: Manejar Entrada y Navegación de los 6 Dígitos OTP
  const handleDigitChange = (index: number, value: string) => {
    // Aceptar solo números
    const cleanValue = value.replace(/[^0-9]/g, '');
    if (!cleanValue && value !== '') return;

    const newDigits = [...otpDigits];
    
    // Si pega múltiples dígitos en una celda
    if (cleanValue.length > 1) {
      const pastedArray = cleanValue.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pastedArray[i] || '';
      }
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pastedArray.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newDigits[index] = cleanValue;
    setOtpDigits(newDigits);

    // Auto-avanzar al siguiente casillero
    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pastedData) {
      const newDigits = pastedData.split('');
      const filled = ['', '', '', '', '', ''].map((_, i) => newDigits[i] || '');
      setOtpDigits(filled);
      const targetFocus = Math.min(pastedData.length, 5);
      inputRefs.current[targetFocus]?.focus();
    }
  };

  // Validar Código OTP Ingresado
  const handleVerifyOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const fullCode = otpDigits.join('');
    if (fullCode.length < 6) {
      setErrorMessage('Por favor ingrese los 6 dígitos del código de verificación OTP.');
      return;
    }

    if (!activeUser) return;
    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode }),
      });
      const apiData = await res.json();

      if (res.ok && apiData.success) {
        completeLogin(apiData.user || activeUser);
      } else if (apiData.expired && res.status === 401) {
        setLoading(false);
        backToCredentials(apiData.error);
      } else {
        setErrorMessage(apiData.error || 'Código OTP incorrecto o ha expirado.');
        setLoading(false);
      }
    } catch {
      setErrorMessage('No se pudo conectar con el servidor para verificar el código.');
      setLoading(false);
    }
  };

  // Reenviar OTP
  const handleResendOtp = async () => {
    if (!activeUser || resendCooldown > 0) return;
    setIsResending(true);
    setErrorMessage(null);
    await triggerSendOtp(activeUser);
    setIsResending(false);
  };


  // Finalizar Login y Guardar Sesión
  const completeLogin = (user: SessionUser) => {
    setSuccessUser(user);
    setLoading(false);

    if (typeof window !== 'undefined') {
      localStorage.setItem('user_role', user.rol);
      localStorage.setItem('user_dni', user.dni);
      localStorage.setItem('user_name', `${user.nombre} ${user.apellidos}`);
      localStorage.setItem('user_email', user.email);
      localStorage.setItem('user_id', user.id);
      localStorage.setItem('user_account', user.usuario);
      localStorage.setItem('user_2fa_verified', 'true');

      // Los asientos viven solo en la base de datos: descartar copias antiguas del navegador
      purgeLegacyIncidenceCache();
      // La configuración SMTP es general y vive en el servidor; ya no se guarda en el navegador
      // (excepto en el del administrador, hasta que la migre desde "Configuración SMTP")
      if (user.rol !== 'ADMINISTRADOR') localStorage.removeItem('app_smtp_config');

      // 🧹 LIMPIAR NOTIFICACIONES INEXISTENTES AL INICIAR SESIÓN
      const savedProjectsStr = localStorage.getItem('app_projects_list');
      const validProjectIds = new Set<string>();
      if (savedProjectsStr) {
        try {
          const parsedProj = JSON.parse(savedProjectsStr);
          if (Array.isArray(parsedProj)) {
            parsedProj.forEach((p: any) => {
              if (p.id) validProjectIds.add(p.id);
              if (p.cui) validProjectIds.add(p.cui);
            });
          }
        } catch (e) {}
      }

      const notifStr = localStorage.getItem('app_notifications_list');
      if (notifStr) {
        try {
          const parsedNotifs = JSON.parse(notifStr);
          if (Array.isArray(parsedNotifs)) {
            const validNotifs = parsedNotifs.filter((n: any) =>
              n.proyectoId && validProjectIds.has(n.proyectoId) && !n.id.startsWith('notif-10')
            );
            localStorage.setItem('app_notifications_list', JSON.stringify(validNotifs));
          } else {
            localStorage.removeItem('app_notifications_list');
          }
        } catch (e) {
          localStorage.removeItem('app_notifications_list');
        }
      }
    }

    setTimeout(() => {
      router.push('/dashboard');
    }, 800);
  };

  // Formatear segundos a MM:SS
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F9F9F9] text-[#1A1C1C]">
      {/* Top Bar Institucional GORE Lambayeque */}
      <header className="bg-[#91000A] text-white py-3 px-6 shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src="/img/logo.png"
            alt="Gobierno Regional de Lambayeque"
            className="w-10 h-10 object-contain shrink-0 rounded-full bg-white p-0.5 shadow"
          />
          <div>
            <h1 className="text-base font-bold tracking-wide uppercase font-display leading-tight">
              Gobierno Regional de Lambayeque
            </h1>
          </div>
        </div>
      </header>

      {/* Main Login Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 my-6">
        <div className="w-full max-w-md bg-white rounded-lg border border-[#E2E2E2] shadow-xl overflow-hidden transition-all duration-300">
          
          {/* Header de la tarjeta */}
          <div className="bg-[#91000A] p-6 text-white text-center relative">
            <div className="w-14 h-14 bg-white text-[#91000A] rounded-full mx-auto flex items-center justify-center shadow-lg mb-3">
              {step === 'CREDENTIALS' ? (
                <FileCheck2 className="w-8 h-8 text-[#91000A]" />
              ) : (
                <KeyRound className="w-8 h-8 text-[#91000A]" />
              )}
            </div>
            
            <h2 className="text-xl font-bold font-display">
              {step === 'CREDENTIALS' 
                ? 'Sistema de Cuaderno de Incidencias Digital' 
                : 'Verificación de Doble Factor (2FA OTP)'}
            </h2>
            {step === 'OTP' && (
              <p className="text-xs text-red-100 mt-1 font-sans">
                Ingrese el código de seguridad de 6 dígitos despachado a su correo electrónico
              </p>
            )}
          </div>

          {/* Alert messages */}
          <div className="px-6 pt-4 space-y-3">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start space-x-2 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successUser && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-800 flex items-start space-x-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">¡Autenticación 2FA exitosa! Bienvenid@ {successUser.nombre}</strong>
                  <p className="text-[11px] mt-0.5">Acceso verificado. Redirigiendo al panel principal...</p>
                </div>
              </div>
            )}
          </div>

          {/* PASO 1: Formulario de Credenciales DNI/Usuario + Contraseña */}
          {step === 'CREDENTIALS' && (
            <form onSubmit={handleCredentialsSubmit} className="p-6 space-y-4 pt-2">
              
              {/* Campo DNI / Usuario */}
              <div>
                <label htmlFor="dni-input" className="block text-xs font-semibold uppercase tracking-wider text-[#5B403D] mb-1.5">
                  DNI / Usuario registrado <span className="text-[#BA1A1A]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="dni-input"
                    type="text"
                    required
                    value={dni}
                    onChange={(e) => {
                      setDni(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Ingrese DNI o usuario (ej. admin, residente, supervisor)"
                    className="w-full pl-3 pr-9 py-2.5 bg-[#F9F9F9] border border-[#8F706C]/40 rounded text-sm text-[#1A1C1C] focus:outline-none focus:ring-2 focus:ring-[#91000A] focus:border-transparent transition-all"
                  />
                  <Lock className="w-4 h-4 text-[#8F706C] absolute right-3 top-3" />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div>
                <label htmlFor="password-input" className="block text-xs font-semibold uppercase tracking-wider text-[#5B403D] mb-1.5">
                  Contraseña de acceso <span className="text-[#BA1A1A]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••••••••"
                    className="w-full pl-3 pr-10 py-2.5 bg-[#F9F9F9] border border-[#8F706C]/40 rounded text-sm text-[#1A1C1C] focus:outline-none focus:ring-2 focus:ring-[#91000A] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#5B403D] hover:text-[#91000A] transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botón Principal: Iniciar Sesión */}
              <button
                type="submit"
                disabled={loading || Boolean(successUser)}
                className="w-full py-3 bg-[#91000A] hover:bg-[#B71C1C] disabled:bg-[#91000A]/60 text-white font-bold rounded shadow-md hover:shadow-lg transition-all text-sm uppercase tracking-wide flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>Iniciar Sesión</span>
                )}
              </button>

              {/* Enlaces de Ayuda */}
              <div className="flex items-center justify-between pt-1 text-xs text-[#5B403D]">
                <a 
                  href="#olvido" 
                  onClick={(e) => { 
                    e.preventDefault(); 
                    alert('Por favor contacte al Administrador DEAT para restablecer su clave.'); 
                  }} 
                  className="hover:underline hover:text-[#91000A]"
                >
                  ¿Olvidaste tu contraseña?
                </a>
                <a 
                  href="#soporte" 
                  onClick={(e) => { 
                    e.preventDefault(); 
                    alert('Manual de Usuario y Seguridad 2FA disponible en la sección de ayuda.'); 
                  }} 
                  className="flex items-center space-x-1 hover:underline hover:text-[#91000A]"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Manual de Usuario</span>
                </a>
              </div>
            </form>
          )}

          {/* PASO 2: Formulario de Entrada de 6 Dígitos OTP (Factor 2) */}
          {step === 'OTP' && (
            <div className="p-6 space-y-5 pt-2">
              
              {/* Info de cuenta y correo de destino */}
              <div className="bg-red-50/50 p-3 rounded-lg border border-[#91000A]/20 text-xs text-[#5B403D] space-y-1">
                <div className="flex items-center justify-between font-bold text-[#91000A]">
                  <span className="flex items-center space-x-1.5">
                    <Mail className="w-4 h-4" />
                    <span>Código enviado a:</span>
                  </span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border text-[11px]">
                    {otpSentEmail}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600">
                  Usuario autenticado: <strong>{activeUser?.nombre} {activeUser?.apellidos}</strong> ({activeUser?.rolDisplay || activeUser?.rol})
                </p>
                <p className="text-[10px] text-[#91000A] font-semibold pt-1 border-t border-red-200/60">
                  📩 Revisa tu bandeja de entrada o carpeta de Spam / Correo no deseado. Si no lo recibes, haz clic en &quot;Reenviar OTP&quot;.
                </p>
              </div>


              {/* Casilleros de los 6 dígitos OTP */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5B403D] mb-2 text-center">
                  Código de 6 dígitos <span className="text-[#BA1A1A]">*</span>
                </label>
                
                <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono bg-[#F9F9F9] border-2 border-[#8F706C]/40 rounded-md text-[#91000A] focus:outline-none focus:border-[#91000A] focus:ring-2 focus:ring-[#91000A]/20 transition-all shadow-inner"
                    />
                  ))}
                </div>
              </div>

              {/* Botón Principal de Verificación OTP */}
              <button
                type="button"
                onClick={() => handleVerifyOtpSubmit()}
                disabled={loading || Boolean(successUser) || otpDigits.join('').length < 6}
                className="w-full py-3 bg-[#91000A] hover:bg-[#B71C1C] disabled:bg-[#91000A]/50 text-white font-bold rounded shadow-md hover:shadow-lg transition-all text-sm uppercase tracking-wide flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-green-300" />
                    <span>Verificar Código e Ingresar</span>
                  </>
                )}
              </button>

              {/* Opciones de Reenvío y Contador de Expiración */}
              <div className="pt-2 border-t border-[#E2E2E2] flex items-center justify-between text-xs text-[#5B403D]">
                <button
                  type="button"
                  onClick={() => {
                    setStep('CREDENTIALS');
                    setErrorMessage(null);
                  }}
                  className="flex items-center space-x-1 hover:text-[#91000A] hover:underline transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver al inicio</span>
                </button>

                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">
                    ⏳ Expira en: <strong className="font-mono text-[#91000A]">{formatTimer(timerSeconds)}</strong>
                  </span>
                  
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isResending}
                    className="font-bold text-[#91000A] hover:underline disabled:text-gray-400 disabled:no-underline flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                    <span>
                      {resendCooldown > 0 ? `Reenviar (${resendCooldown}s)` : 'Reenviar OTP'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Oficial Institucional */}
      <footer className="bg-white border-t border-[#E2E2E2] py-4 text-center text-xs text-[#5B403D]">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-semibold text-[#1A1C1C]">
            Gobierno Regional de Lambayeque © 2026 — Plataforma Digital de Cuaderno de Incidencias
          </p>
          <p className="text-[11px] text-[#5B403D] mt-0.5">
            Sede Central: Av. Elmer Faucett S/N, Chiclayo — Perú | Teléfono: (074) 600-000
          </p>
        </div>
      </footer>
    </div>
  );
}
