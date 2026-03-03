-- AlterTable: rename diaVencimento to prazoVencimento
ALTER TABLE "unidades_consumidoras" ADD COLUMN IF NOT EXISTS "prazo_vencimento" INTEGER;
UPDATE "unidades_consumidoras" SET "prazo_vencimento" = "dia_vencimento" WHERE "dia_vencimento" IS NOT NULL;
ALTER TABLE "unidades_consumidoras" DROP COLUMN IF EXISTS "dia_vencimento";
