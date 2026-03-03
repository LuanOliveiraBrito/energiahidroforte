const crypto = require('crypto');
const prisma = require('../config/database');

// Chave secreta para HMAC — só o servidor conhece
const SECRET_KEY = process.env.HASH_SECRET || 'VoltarisEnergy-2026-ChaveSecreta-HMAC-SHA256';

/**
 * Gera um hash HMAC-SHA256 único baseado nos dados da fatura.
 * Inclui dados que não podem ser forjados sem acesso ao servidor.
 * Retorna um código alfanumérico de 12 caracteres (uppercase) para facilitar leitura.
 */
function gerarHashVerificacao(fatura) {
  const payload = [
    `id:${fatura.id}`,
    `valor:${fatura.valor}`,
    `vencimento:${fatura.vencimento}`,
    `referencia:${fatura.referencia}`,
    `status:${fatura.status}`,
    `lancadoPorId:${fatura.lancadoPorId}`,
    `aprovadoPorId:${fatura.aprovadoPorId || ''}`,
    `liberadoPorId:${fatura.liberadoPorId || ''}`,
    `baixadoPorId:${fatura.baixadoPorId || ''}`,
    `dataAprovacao:${fatura.dataAprovacao || ''}`,
    `dataLiberacao:${fatura.dataLiberacao || ''}`,
    `dataBaixa:${fatura.dataBaixa || ''}`,
    `ts:${Date.now()}`, // Timestamp para unicidade
  ].join('|');

  const hmac = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');

  // Pegar os primeiros 12 caracteres em uppercase para código legível
  // Formato: XXXX-XXXX-XXXX
  const code = hmac.slice(0, 12).toUpperCase();
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

/**
 * Atualiza o hash de verificação da fatura no banco.
 * Chamado a cada etapa do workflow (aprovação, liberação, baixa).
 * Inclui retry em caso de colisão de hash (unique constraint).
 */
async function atualizarHashVerificacao(faturaId) {
  const MAX_RETRIES = 3;

  for (let tentativa = 0; tentativa < MAX_RETRIES; tentativa++) {
    try {
      const fatura = await prisma.fatura.findUnique({
        where: { id: faturaId },
      });

      if (!fatura) return null;

      const hash = gerarHashVerificacao(fatura);

      await prisma.fatura.update({
        where: { id: faturaId },
        data: { hashVerificacao: hash },
      });

      return hash;
    } catch (err) {
      // P2002 = unique constraint violation (hash duplicado)
      if (err.code === 'P2002' && tentativa < MAX_RETRIES - 1) {
        // Esperar um pouco e tentar novamente (o timestamp vai mudar)
        await new Promise(resolve => setTimeout(resolve, 50));
        continue;
      }
      console.error('Erro ao atualizar hash de verificação:', err);
      return null;
    }
  }

  return null;
}

/**
 * Verifica se um hash é válido e retorna os dados da fatura correspondente.
 */
async function verificarHash(hash) {
  const fatura = await prisma.fatura.findUnique({
    where: { hashVerificacao: hash },
    include: {
      fornecedor: { select: { nome: true, cnpj: true } },
      filial: { select: { razaoSocial: true } },
      uc: { select: { uc: true, numInstalacao: true } },
      centroCusto: { select: { numero: true, descricao: true } },
      natureza: { select: { descricao: true } },
      lancadoPor: { select: { nome: true } },
      aprovadoPor: { select: { nome: true } },
      liberadoPor: { select: { nome: true } },
      baixadoPor: { select: { nome: true } },
      estornadoPor: { select: { nome: true } },
    },
  });

  return fatura;
}

module.exports = { gerarHashVerificacao, atualizarHashVerificacao, verificarHash };
