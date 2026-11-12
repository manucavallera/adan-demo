-- Ofertas: precio de antes (tachado en la web). 0 = sin oferta.
ALTER TABLE "Product" ADD COLUMN "oldPrice" INTEGER NOT NULL DEFAULT 0;
