# 🏛️ Sistema de Cuaderno de Incidencias Digital — GORE Lambayeque

Plataforma institucional del **Gobierno Regional de Lambayeque** para la gestión del portafolio de proyectos de inversión pública y obras ejecutadas bajo la modalidad de **Obras por Impuestos (Ley N° 29230)**, permitiendo llevar de forma digital el **Cuaderno de Incidencias y Asientos de Obra** con trazabilidad y valor probatorio.

---

## 🚀 Tecnologías Utilizadas

- **Frontend / Framework:** [Next.js 15 (App Router)](https://nextjs.org/) con [React 19](https://react.dev/)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/) & Lucide Icons
- **Base de Datos / ORM:** [PostgreSQL](https://www.postgresql.org/) y [Prisma ORM 6](https://www.prisma.io/)
- **Contenedores:** [Docker](https://www.docker.com/) & Docker Compose
- **Seguridad:** Autenticación de doble factor (2FA OTP) vía correo electrónico SMTP

---

## 🔑 Acceso Inicial por Defecto (Administrador)

Al inicializar la base de datos limpia con el seed, el sistema cuenta únicamente con la cuenta de Administrador:

| Campo | Credencial |
| :--- | :--- |
| **URL de Acceso** | `/login` (`http://localhost:3000/login`) |
| **Usuario / DNI** | `admin` *(o también el DNI: `70123456`)* |
| **Contraseña** | `admin123` |
| **Nombre** | Carlos Mendoza Silva |
| **Rol** | `ADMINISTRADOR` |

> 💡 **Nota sobre 2FA OTP:** Al ingresar credenciales, el sistema solicita un código de verificación. En modo desarrollo / demostración, la pantalla muestra el código generado con el botón **"Autocompletar"** para agilizar las pruebas locales.

---

## ⚙️ Puesta en Marcha en Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/diegoxpro/registro_cuaderno_asientos_pmi.git
cd registro_cuaderno_asientos_pmi
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` a partir de la plantilla:
```bash
cp .env.example .env
```
Ajusta tu cadena de conexión PostgreSQL en `DATABASE_URL`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cuaderno_db?schema=public"
```

### 4. Inicializar Base de Datos con Prisma
```bash
# Sincronizar el esquema con la base de datos
npx prisma db push

# Poblar el usuario administrador inicial
npm run prisma:seed
```

### 5. Iniciar servidor de desarrollo
```bash
npm run dev
```
Abre en tu navegador: [http://localhost:3000](http://localhost:3000)

---

## 🐳 Despliegue con Docker Compose

Para desplegar la aplicación completa junto con el contenedor de PostgreSQL 16:

```bash
docker compose up --build -d
```

Para detener los contenedores:
```bash
docker compose down
```

---

## 📁 Estructura del Proyecto

```text
├── prisma/
│   ├── schema.prisma          # Esquema de base de datos relacional
│   └── seed.ts                # Semilla con usuario admin inicial
├── src/
│   ├── app/
│   │   ├── api/               # Endpoints REST (auth, OTP, backup, users)
│   │   ├── asignacion-proyectos/ # Asignación de ingenieros a proyectos
│   │   ├── dashboard/         # Tablero principal de proyectos
│   │   ├── login/             # Pantalla de acceso institucional con 2FA
│   │   └── proyectos/         # Gestión de cuaderno de incidencias y asientos
│   ├── components/            # Componentes UI reutilizables y modales
│   └── lib/                   # Clientes de BD, utilidades y helpers de auth
├── storage/
│   └── backups/               # Directorio local para respaldos de base de datos
├── docker-compose.yml         # Orquestación de contenedores
├── Dockerfile                 # Construcción multi-etapa optimizada
└── README.md
```

---

## 📄 Licencia

Desarrollado para el **Gobierno Regional de Lambayeque** — Dirección / Gerencia de Infraestructura y Obras. Todos los derechos reservados.
