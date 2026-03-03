-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMINISTRADOR', 'OPERADOR', 'DIRETORIA', 'FINANCEIRO');

-- CreateEnum
CREATE TYPE "FaturaStatus" AS ENUM ('PENDENTE', 'APROVADA', 'LIBERADA', 'PAGA', 'REJEITADA');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filiais" (
    "id" SERIAL NOT NULL,
    "razao_social" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_consumidoras" (
    "id" SERIAL NOT NULL,
    "unidade_consumidora" TEXT NOT NULL,
    "num_instalacao" TEXT NOT NULL,
    "filial_id" INTEGER NOT NULL,
    "fornecedor_id" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_consumidoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centros_custo" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "centros_custo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_contabeis" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_contabeis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "naturezas" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "naturezas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faturas" (
    "id" SERIAL NOT NULL,
    "uc_id" INTEGER NOT NULL,
    "fornecedor_id" INTEGER NOT NULL,
    "filial_id" INTEGER NOT NULL,
    "centro_custo_id" INTEGER NOT NULL,
    "conta_contabil_id" INTEGER NOT NULL,
    "natureza_id" INTEGER NOT NULL,
    "nota_fiscal" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,
    "leitura_kwh" DOUBLE PRECISION,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "referencia" TEXT NOT NULL,
    "pedido_compras" TEXT,
    "anexo_fatura" TEXT,
    "anexo_pedido_compras" TEXT,
    "status" "FaturaStatus" NOT NULL DEFAULT 'PENDENTE',
    "lancado_por_id" INTEGER NOT NULL,
    "aprovado_por_id" INTEGER,
    "liberado_por_id" INTEGER,
    "baixado_por_id" INTEGER,
    "data_lancamento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_aprovacao" TIMESTAMP(3),
    "data_liberacao" TIMESTAMP(3),
    "data_baixa" TIMESTAMP(3),
    "motivo_rejeicao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "fatura_id" INTEGER,
    "acao" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "filiais_cnpj_key" ON "filiais"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedores_cnpj_key" ON "fornecedores"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_consumidoras_unidade_consumidora_key" ON "unidades_consumidoras"("unidade_consumidora");

-- CreateIndex
CREATE UNIQUE INDEX "centros_custo_numero_key" ON "centros_custo"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "contas_contabeis_numero_key" ON "contas_contabeis"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "naturezas_descricao_key" ON "naturezas"("descricao");

-- AddForeignKey
ALTER TABLE "unidades_consumidoras" ADD CONSTRAINT "unidades_consumidoras_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades_consumidoras" ADD CONSTRAINT "unidades_consumidoras_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_uc_id_fkey" FOREIGN KEY ("uc_id") REFERENCES "unidades_consumidoras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "centros_custo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_conta_contabil_id_fkey" FOREIGN KEY ("conta_contabil_id") REFERENCES "contas_contabeis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_natureza_id_fkey" FOREIGN KEY ("natureza_id") REFERENCES "naturezas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_lancado_por_id_fkey" FOREIGN KEY ("lancado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_aprovado_por_id_fkey" FOREIGN KEY ("aprovado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_liberado_por_id_fkey" FOREIGN KEY ("liberado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_baixado_por_id_fkey" FOREIGN KEY ("baixado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_fatura_id_fkey" FOREIGN KEY ("fatura_id") REFERENCES "faturas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
