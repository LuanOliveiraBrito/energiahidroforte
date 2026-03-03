-- AlterEnum: Add PROTOCOLADA to FaturaStatus
ALTER TYPE "FaturaStatus" ADD VALUE IF NOT EXISTS 'PROTOCOLADA' BEFORE 'PAGA';

-- Add protocolo fields to faturas
ALTER TABLE "faturas" ADD COLUMN IF NOT EXISTS "numero_protocolo" TEXT;
ALTER TABLE "faturas" ADD COLUMN IF NOT EXISTS "protocolado_por_id" INTEGER;
ALTER TABLE "faturas" ADD COLUMN IF NOT EXISTS "data_protocolo" TIMESTAMP(3);

-- FK protocolado_por_id -> users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'faturas_protocolado_por_id_fkey'
  ) THEN
    ALTER TABLE "faturas" ADD CONSTRAINT "faturas_protocolado_por_id_fkey"
      FOREIGN KEY ("protocolado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
