#!/usr/bin/env bash
#
# Despliegue con interrupción mínima (se ejecuta en el servidor, dentro de la carpeta de la app).
#   1. Copia de seguridad (BD, storage, .env, adjuntos)
#   2. git pull
#   3. Cambios de esquema de la BD (prisma db push) y cliente Prisma
#   4. Compila en .next-nuevo MIENTRAS la versión actual sigue atendiendo
#   5. Intercambia .next-nuevo -> .next y reinicia pm2 (corte de 1-2 segundos)
# Si la compilación falla, la versión actual sigue funcionando sin cambios.
#
# Uso: scripts/deploy.sh
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PM2_NAME="${PM2_NAME:-registro_cuaderno_asientos}"
cd "$APP_DIR"

step() { echo; echo "==> $*"; }

step "Copia de seguridad"
scripts/backup-diario.sh | tail -1

step "Actualizando código"
git pull --ff-only
git log --oneline -1

step "Dependencias"
npm install --no-audit --no-fund | tail -1

step "Esquema de base de datos"
npx prisma db push --skip-generate
npx prisma generate | grep -i generated

step "Compilando versión nueva (la actual sigue en servicio)"
rm -rf .next-nuevo
NEXT_DIST_DIR=.next-nuevo npm run build
# Next reescribe estos archivos para la carpeta alternativa: restaurarlos para no bloquear futuros git pull
git checkout -- tsconfig.json next-env.d.ts

step "Activando versión nueva"
rm -rf .next-anterior
[ -d .next ] && mv .next .next-anterior
mv .next-nuevo .next
pm2 restart "$PM2_NAME" --update-env | grep -E "✓|error" || true

sleep 3
if pm2 describe "$PM2_NAME" | grep -q "status.*online"; then
  echo "Despliegue completado. Versión anterior conservada en .next-anterior"
else
  echo "ERROR: la app no quedó en línea. Revertir con: rm -rf .next && mv .next-anterior .next && pm2 restart $PM2_NAME"
  exit 1
fi
