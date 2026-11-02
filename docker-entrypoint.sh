#!/bin/sh
# Arranque del contenedor: migraciones, carga inicial (solo si la base está vacía) y servidor.
set -e
prisma migrate deploy --schema prisma/schema.prisma
node prisma/seed.mjs
exec node server.js
