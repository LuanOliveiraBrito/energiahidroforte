-- AlterTable
ALTER TABLE "faturas" ADD COLUMN     "data_emissao" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "unidades_consumidoras" ADD COLUMN     "dia_vencimento" INTEGER;
