# Sistema de Cuaderno de Incidencias Digital — GORE Lambayeque (Obras por Impuestos)

> Archivo de contexto de proyecto para Antigravity. Describe el producto, las pantallas ya diseñadas, el sistema de diseño extraído del prototipo HTML y el modelo de datos inferido, para que el agente pueda generar código consistente con lo ya construido.

## 1. Contexto y objetivo

Plataforma institucional del **Gobierno Regional de Lambayeque** para la gestión del portafolio de proyectos de inversión ejecutados bajo la modalidad **Obras por Impuestos (Ley N° 29230)**, y para llevar de forma digital el **Cuaderno de Incidencias** de cada obra (equivalente digital y con valor de declaración jurada del cuaderno de obra físico exigido por normativa de OxI / D.S. N° 038-2026-EF).

Objetivos principales:
- Centralizar el seguimiento de todos los proyectos de inversión de la región (expediente técnico, ejecución, liquidación).
- Digitalizar el registro de asientos (incidencias) de obra: residente y supervisor dejan constancia cronológica y correlativa de hechos relevantes.
- Dar trazabilidad y alertar sobre incidencias pendientes de respuesta, riesgos y observaciones técnicas.
- Permitir exportación oficial del cuaderno completo en PDF.

## 2. Módulos / pantallas identificadas

### 2.1 Login (`Iniciar Sesión`)
- Título: "Sistema de Cuaderno de Incidencias Digital".
- Campos: **Perfil de Acceso** (select), **DNI / Usuario**, **Contraseña** (con toggle mostrar/ocultar).
- Botón primario "Ingresar", opción alterna "Ingresar con Certificado Digital / Firma Digital".
- Enlaces: "¿Olvidaste tu contraseña?", "Manual de Usuario / Soporte".
- Aviso legal fijo en el pie: el sistema registra con carácter de **declaración jurada** toda incidencia vinculada a la Ley 29230.
- Footer institucional: Portal de Transparencia, Términos y Condiciones, Política de Privacidad.

### 2.2 Dashboard — "Cartera de Proyectos de Inversión"
- Header con breadcrumb (Inicio > Cartera de Proyectos), usuario logueado ("ADMINISTRADOR - DEAT"), notificaciones, ajustes, cerrar sesión.
- 4 tarjetas KPI:
  - Total Proyectos Activos (42)
  - Expedientes Técnicos en Elaboración (15)
  - Obras en Ejecución / Avance Físico Activo (18)
  - Incidencias Pendientes / Requieren Atención Inmediata (7) — resaltada en rojo/alerta.
- Acciones: "Carga Masiva (Excel/CSV)" + "Descargar Plantilla", "Nuevo Proyecto (CUI)".
- Buscador ("Buscar por CUI, Nombre o Financiera...") + filtros: Fase, Estado, Provincia, más botón de filtro avanzado.
- Tabla de proyectos con columnas:
  - **CUI** (Código Único de Inversión)
  - **Nombre del Proyecto** + N° de convenio
  - **Modalidad / Fase** (badges: `OXI LEY 29230`, `ADM. DIRECTA`, `CONTRATA`) + sub-etiqueta de fase (Ejecución Física, Expediente Técnico, Liquidación)
  - **Ejecución & Supervisión**: Entidad ejecutora (E:), Residente (R:), Supervisor (S:) — con alerta en rojo si falta residente/supervisor asignado
  - **Estado** (badges: Activo=verde, Pausado=ámbar, Concluido=gris)
  - **Acciones**
- Paginación ("Mostrando 1-10 de 42 resultados").

### 2.3 Detalle de proyecto — "Cuaderno de Incidencias Digital" (vista tipo timeline)
- Layout con sidebar lateral izquierdo: Inicio, Cartera CUI, Adjudicaciones, Seguimiento, Archivo, Portal Transparencia, Ayuda.
- Topbar: Dashboard, Proyectos, Inversiones (activo), Reportes, "Asignar Proyecto", Notificaciones.
- Cabecera del proyecto (banda roja institucional): CUI, nombre del proyecto, residente de obra asignado, badge de **Estado de Obra** (p. ej. "En Ejecución").
- Acciones: "Registrar Nuevo Asiento", "Exportar Cuaderno Completo (PDF Oficial)".
- Filtros del cuaderno: Tipo de Incidencia, Rango de Fechas (desde/hasta), Autor.
- **Timeline vertical de asientos**, cada uno con:
  - N° de asiento correlativo + fecha/hora de registro
  - Badge de tipo: `Riesgo`, `Consulta Técnica`, `Observación`, etc.
  - Título del asiento (en mayúsculas)
  - Extracto del contenido (texto enriquecido)
  - Autor (avatar con iniciales, nombre, cargo/CIP)
  - Adjuntos (N° de anexos/fotos/planos)
  - Estado de gestión del asiento: `Pendiente de Respuesta (Quedan N días)`, `Atendido por Supervisión en Asiento N° X`, `Asiento Informativo (Sin acción requerida)`
  - Botón "Ver Detalle" / "Ver Detalle / Responder"

### 2.4 Formulario — "Nuevo Asiento" (`code.html`)
- Título dinámico: "Nuevo Asiento - Asiento Correlativo Automático N° {n}" (correlativo autogenerado, no editable).
- Campo **Tipo de Incidencia** (select).
- Checkbox **"Es respuesta a un asiento anterior"** → al marcarlo despliega un selector adicional (`selectorAsiento`) para elegir el asiento que se responde (correlación/hilo de respuestas).
- Campo **Título del Asiento** (texto, forzado a mayúsculas, placeholder orientativo).
- Editor de texto enriquecido (RTE) para el contenido del asiento: negrita, cursiva, lista con viñetas, lista numerada; contador de caracteres (máx. 4000).
- Sección **Archivos Adjuntos** (subida de fotos/planos/documentos).
- Panel lateral **"Guía de Registro"** con ayuda contextual para el usuario.
- Acciones al pie: Cancelar, Guardar como borrador, Registrar Asiento (primario).

