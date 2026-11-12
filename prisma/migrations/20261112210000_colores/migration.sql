-- Colores por prenda: cada variante es color + talle. Las prendas cargadas quedan con color "" (un solo color).
ALTER TABLE "Product" ADD COLUMN "colors" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Variant" ADD COLUMN "color" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OrderItem" ADD COLUMN "color" TEXT NOT NULL DEFAULT '';

DROP INDEX "Variant_productId_size_key";
CREATE UNIQUE INDEX "Variant_productId_color_size_key" ON "Variant"("productId", "color", "size");
