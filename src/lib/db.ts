import "server-only";
import { PrismaClient } from "@prisma/client";

// Una sola conexión por proceso (en desarrollo Next recarga módulos y abriría muchas).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
