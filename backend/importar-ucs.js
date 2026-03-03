const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ucsJson = require('../UC.json');

function limparCnpj(c) {
  return c.replace(/[^0-9]/g, '');
}

(async () => {
  try {
    // Carregar filiais e fornecedores do banco
    const filiais = await prisma.filial.findMany({ select: { id: true, cnpj: true } });
    const fornecedores = await prisma.fornecedor.findMany({ select: { id: true, cnpj: true } });

    const filialMap = {};
    filiais.forEach(f => { filialMap[f.cnpj] = f.id; });

    const fornMap = {};
    fornecedores.forEach(f => { fornMap[f.cnpj] = f.id; });

    // Verificar se todas as filiais e fornecedores existem
    const cnpjsFiliaisJson = [...new Set(ucsJson.map(u => limparCnpj(u['CNPJ FILIAL'])))];
    const cnpjsFornJson = [...new Set(ucsJson.map(u => limparCnpj(u['CNPJ FORNECEDOR'])))];

    let allOk = true;
    cnpjsFiliaisJson.forEach(c => {
      if (!filialMap[c]) { console.log('FILIAL NAO ENCONTRADA: ' + c); allOk = false; }
    });
    cnpjsFornJson.forEach(c => {
      if (!fornMap[c]) { console.log('FORNECEDOR NAO ENCONTRADO: ' + c); allOk = false; }
    });

    if (!allOk) {
      console.log('Abortando - corrija os cadastros primeiro.');
      process.exit(1);
    }
    console.log('Todas as filiais e fornecedores encontrados!');

    // Checar UCs ja existentes
    const ucsExistentes = await prisma.unidadeConsumidora.findMany({ select: { uc: true } });
    const ucsSet = new Set(ucsExistentes.map(u => u.uc));

    let inseridas = 0;
    let puladas = 0;
    let erros = 0;

    for (const item of ucsJson) {
      const ucNum = item['Unidade Consumidora'];

      if (ucsSet.has(ucNum)) {
        puladas++;
        continue;
      }

      const filialId = filialMap[limparCnpj(item['CNPJ FILIAL'])];
      const fornecedorId = fornMap[limparCnpj(item['CNPJ FORNECEDOR'])];
      const diaEmissao = parseInt(item['Dia Emissao das Faturas'] || item['Dia Emissão das Faturas']) || null;
      const prazoVencimento = parseInt(item['Prazo até Vencimento (dias)'] || item['Prazo ate Vencimento (dias)']) || null;
      const numInstalacao = item['Nº Instalação'] || item['No Instalacao'] || '';

      if (!filialId || !fornecedorId) {
        console.log('SKIP ' + ucNum + ' - filial ou fornecedor nao encontrado');
        erros++;
        continue;
      }

      try {
        await prisma.unidadeConsumidora.create({
          data: {
            uc: ucNum,
            numInstalacao: numInstalacao,
            filialId: filialId,
            fornecedorId: fornecedorId,
            diaEmissao: diaEmissao,
            prazoVencimento: prazoVencimento,
            ativo: true,
          },
        });
        inseridas++;
      } catch (err) {
        console.log('ERRO UC ' + ucNum + ': ' + err.message);
        erros++;
      }
    }

    console.log('=============================');
    console.log('Inseridas: ' + inseridas);
    console.log('Puladas (ja existiam): ' + puladas);
    console.log('Erros: ' + erros);
    console.log('Total processadas: ' + ucsJson.length);
  } catch (err) {
    console.error('Erro geral:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
