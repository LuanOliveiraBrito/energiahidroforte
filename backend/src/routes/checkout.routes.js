const express = require('express');
const prisma = require('../config/database');
const { authMiddleware } = require('../middlewares/auth.middleware');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authMiddleware);

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Motor de Checkout de Faturas — v2 (Prazo em dias)
 *
 * Conceito:
 *   diaEmissao       = Dia do mes em que a concessionaria emite a fatura
 *   prazoVencimento  = Quantidade de dias da emissao ate o vencimento
 *
 * Calculo do ciclo para cada UC/mes:
 *   dataEmissao    = diaEmissao do mes de referencia (fallback: dia 1)
 *   dataVencimento = dataEmissao + prazoVencimento dias (fallback: +30 dias)
 *   meiaVida       = dataEmissao + 50% do prazo
 *
 * Regra dos 50%:
 *   - Antes da emissao -> AGUARDANDO (cinza)
 *   - Da emissao ate 50% do prazo -> AGUARDANDO (amarelo)
 *   - Apos 50% do prazo sem fatura -> CRITICO (vermelho pulsante)
 *   - Apos o vencimento sem fatura -> CRITICO (vermelho solido)
 *
 * O vencimento pode cair no mes seguinte (ex: emissao dia 20 + 30 dias = dia 20 do mes seguinte)
 * e o sistema calcula corretamente.
 */

// Ajustar dia para meses com menos dias (ex: fev 28/29)
function ajustarDia(ano, mes, dia) {
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return Math.min(dia, ultimoDia);
}

// Calcular data de emissao para um mes de referencia
function calcDataEmissao(ano, mes, diaEmissao) {
  if (!diaEmissao) return new Date(ano, mes - 1, 1);
  const dia = ajustarDia(ano, mes, diaEmissao);
  return new Date(ano, mes - 1, dia);
}

// Calcular data de vencimento = dataEmissao + prazoVencimento dias
function calcDataVencimento(dataEmissao, prazoVencimento) {
  if (!prazoVencimento) {
    const venc = new Date(dataEmissao);
    venc.setDate(venc.getDate() + 30);
    return venc;
  }
  const venc = new Date(dataEmissao);
  venc.setDate(venc.getDate() + prazoVencimento);
  return venc;
}

