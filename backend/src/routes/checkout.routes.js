const express = require('express');
const prisma = require('../config/database');
const { authMiddleware } = require('../middlewares/auth.middleware');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authMiddleware);

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Motor de Checkout de Faturas — v3 (Máquina de 4 Estados)
 *
 * Cadastro de cada UC:
 *   diaEmissao       = Dia do mês em que a concessionária emite a fatura (ex: 05)
 *   prazoVencimento  = Quantidade de dias da emissão até o vencimento (ex: 20)
 *
 * Cálculo do ciclo para cada UC/mês:
 *   dataEmissao    = diaEmissao do mês de referência (fallback: dia 1)
 *   dataVencimento = dataEmissao + prazoVencimento dias (fallback: +30 dias)
 *   gatilho50pct   = dataEmissao + 50% do prazoVencimento
 *
 * Máquina de Estados (4 estados):
 *   AGUARDANDO  → Período inicial: antes de atingir 50% do prazo (sem fatura lançada)
 *   PENDENTE    → Atingiu 50% do prazo e nenhuma fatura foi lançada (alerta)
 *   LANCADA     → Fatura lançada, aguardando pagamento (status != PAGA)
 *   PAGA        → Financeiro confirmou a baixa (fatura.status == PAGA)
 *
 * Mês futuro (sem dados possíveis) → FUTURO (não conta como estado real)
 */

// Ajustar dia para meses com menos dias (ex: fev 28/29)
function ajustarDia(ano, mes, dia) {
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return Math.min(dia, ultimoDia);
}

// Calcular data de emissão para um mês de referência
function calcDataEmissao(ano, mes, diaEmissao) {
  if (!diaEmissao) return new Date(ano, mes - 1, 1);
  const dia = ajustarDia(ano, mes, diaEmissao);
  return new Date(ano, mes - 1, dia);
}

// Calcular data de vencimento = dataEmissão + prazoVencimento dias
function calcDataVencimento(dataEmissao, prazoVencimento) {
  const venc = new Date(dataEmissao);
  venc.setDate(venc.getDate() + (prazoVencimento || 30));
  return venc;
}

