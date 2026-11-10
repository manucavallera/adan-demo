#!/bin/sh
# Arranque del contenedor: migraciones, carga inicial (solo si la base está vacía) y servidor.
set -e
# Un volumen nuevo de Easypanel viene con dueño root: se lo pasamos al usuario node y seguimos como node.
if [ "$(id -u)" = "0" ]; then
  mkdir -p "${UPLOAD_DIR:-/app/data/uploads}"
  chown -R node:node /app/data
  exec su-exec node "$0" "$@"
fi
prisma migrate deploy --schema prisma/schema.prisma
node prisma/seed.mjs
exec node server.js
