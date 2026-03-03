-- AlterTable
ALTER TABLE "faturas" ADD COLUMN     "aplicacao" TEXT,
ADD COLUMN     "forma_pagamento" TEXT;

-- AlterTable
ALTER TABLE "fornecedores" ADD COLUMN     "agencia" TEXT,
ADD COLUMN     "banco" TEXT,
ADD COLUMN     "chave_pix" TEXT,
ADD COLUMN     "conta" TEXT,
ADD COLUMN     "op" TEXT,
ADD COLUMN     "tipo_chave_pix" TEXT,
ADD COLUMN     "tipo_conta" TEXT;
