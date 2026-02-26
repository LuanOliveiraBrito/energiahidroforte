/*
  Warnings:

  - The values [OPERADOR,DIRETORIA] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;

-- 1) Adicionar novos valores ao enum existente
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMINISTRATIVO';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'GERENTE_ADM';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DIRETOR';

COMMIT;

-- 2) Converter usuarios existentes (OPERADOR -> ADMINISTRATIVO, DIRETORIA -> DIRETOR)
UPDATE "users" SET "role" = 'ADMINISTRATIVO' WHERE "role" = 'OPERADOR';
UPDATE "users" SET "role" = 'DIRETOR' WHERE "role" = 'DIRETORIA';

-- 3) Agora recriar o enum sem os valores antigos
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMINISTRADOR', 'ADMINISTRATIVO', 'GERENTE_ADM', 'DIRETOR', 'FINANCEIRO');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ADMINISTRATIVO';
COMMIT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ADMINISTRATIVO';