// Calcular ponto de 50% entre emissao e vencimento
function calcMeiaVida(dataEmissao, dataVencimento) {
  const diffMs = dataVencimento.getTime() - dataEmissao.getTime();
  const metade = diffMs / 2;
  return new Date(dataEmissao.getTime() + metade);
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

// GET /api/checkout
router.get('/', async (req, res) => {
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
      let statusGeral = 'EM_DIA';
      let totalCriticos = 0;
      let totalAtrasos = 0;
      let totalAguardando = 0;
      let valorTotal = 0;

      for (let m = 1; m <= 12; m++) {
        const ref = `${anoRef}-${String(m).padStart(2, '0')}`;
        const key = `${uc.id}-${ref}`;
        const fats = faturaMap[key] || [];
        const fatsValidas = fats.filter(f => f.status !== 'REJEITADA');

        // Ciclo: emissao + prazo = vencimento (pode cair no mes seguinte)
        const dataEmissao = calcDataEmissao(anoRef, m, uc.diaEmissao);
        const dataVencimento = calcDataVencimento(dataEmissao, uc.prazoVencimento);
        const meiaVida = calcMeiaVida(dataEmissao, dataVencimento);

        let statusMes = 'SEM_LANCAMENTO';
        let detalhe = null;

        if ((anoRef === now.getFullYear() && m > mesAtualNum) || anoRef > now.getFullYear()) {
          statusMes = 'FUTURO';
        } else if (fatsValidas.length > 0) {
          const fat = fatsValidas[0];
          valorTotal += Number(fat.valor) || 0;

          if (fat.status === 'PAGA') {
            statusMes = 'OK';
          } else if (fat.status === 'REJEITADA') {
            statusMes = 'REJEITADA';
            totalAtrasos++;
          } else {
            const venc = new Date(fat.vencimento);
            if (now > venc) {
              statusMes = 'ATRASO';
              totalAtrasos++;
            } else {
              const diffMs = venc.getTime() - now.getTime();
              const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              if (diffDias <= 5) {
                statusMes = 'PROXIMO_VENCIMENTO';
                totalAguardando++;
              } else {
                statusMes = 'EM_ANDAMENTO';
              }
            }
          }

          detalhe = {
            faturaId: fat.id, valor: fat.valor, notaFiscal: fat.notaFiscal,
            status: fat.status, leituraKwh: fat.leituraKwh,
            formaPagamento: fat.formaPagamento, lancadoPor: fat.lancadoPor?.nome,
            dataLancamento: fat.dataLancamento, vencimento: fat.vencimento,
          };
        } else {
          // Sem fatura — regra dos 50%
          if (now >= dataVencimento) {
            statusMes = 'CRITICO';
            totalCriticos++;
          } else if (now >= meiaVida) {
            statusMes = 'CRITICO';
            totalCriticos++;
          } else if (now >= dataEmissao) {
            statusMes = 'AGUARDANDO';
            totalAguardando++;
          } else {
            statusMes = 'AGUARDANDO';
          }
        }

        meses.push({
          mes: m, ref, mesLabel: MONTHS_PT[m - 1], status: statusMes,
          diaEmissao: uc.diaEmissao, prazoVencimento: uc.prazoVencimento,
          dataEmissao: formatDate(dataEmissao), dataVencimento: formatDate(dataVencimento),
          meiaVida: formatDate(meiaVida),
          valor: fatsValidas[0]?.valor || null, notaFiscal: fatsValidas[0]?.notaFiscal || null,
          faturaId: fatsValidas[0]?.id || null, qtdFaturas: fatsValidas.length,
          detalhe,
        });
      }

      if (totalCriticos >= 3) {
        statusGeral = 'CRITICO';
      } else if (totalCriticos > 0 || totalAtrasos > 0) {
        statusGeral = 'EM_ATRASO';
      } else if (totalAguardando > 0) {
        statusGeral = 'AGUARDANDO';
      }

      return {
        id: uc.id, uc: uc.uc, numInstalacao: uc.numInstalacao,
        filial: uc.filial?.razaoSocial, filialId: uc.filial?.id,
        fornecedor: uc.fornecedor?.nome, fornecedorId: uc.fornecedor?.id,
        diaEmissao: uc.diaEmissao, prazoVencimento: uc.prazoVencimento,
        meses, statusGeral, totalCriticos, totalAtrasos, totalAguardando, valorTotal,
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
      return mesDado ? mesDado.status : 'SEM_LANCAMENTO';
    });

    const lancadas = statusDoMesAtual.filter(s => ['OK', 'EM_ANDAMENTO', 'PROXIMO_VENCIMENTO'].includes(s)).length;
    const criticas = statusDoMesAtual.filter(s => s === 'CRITICO').length;
    const emAtraso = statusDoMesAtual.filter(s => s === 'ATRASO').length;

    const faturamentoAno = faturas
      .filter(f => f.status !== 'REJEITADA')
      .reduce((s, f) => s + (Number(f.valor) || 0), 0);

    const totalOmissoesCriticas = matriz.reduce(
      (s, uc) => s + uc.meses.filter(m => m.status === 'CRITICO').length, 0
    );

    const cobertura = totalUCs > 0 ? Math.round((lancadas / totalUCs) * 100) : 0;

    const indicadores = {
      mesReferencia: mesAtualRef, totalUCs, cobertura,
      lancadas: { quantidade: lancadas, percentual: totalUCs > 0 ? Math.round((lancadas / totalUCs) * 100) : 0 },
      criticas: { quantidade: criticas },
      emAtraso: { quantidade: emAtraso },
      omissoesCriticas: totalOmissoesCriticas, faturamentoAno,
      ucsCriticas: matriz.filter(uc => uc.statusGeral === 'CRITICO').length,
      ucsEmDia: matriz.filter(uc => uc.statusGeral === 'EM_DIA').length,
      ucsAguardando: matriz.filter(uc => uc.statusGeral === 'AGUARDANDO').length,
    };

    // Notificacoes
    const notificacoes = [];
    const hoje = now.toISOString().split('T')[0];

    const ucsCriticasList = matriz.filter(uc => uc.statusGeral === 'CRITICO');
    if (ucsCriticasList.length > 0) {
      notificacoes.push({
        tipo: 'CRITICO', data: hoje,
        mensagem: `${ucsCriticasList.length} UC(s) em situacao CRITICA`,
        detalhe: ucsCriticasList.slice(0, 10).map(u => u.uc).join(', ') + (ucsCriticasList.length > 10 ? ` (+${ucsCriticasList.length - 10})` : ''),
      });
    }

    const ucsMesCritico = matriz.filter(uc => {
      const mesAtual = uc.meses.find(m => m.mes === mesAtualNum);
      return mesAtual && mesAtual.status === 'CRITICO';
    });
    if (ucsMesCritico.length > 0) {
      notificacoes.push({
        tipo: 'ALERTA', data: hoje,
        mensagem: `${ucsMesCritico.length} fatura(s) ultrapassaram 50% do prazo sem lancamento`,
        detalhe: ucsMesCritico.slice(0, 10).map(u => u.uc).join(', '),
      });
    }

    const ucsProximas = matriz.filter(uc => {
      const mesAtual = uc.meses.find(m => m.mes === mesAtualNum);
      return mesAtual && mesAtual.status === 'PROXIMO_VENCIMENTO';
    });
    if (ucsProximas.length > 0) {
      notificacoes.push({
        tipo: 'AVISO', data: hoje,
        mensagem: `${ucsProximas.length} fatura(s) vencem nos proximos 5 dias`,
        detalhe: ucsProximas.slice(0, 10).map(u => u.uc).join(', '),
      });
    }

    // Filtros
    const filiais = await prisma.filial.findMany({
      where: { ativo: true }, select: { id: true, razaoSocial: true }, orderBy: { razaoSocial: 'asc' },
    });
    const fornecedores = await prisma.fornecedor.findMany({
      where: { ativo: true }, select: { id: true, nome: true }, orderBy: { nome: 'asc' },
    });

    res.json({ ano: anoRef, indicadores, matriz, notificacoes, filtros: { filiais, fornecedores } });
  } catch (err) {
    logger.error('GET /api/checkout', err);
    res.status(500).json({ error: true, message: 'Erro ao gerar checkout de faturas' });
  }
});

// GET /api/checkout/detalhe/:ucId/:ref
router.get('/detalhe/:ucId/:ref', async (req, res) => {
  try {
    const { ucId, ref } = req.params;

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
    const meiaVida = calcMeiaVida(dataEmissao, dataVencimento);

    res.json({
      uc: {
        id: uc.id, uc: uc.uc, numInstalacao: uc.numInstalacao,
        filial: uc.filial?.razaoSocial, fornecedor: uc.fornecedor?.nome,
        diaEmissao: uc.diaEmissao, prazoVencimento: uc.prazoVencimento,
      },
      referencia: ref,
      ciclo: {
        dataEmissao: formatDate(dataEmissao),
        meiaVida: formatDate(meiaVida),
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
