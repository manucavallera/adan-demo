# Imagen para Easypanel: compila la web y la sirve con el servidor "standalone" de Next.js.
# Al arrancar aplica las migraciones de la base y, si está vacía, carga el catálogo inicial.
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

FROM node:20-alpine
RUN apk add --no-cache openssl && npm i -g prisma@6.19.3
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/app/data/uploads
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY docker-entrypoint.sh ./
# .next/cache: Next guarda ahí las páginas que regenera (ISR); tiene que poder escribir el usuario node.
RUN mkdir -p /app/data/uploads /app/.next/cache && chown -R node:node /app/data /app/.next/cache && chmod +x docker-entrypoint.sh
USER node
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
