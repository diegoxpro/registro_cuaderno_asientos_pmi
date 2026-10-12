# 🐳 Guía de Despliegue con Docker — Cuaderno Digital de Asientos (GORE Lambayeque)

Este proyecto cuenta con una configuración **multi-etapa (multi-stage build)** optimizada para entorno de producción en Docker utilizando el modo `standalone` de **Next.js 15**.

---

## 📋 Requisitos Previos

- **Docker Desktop** instalado (versión 20.10 o superior).
- **Docker Compose** (versión 2.0+).

---

## 🚀 Opciones de Despliegue

### Opción A: Despliegue Completo con Docker Compose (Recomendado)

Esta opción levanta automáticamente el **servidor web Next.js** y el **servidor de base de datos PostgreSQL 16** con volumen persistente.

1. **Clonar/Abrir el proyecto** en la terminal.
2. **Iniciar el stack de contenedores**:
   ```bash
   docker compose up --build -d
   ```
3. **Verificar que los servicios estén corriendo**:
   ```bash
   docker compose ps
   ```
4. **Acceder a la aplicación**:
   Abrir en el navegador: [http://localhost:3000](http://localhost:3000)

5. **Para detener los contenedores**:
   ```bash
   docker compose down
   ```

---

### Opción B: Construcción e Impulso Manual de la Imagen Docker

Si prefieres construir la imagen para un registro como **Docker Hub**, **AWS ECR** o **Google Artifact Registry**:

1. **Construir la imagen de producción**:
   ```bash
   docker build -t gore-cuaderno-asientos:latest .
   ```

2. **Ejecutar el contenedor standalone**:
   ```bash
   docker run -d \
     --name gore_cuaderno_app \
     -p 3000:3000 \
     -e NODE_ENV=production \
     -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/cuaderno_db?schema=public" \
     gore-cuaderno-asientos:latest
   ```

---

## 🔧 Comandos Útiles de Administración Docker

- **Ver logs en tiempo real de la aplicación**:
  ```bash
  docker compose logs -f web
  ```

- **Ejecutar migraciones o seed de Prisma dentro del contenedor**:
  ```bash
  docker compose exec web npx prisma db push
  ```

- **Acceder a la terminal del contenedor**:
  ```bash
  docker compose exec web sh
  ```

---

## 🔒 Buenas Prácticas de Seguridad Incluidas

- **Non-root user**: La aplicación corre bajo el usuario sin privilegios `nextjs` (UID 1001).
- **Multi-stage build**: Las herramientas de desarrollo y código fuente no quedan expuestas en la imagen final.
- **Modo Standalone**: Next.js empaqueta únicamente las dependencias estrictamente necesarias, reduciendo significativamente el tamaño de la imagen.
