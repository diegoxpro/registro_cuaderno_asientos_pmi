#!/usr/bin/env bash
#
# Copia de seguridad diaria del Cuaderno de Incidencias Digital (producción).
#
# Guarda en $BACKUP_ROOT/<AAAA-MM-DD>/:
#   - cuaderno_db.sql.gz  volcado completo de PostgreSQL (contenedor Docker)
#   - storage.tar.gz      carpeta storage/ de la app
#   - env                 archivo .env (permisos 600)
#   - uploads/            adjuntos; incremental con enlaces duros respecto al día anterior
#                         (cada día se ve completo, pero solo ocupa lo que cambió)
# Conserva RETENTION_DAYS días. Registra en $BACKUP_ROOT/backup.log.
#
# Uso: scripts/backup-diario.sh          (lo ejecuta cron a diario)
# Restaurar BD: gunzip -c cuaderno_db.sql.gz | docker exec -i <contenedor> psql -U postgres -d <bd>
#
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/registro_cuaderno_asientos_pmi}"
BACKUP_ROOT="${BACKUP_ROOT:-$HOME/backups_diarios}"
DB_CONTAINER="${DB_CONTAINER:-gore_cuaderno_asientos_db}"
DB_NAME="${DB_NAME:-cuaderno_db}"
DB_USER="${DB_USER:-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TODAY="$(date +%F)"
DEST="$BACKUP_ROOT/$TODAY"
LOG="$BACKUP_ROOT/backup.log"

mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"
umask 077

log() { echo "[$(date '+%F %T %Z')] $*" | tee -a "$LOG"; }
trap 'log "ERROR: la copia falló en la línea $LINENO (código $?)."' ERR

# Evitar dos ejecuciones simultáneas
exec 9>"$BACKUP_ROOT/.lock"
if ! flock -n 9; then
  log "Otra copia está en curso; se omite esta ejecución."
  exit 0
fi

log "Inicio de copia en $DEST"
mkdir -p "$DEST"

# 1. Base de datos: volcar a archivo temporal y validar antes de darlo por bueno
DB_TMP="$DEST/cuaderno_db.sql.gz.tmp"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner | gzip -9 > "$DB_TMP"
gzip -t "$DB_TMP"
if ! gunzip -c "$DB_TMP" | grep -q 'PostgreSQL database dump complete'; then
  log "ERROR: el volcado de la base de datos está incompleto."
  exit 1
fi
mv "$DB_TMP" "$DEST/cuaderno_db.sql.gz"
log "Base de datos: $(du -h "$DEST/cuaderno_db.sql.gz" | cut -f1)"

# 2. storage/ y .env
tar -czf "$DEST/storage.tar.gz" -C "$APP_DIR" storage
cp "$APP_DIR/.env" "$DEST/env"
chmod 600 "$DEST/env"
log "storage/: $(du -h "$DEST/storage.tar.gz" | cut -f1)"

# 3. Adjuntos: incremental con enlaces duros respecto a la copia anterior
mkdir -p "$APP_DIR/uploads"
PREV="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20??-??-??' ! -name "$TODAY" | sort | tail -n 1)"
LINK_DEST=()
if [[ -n "$PREV" && -d "$PREV/uploads" ]]; then
  LINK_DEST=(--link-dest="$PREV/uploads")
fi
rsync -a --delete "${LINK_DEST[@]}" "$APP_DIR/uploads/" "$DEST/uploads/"
log "Adjuntos: $(find "$DEST/uploads" -type f | wc -l) archivos ($(du -sh "$DEST/uploads" | cut -f1) aparentes)"

# 4. Retención
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20??-??-??' -mtime +"$RETENTION_DAYS" -print0 |
  while IFS= read -r -d '' old; do
    rm -rf -- "$old"
    log "Eliminada copia antigua: $(basename "$old")"
  done

log "Copia completada. Espacio total de copias: $(du -sh "$BACKUP_ROOT" | cut -f1)"