// Calcular gatilho de 50% do prazo
function calcGatilho50(dataEmissao, prazoVencimento) {
  const dias = prazoVencimento || 30;
  const metade = Math.floor(dias / 2);
  const gatilho = new Date(dataEmissao);
  gatilho.setDate(gatilho.getDate() + metade);
  return gatilho;
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

// GET /api/checkout/matriz
router.get('/matriz', async (req, res) => {
  try {
    const now = new Date();
    const { ano, filialId, fornecedorId, soPendencias } = req.query;
    const anoRef = parseInt(ano) || now.getFullYear();
    const mesAtualNum = now.getFullYear() === anoRef ? now.getMonth() + 1 : (anoRef < now.getFullYear() ? 12 : 0);

    const ucWhere = { ativo: true };
    if (filialId) ucWhere.filialId = parseInt(filialId);
    if (fornecedorId) ucWhere.fornecedorId = parseInt(fornecedorId);

    const todasUCs = await prisma.unidadeConsumidora.findMany({
      where: ucWhere,
      include: {
        filial: { select: { id: true, razaoSocial: true } },
        fornecedor: { select: { id: true, nome: true } },
      },
      orderBy: { uc: 'asc' },
    });

    const faturas = await prisma.fatura.findMany({
      where: {
        referencia: { gte: `${anoRef}-01`, lte: `${anoRef}-12` },
      },
      select: {
        id: true, ucId: true, referencia: true, status: true, valor: true,
        vencimento: true, dataEmissao: true, notaFiscal: true, leituraKwh: true,
        formaPagamento: true,
        lancadoPor: { select: { nome: true } },
        dataLancamento: true, dataAprovacao: true, dataLiberacao: true,
        dataProtocolo: true, dataBaixa: true,
      },
    });

    const faturaMap = {};
    for (const f of faturas) {
      const key = `${f.ucId}-${f.referencia}`;
      if (!faturaMap[key]) faturaMap[key] = [];
      faturaMap[key].push(f);
    }

    let matriz = todasUCs.map((uc) => {
      const meses = [];
      let totalPendentes = 0;
      let totalLancadas = 0;
      let totalPagas = 0;
      let valorTotal = 0;

      for (let m = 1; m <= 12; m++) {
        const ref = `${anoRef}-${String(m).padStart(2, '0')}`;
        const key = `${uc.id}-${ref}`;
        const fats = faturaMap[key] || [];
        const fatsValidas = fats.filter(f => f.status !== 'REJEITADA');

        // Ciclo: emissão → gatilho 50% → vencimento
        const dataEmissao = calcDataEmissao(anoRef, m, uc.diaEmissao);
        const dataVencimento = calcDataVencimento(dataEmissao, uc.prazoVencimento);
        const gatilho50 = calcGatilho50(dataEmissao, uc.prazoVencimento);

        let statusMes = 'AGUARDANDO';
        let detalhe = null;

        // Mês futuro
        if ((anoRef === now.getFullYear() && m > mesAtualNum) || anoRef > now.getFullYear()) {
          statusMes = 'FUTURO';
        } else if (fatsValidas.length > 0) {
          // Tem fatura lançada
          const fat = fatsValidas[0];
          valorTotal += Number(fat.valor) || 0;

          if (fat.status === 'PAGA') {
            statusMes = 'PAGA';
            totalPagas++;
          } else {
            statusMes = 'LANCADA';
            totalLancadas++;
          }

          detalhe = {
            faturaId: fat.id, valor: fat.valor, notaFiscal: fat.notaFiscal,
            status: fat.status, leituraKwh: fat.leituraKwh,
            formaPagamento: fat.formaPagamento, lancadoPor: fat.lancadoPor?.nome,
            dataLancamento: fat.dataLancamento, vencimento: fat.vencimento,
          };
        } else {
          // Sem fatura — regra dos 50%
          if (now >= gatilho50) {
            statusMes = 'PENDENTE';
            totalPendentes++;
          } else {
            statusMes = 'AGUARDANDO';
          }
        }

        meses.push({
          mes: m, ref, mesLabel: MONTHS_PT[m - 1], status: statusMes,
          diaEmissao: uc.diaEmissao, prazoVencimento: uc.prazoVencimento,
          dataEmissao: formatDate(dataEmissao), dataVencimento: formatDate(dataVencimento),
          gatilho50: formatDate(gatilho50),
          valor: fatsValidas[0]?.valor || null, notaFiscal: fatsValidas[0]?.notaFiscal || null,
          faturaId: fatsValidas[0]?.id || null, qtdFaturas: fatsValidas.length,
          detalhe,
        });
      }

      // Status geral da UC
      let statusGeral = 'EM_DIA';
      if (totalPendentes >= 3) {
        statusGeral = 'CRITICO';
      } else if (totalPendentes > 0) {
        statusGeral = 'PENDENTE';
      } else if (totalLancadas > 0) {
        statusGeral = 'AGUARDANDO';
      }

      return {
        ucId: uc.id, nome: uc.uc, codigo: uc.numInstalacao || uc.uc,
        filial: uc.filial?.razaoSocial, filialId: uc.filial?.id,
        fornecedor: uc.fornecedor?.nome, fornecedorId: uc.fornecedor?.id,
        diaEmissao: uc.diaEmissao, prazoVencimento: uc.prazoVencimento,
        meses, statusGeral, totalPendentes, totalLancadas, totalPagas, valorTotal,
      };
    });

    if (soPendencias === 'true') {
      matriz = matriz.filter(uc => uc.statusGeral !== 'EM_DIA');
    }

    // KPIs
    const mesAtualRef = `${anoRef}-${String(mesAtualNum).padStart(2, '0')}`;
    const totalUCs = todasUCs.length;

    const statusDoMesAtual = matriz.map(uc => {
      const mesDado = uc.meses.find(m => m.mes === mesAtualNum);
      return mesDado ? mesDado.status : 'AGUARDANDO';
    });

    const pagas = statusDoMesAtual.filter(s => s === 'PAGA').length;
    const lancadas = statusDoMesAtual.filter(s => s === 'LANCADA').length;
    const pendentes = statusDoMesAtual.filter(s => s === 'PENDENTE').length;
    const aguardando = statusDoMesAtual.filter(s => s === 'AGUARDANDO').length;

    const faturamentoAno = faturas
      .filter(f => f.status !== 'REJEITADA')
      .reduce((s, f) => s + (Number(f.valor) || 0), 0);

    const totalPendentesGeral = matriz.reduce(
      (s, uc) => s + uc.meses.filter(m => m.status === 'PENDENTE').length, 0
    );

    const cobertura = totalUCs > 0 ? Math.round(((pagas + lancadas) / totalUCs) * 100) : 0;

    const indicadores = {
      mesReferencia: mesAtualRef, totalUcs: totalUCs, cobertura,
      pagas, lancadas, pendentes, aguardando,
      totalPendentesGeral, faturamentoTotal: faturamentoAno,
      ucsEmDia: matriz.filter(uc => uc.statusGeral === 'EM_DIA').length,
      ucsPendentes: matriz.filter(uc => uc.statusGeral === 'PENDENTE').length,
      ucsCriticas: matriz.filter(uc => uc.statusGeral === 'CRITICO').length,
      ucsAguardando: matriz.filter(uc => uc.statusGeral === 'AGUARDANDO').length,
    };

    // Notificações
    const notificacoes = [];
    const hoje = now.toISOString().split('T')[0];

    const ucsPendentesList = matriz.filter(uc => uc.statusGeral === 'CRITICO');
    if (ucsPendentesList.length > 0) {
      notificacoes.push({
        tipo: 'CRITICO', data: hoje,
        mensagem: `${ucsPendentesList.length} UC(s) com 3+ meses pendentes`,
        detalhe: ucsPendentesList.slice(0, 10).map(u => u.nome).join(', ') + (ucsPendentesList.length > 10 ? ` (+${ucsPendentesList.length - 10})` : ''),
      });
    }

    const ucsMesPendente = matriz.filter(uc => {
      const mesAtual = uc.meses.find(m => m.mes === mesAtualNum);
      return mesAtual && mesAtual.status === 'PENDENTE';
    });
    if (ucsMesPendente.length > 0) {
      notificacoes.push({
        tipo: 'ALERTA', data: hoje,
        mensagem: `${ucsMesPendente.length} fatura(s) pendentes de lançamento em ${MONTHS_PT[mesAtualNum - 1]}/${anoRef}`,
        detalhe: ucsMesPendente.slice(0, 10).map(u => u.nome).join(', '),
      });
    }

    const ucsMesLancada = matriz.filter(uc => {
      const mesAtual = uc.meses.find(m => m.mes === mesAtualNum);
      return mesAtual && mesAtual.status === 'LANCADA';
    });
    if (ucsMesLancada.length > 0) {
      notificacoes.push({
        tipo: 'INFO', data: hoje,
        mensagem: `${ucsMesLancada.length} fatura(s) lançadas aguardando pagamento`,
        detalhe: ucsMesLancada.slice(0, 10).map(u => u.nome).join(', '),
      });
    }

    // Filtros (arrays de strings para os selects do frontend)
    const filiais = await prisma.filial.findMany({
      where: { ativo: true }, select: { razaoSocial: true }, orderBy: { razaoSocial: 'asc' },
    });
    const fornecedores = await prisma.fornecedor.findMany({
      where: { ativo: true }, select: { nome: true }, orderBy: { nome: 'asc' },
    });

    res.json({
      ano: anoRef, indicadores, matriz, notificacoes,
      filtros: {
        filiais: filiais.map(f => f.razaoSocial),
        fornecedores: fornecedores.map(f => f.nome),
      },
    });
  } catch (err) {
    logger.error('GET /api/checkout', err);
    res.status(500).json({ error: true, message: 'Erro ao gerar checkout de faturas' });
  }
});

// GET /api/checkout/detalhe/:ucId?ref=YYYY-MM
router.get('/detalhe/:ucId', async (req, res) => {
  try {
    const { ucId } = req.params;
    const { ref } = req.query;

    if (!ref) return res.status(400).json({ error: true, message: 'Parâmetro ref é obrigatório (YYYY-MM)' });

    const uc = await prisma.unidadeConsumidora.findUnique({
      where: { id: parseInt(ucId) },
      include: {
        filial: { select: { razaoSocial: true } },
        fornecedor: { select: { nome: true } },
      },
    });

    if (!uc) return res.status(404).json({ error: true, message: 'UC nao encontrada' });

    const faturas = await prisma.fatura.findMany({
      where: { ucId: parseInt(ucId), referencia: ref },
      include: {
        lancadoPor: { select: { nome: true } },
        aprovadoPor: { select: { nome: true } },
        liberadoPor: { select: { nome: true } },
        protocoladoPor: { select: { nome: true } },
        baixadoPor: { select: { nome: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const [anoStr, mesStr] = ref.split('-');
    const ano = parseInt(anoStr);
    const mes = parseInt(mesStr);
    const dataEmissao = calcDataEmissao(ano, mes, uc.diaEmissao);
    const dataVencimento = calcDataVencimento(dataEmissao, uc.prazoVencimento);
    const gatilho50 = calcGatilho50(dataEmissao, uc.prazoVencimento);

    res.json({
      uc: {
        id: uc.id, uc: uc.uc, numInstalacao: uc.numInstalacao,
        filial: uc.filial?.razaoSocial, fornecedor: uc.fornecedor?.nome,
        diaEmissao: uc.diaEmissao, prazoVencimento: uc.prazoVencimento,
      },
      referencia: ref,
      ciclo: {
        dataEmissao: formatDate(dataEmissao),
        gatilho50: formatDate(gatilho50),
        dataVencimento: formatDate(dataVencimento),
      },
      faturas: faturas.map(f => ({
        id: f.id, status: f.status, valor: f.valor, notaFiscal: f.notaFiscal,
        leituraKwh: f.leituraKwh, vencimento: f.vencimento, dataEmissao: f.dataEmissao,
        formaPagamento: f.formaPagamento,
        lancadoPor: f.lancadoPor?.nome, aprovadoPor: f.aprovadoPor?.nome,
        liberadoPor: f.liberadoPor?.nome, protocoladoPor: f.protocoladoPor?.nome,
        baixadoPor: f.baixadoPor?.nome,
        dataLancamento: f.dataLancamento, dataAprovacao: f.dataAprovacao,
        dataLiberacao: f.dataLiberacao, dataProtocolo: f.dataProtocolo,
        dataBaixa: f.dataBaixa,
      })),
    });
  } catch (err) {
    logger.error('GET /api/checkout/detalhe', err);
    res.status(500).json({ error: true, message: 'Erro ao buscar detalhe' });
  }
});

module.exports = router;
