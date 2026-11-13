-- Zonas de envío configurables desde Ajustes.
ALTER TABLE "Settings" ADD COLUMN "shippingZones" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Order" ADD COLUMN "shippingZone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Order" ADD COLUMN "shippingTbd" BOOLEAN NOT NULL DEFAULT false;
