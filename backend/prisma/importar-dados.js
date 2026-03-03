/**
 * Script de importação: 
 *   - importar.json → Filiais + Centros de Custo
 *   - contas_contabil.json → Contas Contábeis
 * 
 * 1. Lê importar.json da raiz do projeto
 * 2. Extrai filiais únicas por CNPJ e cadastra no banco
 * 3. Cadastra centros de custo vinculados à filial correta
 * 4. Lê contas_contabil.json e cadastra contas contábeis
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

function limparCNPJ(cnpj) {
  return cnpj.replace(/[^\d]/g, '');
}

async function main() {
  console.log('📦 Iniciando importação de dados...\n');

  // Ler JSON
  const dados = require(path.join(__dirname, '..', '..', 'importar.json'));
  console.log(`📄 Total de registros no JSON: ${dados.length}`);

  // ==========================================
  // PASSO 1: Extrair e cadastrar filiais únicas
  // ==========================================
  console.log('\n--- PASSO 1: Cadastrando Filiais ---');

  const filiaisMap = new Map(); // cnpj limpo -> dados

  for (const reg of dados) {
    const cnpjLimpo = limparCNPJ(reg.CNPJ);
    if (!filiaisMap.has(cnpjLimpo)) {
      filiaisMap.set(cnpjLimpo, {
        razaoSocial: reg['Razao Social'].trim(),
        cnpj: cnpjLimpo,
        estado: reg.Estado.trim(),
        cidade: reg.Cidade.trim(),
      });
    }
  }

  console.log(`🏢 Filiais únicas encontradas: ${filiaisMap.size}`);

  let filiaisCriadas = 0;
  let filiaisExistentes = 0;
  const cnpjToFilialId = new Map(); // cnpj limpo -> id no banco

  for (const [cnpj, info] of filiaisMap) {
    try {
      const filial = await prisma.filial.upsert({
        where: { cnpj },
        update: {}, // Se já existe, não altera
        create: {
          razaoSocial: info.razaoSocial,
          cnpj: info.cnpj,
          estado: info.estado,
          cidade: info.cidade,
        },
      });
      cnpjToFilialId.set(cnpj, filial.id);

      if (filial.createdAt.getTime() > Date.now() - 5000) {
        filiaisCriadas++;
      } else {
        filiaisExistentes++;
      }
    } catch (err) {
      console.error(`❌ Erro ao cadastrar filial ${cnpj}: ${err.message}`);
    }
  }

  console.log(`✅ Filiais criadas: ${filiaisCriadas}`);
  if (filiaisExistentes > 0) {
    console.log(`ℹ️  Filiais já existentes (ignoradas): ${filiaisExistentes}`);
  }

  // ==========================================
  // PASSO 2: Cadastrar centros de custo
  // ==========================================
  console.log('\n--- PASSO 2: Cadastrando Centros de Custo ---');

  let ccCriados = 0;
  let ccExistentes = 0;
  let ccErros = 0;

  for (const reg of dados) {
    const cnpjLimpo = limparCNPJ(reg.CNPJ);
    const filialId = cnpjToFilialId.get(cnpjLimpo);

    if (!filialId) {
      console.error(`❌ Filial não encontrada para CNPJ ${reg.CNPJ}`);
      ccErros++;
      continue;
    }

    const numero = reg['Numero CC'].toString().trim();
    const descricao = reg['Descrição CC'].trim();

    try {
      // Verificar se já existe
      const existente = await prisma.centroCusto.findUnique({ where: { numero } });

      if (existente) {
        ccExistentes++;
        continue;
      }

      await prisma.centroCusto.create({
        data: {
          numero,
          descricao,
          filialId,
        },
      });
      ccCriados++;
    } catch (err) {
      if (err.code === 'P2002') {
        ccExistentes++;
      } else {
        console.error(`❌ Erro CC "${numero}": ${err.message}`);
        ccErros++;
      }
    }
  }

  console.log(`✅ Centros de custo criados: ${ccCriados}`);
  if (ccExistentes > 0) {
    console.log(`ℹ️  CCs já existentes (ignorados): ${ccExistentes}`);
  }
  if (ccErros > 0) {
    console.log(`❌ CCs com erro: ${ccErros}`);
  }

  // ==========================================
  // PASSO 3: Cadastrar contas contábeis
  // ==========================================
  console.log('\n--- PASSO 3: Cadastrando Contas Contábeis ---');

  let contasCriadas = 0;
  let contasExistentes = 0;
  let contasErros = 0;

  try {
    const contasJson = require(path.join(__dirname, '..', '..', 'contas_contabil.json'));
    console.log(`📄 Total de contas no JSON: ${contasJson.length}`);

    for (const reg of contasJson) {
      const numero = reg.numero.toString().trim();
      const descricao = reg.descricao.trim();

      try {
        const existente = await prisma.contaContabil.findUnique({ where: { numero } });

        if (existente) {
          contasExistentes++;
          continue;
        }

        await prisma.contaContabil.create({
          data: { numero, descricao },
        });
        contasCriadas++;
      } catch (err) {
        if (err.code === 'P2002') {
          contasExistentes++;
        } else {
          console.error(`❌ Erro Conta "${numero}": ${err.message}`);
          contasErros++;
        }
      }
    }
  } catch (err) {
    console.log('⚠️  Arquivo contas_contabil.json não encontrado, pulando...');
  }

  console.log(`✅ Contas contábeis criadas: ${contasCriadas}`);
  if (contasExistentes > 0) {
    console.log(`ℹ️  Contas já existentes (ignoradas): ${contasExistentes}`);
  }
  if (contasErros > 0) {
    console.log(`❌ Contas com erro: ${contasErros}`);
  }

  // ==========================================
  // RESUMO FINAL
  // ==========================================
  console.log('\n========================================');
  console.log('📊 RESUMO DA IMPORTAÇÃO');
  console.log('========================================');

  const totalFiliais = await prisma.filial.count({ where: { ativo: true } });
  const totalCCs = await prisma.centroCusto.count({ where: { ativo: true } });
  const totalContas = await prisma.contaContabil.count({ where: { ativo: true } });

  console.log(`🏢 Total de Filiais no banco: ${totalFiliais}`);
  console.log(`📋 Total de Centros de Custo no banco: ${totalCCs}`);
  console.log(`📒 Total de Contas Contábeis no banco: ${totalContas}`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal na importação:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