## 3. Roles de usuario (inferidos)

| Rol | Permisos aproximados |
|---|---|
| Administrador (p. ej. DEAT) | Ve cartera completa, crea proyectos, carga masiva, asigna residentes/supervisores |
| Residente de Obra | Registra asientos en el cuaderno de su(s) proyecto(s) asignado(s) |
| Supervisor | Registra asientos, responde/atiende asientos de riesgo o consulta técnica del residente |
| Consulta / Transparencia | Acceso de solo lectura vía Portal de Transparencia |

## 4. Modelo de datos (entidades inferidas)

**Proyecto**
- `cui` (Código Único de Inversión)
- `nombre`, `nConvenio`
- `modalidad` (OxI Ley 29230 / Administración Directa / Contrata)
- `fase` (Expediente Técnico / Ejecución Física / Liquidación)
- `entidadEjecutora`, `residenteNombre`, `residenteCIP`, `supervisorNombre`/`empresaSupervisora`
- `estado` (Activo / Pausado / Concluido)
- `provincia`
- `estadoObra` (En Ejecución, etc.)

**AsientoIncidencia**
- `numeroCorrelativo` (autogenerado por proyecto)
- `proyectoId`
- `tipoIncidencia` (Riesgo, Consulta Técnica, Observación, Informativo, …)
- `titulo`
- `contenido` (rich text, máx. 4000 caracteres)
- `fechaHora`
- `autorNombre`, `autorCargo`, `autorCIP`
- `adjuntos[]`
- `esRespuestaDe` (referencia opcional a otro asiento — hilo de respuestas)
- `estadoGestion` (Pendiente de Respuesta [+ plazo en días], Atendido por Supervisión [+ ref. asiento], Asiento Informativo)

**Usuario**
- `perfilAcceso` (rol)
- `dni`, `contraseña` / `certificadoDigital`

## 5. Sistema de diseño (extraído del prototipo `code.html`)

Basado en tokens de **Material Design 3**, tema institucional en rojo (identidad del Gobierno Regional).

### Tipografía
- Encabezados / display: **Plus Jakarta Sans** (600–700)
- Cuerpo / labels / captions: **Atkinson Hyperlegible Next** (400–600)
- Íconos: **Material Symbols Outlined**

Escalas: `display-lg` 48px/56px, `headline-lg` 32px/40px, `headline-lg-mobile` 28px/36px, `headline-md` 24px/32px, `body-lg` 18px/28px, `body-md` 16px/24px, `label-md` 14px/20px, `caption` 12px/16px.

### Color (modo claro)
- `primary` `#91000A` · `on-primary` `#FFFFFF` · `primary-container` `#B71C1C` · `on-primary-container` `#FFCAC4`
- `error` `#BA1A1A` · `error-container` `#FFDAD6` · `on-error-container` `#93000A`
- `background`/`surface` `#F9F9F9` · `on-surface` `#1A1C1C` · `on-surface-variant` `#5B403D`
- `outline` `#8F706C` · `outline-variant` `#E4BEB9`
- `surface-container-lowest` `#FFFFFF` → `surface-container-highest` `#E2E2E2` (escala de grises para tarjetas/paneles)
- `secondary` `#5F5E5E` · `tertiary` `#444646` (grises neutros para info secundaria)

### Layout / espaciado
- Ancho máx. de contenedor: `1280px`; gutter `24px`; margen desktop `40px` / mobile `16px`.
- Escala de espaciado base `8px` (`stack-sm` 8px, `stack-md` 16px, `stack-lg` 32px).
- Radios: `DEFAULT` 2px, `lg` 4px, `xl` 8px, `full` 12px (esquinas suaves, no pill completo).

### Componentes recurrentes
- Tarjetas KPI con ícono a la derecha, número grande y etiqueta descriptiva debajo.
- Badges de estado con color semántico (verde=activo/atendido, ámbar=pausado/pendiente, rojo=alerta/riesgo, gris=concluido/informativo).
- Timeline vertical con línea guía y puntos (círculo relleno = ítem más reciente).
- Banda de cabecera en `primary` para contexto de proyecto (CUI + nombre + responsable).
- Toolbar de RTE simple (negrita, cursiva, listas) sobre textarea.

## 6. Stack técnico observado
- HTML + **Tailwind CSS** (vía CDN, con `tailwind.config` extendido para los tokens M3 de arriba).
- Google Fonts: Plus Jakarta Sans, Atkinson Hyperlegible Next, Material Symbols Outlined.
- Prototipo generado como maqueta estática (sin framework JS todavía) — ideal punto de partida para migrar a un stack de producción (React/Next, Vue, etc.).

## 7. Pendientes / próximos pasos sugeridos
- Definir backend y modelo de autenticación (incluye login con certificado/firma digital).
- Implementar generación de PDF oficial del cuaderno de incidencias (con valor legal / declaración jurada).
- Definir reglas de plazos para "Pendiente de Respuesta" (cálculo de días restantes) y notificaciones.
- Definir permisos por rol para creación/edición/atención de asientos.
- Carga masiva de proyectos vía Excel/CSV: definir plantilla y validaciones.
