# =========================================================
# DOCKERFILE - PROYECTO CUADERNO DIGITAL DE ASIENTOS GORE LAMBAYEQUE
# Multi-stage build optimizado para Next.js Standalone Mode
# =========================================================

# 1. Base Image
FROM node:20-alpine AS base

# 2. Dependencies Stage
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar manifiestos de dependencias y esquema Prisma
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Instalación limpia de dependencias
RUN npm ci

# 3. Builder Stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generar cliente de Prisma
RUN npx prisma generate

# Desactivar telemetría y establecer producción para compilación
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Compilar proyecto Next.js en modo Standalone
RUN npm run build

# 4. Runner Stage (Contenedor Final de Producción)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Crear usuario y grupo no-root por seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar directorio de archivos públicos estáticos
COPY --from=builder /app/public ./public

# Copiar compilación Standalone y archivos estáticos de Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
