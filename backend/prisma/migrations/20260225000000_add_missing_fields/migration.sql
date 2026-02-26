-- AlterTable: Adicionar cpf ao users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='cpf') THEN
    ALTER TABLE "users" ADD COLUMN "cpf" TEXT;
  END IF;
END $$;

-- AlterTable: Adicionar filial_id ao centros_custo
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='centros_custo' AND column_name='filial_id') THEN
    ALTER TABLE "centros_custo" ADD COLUMN "filial_id" INTEGER;
  END IF;
END $$;

-- AddForeignKey centros_custo -> filiais
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='centros_custo_filial_id_fkey') THEN
    ALTER TABLE "centros_custo" ADD CONSTRAINT "centros_custo_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AlterTable: Adicionar campos de estorno e hash ao faturas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faturas' AND column_name='data_estorno') THEN
    ALTER TABLE "faturas" ADD COLUMN "data_estorno" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faturas' AND column_name='estornado_por_id') THEN
    ALTER TABLE "faturas" ADD COLUMN "estornado_por_id" INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faturas' AND column_name='hash_verificacao') THEN
    ALTER TABLE "faturas" ADD COLUMN "hash_verificacao" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faturas' AND column_name='motivo_estorno') THEN
    ALTER TABLE "faturas" ADD COLUMN "motivo_estorno" TEXT;
  END IF;
END $$;

-- CreateIndex (unique on hash_verificacao)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='faturas_hash_verificacao_key') THEN
    CREATE UNIQUE INDEX "faturas_hash_verificacao_key" ON "faturas"("hash_verificacao");
  END IF;
END $$;

-- AddForeignKey faturas -> users (estornado_por)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='faturas_estornado_por_id_fkey') THEN
    ALTER TABLE "faturas" ADD CONSTRAINT "faturas_estornado_por_id_fkey" FOREIGN KEY ("estornado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey audit_logs -> faturas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='audit_logs_fatura_id_fkey') THEN
    ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_fatura_id_fkey" FOREIGN KEY ("fatura_id") REFERENCES "faturas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
