const express = require('express');
const prisma = require('../config/database');
const { authMiddleware } = require('../middlewares/auth.middleware');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authMiddleware);

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Totais
    const [totalPendente, totalPago, mediaKwh, faturasMes, gastosPorMes] = await Promise.all([
      // Total pendente (tudo que não é PAGA nem REJEITADA)
      prisma.fatura.aggregate({
        _sum: { valor: true },
        where: { status: { notIn: ['PAGA', 'REJEITADA'] } },
      }),

      // Total pago
      prisma.fatura.aggregate({
        _sum: { valor: true },
        where: { status: 'PAGA' },
      }),

      // Média kWh (excluindo REJEITADAS)
      prisma.fatura.aggregate({
        _avg: { leituraKwh: true },
        where: { leituraKwh: { not: null }, status: { not: 'REJEITADA' } },
      }),

      // Faturas do mês atual (excluindo REJEITADAS)
      prisma.fatura.count({
        where: { referencia: mesAtual, status: { not: 'REJEITADA' } },
      }),

      // Gastos por mês (últimos 12 meses, excluindo REJEITADAS)
      prisma.$queryRaw`
        SELECT referencia, SUM(valor) as total, AVG(leitura_kwh) as media_kwh
        FROM faturas
        WHERE status != 'REJEITADA'
        GROUP BY referencia
        ORDER BY referencia DESC
        LIMIT 12
      `,
    ]);

    // Status breakdown
    const statusCounts = await prisma.fatura.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { valor: true },
    });

    res.json({
      totalPendente: totalPendente._sum.valor || 0,
      totalPago: totalPago._sum.valor || 0,
      mediaKwh: Math.round(mediaKwh._avg.leituraKwh || 0),
      faturasMes,
      gastosPorMes: gastosPorMes.reverse(),
      statusBreakdown: statusCounts.map((s) => ({
        status: s.status,
        count: s._count.id,
        total: s._sum.valor || 0,
      })),
    });
  } catch (err) {
    logger.error('GET /api/dashboard', err);
    res.status(500).json({ error: true, message: 'Erro ao carregar dashboard' });
  }
});

// GET /api/dashboard/ucs-pendentes - UCs sem fatura lançada no mês atual
router.get('/ucs-pendentes', async (req, res) => {
  try {
    const now = new Date();
    const { mes } = req.query; // formato: "2026-02" (opcional, default: mês atual)

    const mesRef = mes || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Buscar todas UCs ativas com dia de vencimento cadastrado
    const todasUCs = await prisma.unidadeConsumidora.findMany({
      where: { ativo: true },
      include: {
        filial: { select: { id: true, razaoSocial: true } },
        fornecedor: { select: { id: true, nome: true } },
      },
      orderBy: { uc: 'asc' },
    });

    // Buscar faturas lançadas para o mês de referência
    const faturasDoMes = await prisma.fatura.findMany({
      where: { referencia: mesRef },
      select: { ucId: true, status: true, valor: true },
    });

    const ucIdsComFatura = new Set(faturasDoMes.map(f => f.ucId));

    // Montar lista de UCs pendentes (sem fatura lançada)
    const ucsPendentes = todasUCs
      .filter(uc => !ucIdsComFatura.has(uc.id))
      .map(uc => {
        // Calcular se está atrasada com base no diaVencimento
        const [anoRef, mesRefNum] = mesRef.split('-').map(Number);
        let statusUC = 'PENDENTE';
        let dataVencimento = null;

        if (uc.diaVencimento) {
          // Ajustar dia para meses com menos dias (ex: fev 28/29)
          const ultimoDia = new Date(anoRef, mesRefNum, 0).getDate();
          const dia = Math.min(uc.diaVencimento, ultimoDia);
          dataVencimento = new Date(anoRef, mesRefNum - 1, dia);

          if (now > dataVencimento) {
            statusUC = 'ATRASADA';
          } else {
            // Calcular dias restantes
            const diffMs = dataVencimento.getTime() - now.getTime();
            const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            if (diffDias <= 5) {
              statusUC = 'PROXIMO_VENCIMENTO'; // menos de 5 dias
            }
          }
        }

        return {
          id: uc.id,
          uc: uc.uc,
          numInstalacao: uc.numInstalacao,
          diaVencimento: uc.diaVencimento,
          dataVencimento: dataVencimento ? dataVencimento.toISOString().split('T')[0] : null,
          filial: uc.filial?.razaoSocial,
          fornecedor: uc.fornecedor?.nome,
          statusUC,
        };
      });

    // Resumo
    const totalUCs = todasUCs.length;
    const totalComFatura = ucIdsComFatura.size;
    const totalPendentes = ucsPendentes.length;
    const totalAtrasadas = ucsPendentes.filter(u => u.statusUC === 'ATRASADA').length;
    const totalProximas = ucsPendentes.filter(u => u.statusUC === 'PROXIMO_VENCIMENTO').length;

    res.json({
      mesReferencia: mesRef,
      resumo: {
        totalUCs,
        totalComFatura,
        totalPendentes,
        totalAtrasadas,
        totalProximas,
      },
      ucsPendentes,
    });
  } catch (err) {
    logger.error('GET /api/dashboard/ucs-pendentes', err);
    res.status(500).json({ error: true, message: 'Erro ao buscar UCs pendentes' });
  }
});

// GET /api/dashboard/checkout - Matriz de conformidade anual + indicadores
router.get('/checkout', async (req, res) => {
  try {
    const now = new Date();
    const { ano } = req.query;
    const anoRef = parseInt(ano) || now.getFullYear();
    const mesAtualNum = now.getMonth() + 1; // 1-12
    const mesAtualRef = `${anoRef}-${String(mesAtualNum).padStart(2, '0')}`;

    // 1. Buscar todas UCs ativas
    const todasUCs = await prisma.unidadeConsumidora.findMany({
      where: { ativo: true },
      include: {
        filial: { select: { razaoSocial: true } },
        fornecedor: { select: { nome: true } },
      },
      orderBy: { uc: 'asc' },
    });

    // 2. Buscar UCs que já tiveram pelo menos 1 fatura (qualquer período)
    const ucsComFatura = await prisma.fatura.groupBy({
      by: ['ucId'],
    });
    const ucsComFaturaIds = new Set(ucsComFatura.map(f => f.ucId));

    // Filtrar apenas UCs que já tiveram algum lançamento
    const ucsAtivas = todasUCs.filter(uc => ucsComFaturaIds.has(uc.id));

    // 3. Buscar todas faturas do ano (excluindo REJEITADAS para cálculos financeiros)
    const faturas = await prisma.fatura.findMany({
      where: {
        referencia: {
          gte: `${anoRef}-01`,
          lte: `${anoRef}-12`,
        },
        status: { not: 'REJEITADA' },
      },
      select: {
        id: true,
        ucId: true,
        referencia: true,
        status: true,
        valor: true,
        vencimento: true,
        notaFiscal: true,
        leituraKwh: true,
      },
    });

    // 4. Indexar faturas por ucId + mês
    const faturaMap = {};
    for (const f of faturas) {
      const key = `${f.ucId}-${f.referencia}`;
      if (!faturaMap[key]) faturaMap[key] = [];
      faturaMap[key].push(f);
    }

    // 5. Montar matriz UC x Meses (apenas UCs com histórico)
    const matriz = ucsAtivas.map((uc) => {
      const meses = [];
      let statusGeral = 'EM_DIA';
      let temAtraso = false;
      let temCritico = false;
      let temAguardando = false;

      for (let m = 1; m <= 12; m++) {
        const ref = `${anoRef}-${String(m).padStart(2, '0')}`;
        const key = `${uc.id}-${ref}`;
        const fats = faturaMap[key] || [];

        let statusMes = 'SEM_LANCAMENTO';

        if (anoRef === now.getFullYear() && m > mesAtualNum) {
          // Mês futuro — não considerar
          statusMes = 'FUTURO';
        } else if (fats.length > 0) {
          const fat = fats[0];
          if (fat.status === 'PAGA') {
            statusMes = 'PAGO';
          } else if (fat.status === 'REJEITADA') {
            statusMes = 'REJEITADA';
            temAtraso = true;
          } else {
            // PENDENTE, APROVADA, LIBERADA — verificar se venceu
            const venc = new Date(fat.vencimento);
            if (now > venc) {
              statusMes = 'ATRASO';
              temAtraso = true;
            } else {
              const diffMs = venc.getTime() - now.getTime();
              const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              if (diffDias <= 5) {
                statusMes = 'PROXIMO_VENCIMENTO';
                temAguardando = true;
              } else {
                statusMes = 'EM_ANDAMENTO';
              }
            }
          }
        } else {
          // Sem fatura lançada — não é atraso, apenas sem lançamento
          // Atraso só entra após ter uma fatura lançada (rejeitada, vencida etc.)
          statusMes = 'SEM_LANCAMENTO';
        }

        meses.push({ mes: m, ref, status: statusMes, diaVenc: uc.diaVencimento, valor: fats[0]?.valor || null, notaFiscal: fats[0]?.notaFiscal || null, faturaId: fats[0]?.id || null, qtdFaturas: fats.length });
      }

      // Contar meses com atraso para determinar criticidade
      const mesesAtraso = meses.filter(m => m.status === 'ATRASO').length;
      if (mesesAtraso >= 3) {
        temCritico = true;
        statusGeral = 'CRITICO';
      } else if (temAtraso) {
        statusGeral = 'EM_ATRASO';
      } else if (temAguardando) {
        statusGeral = 'AGUARDANDO';
      }

      return {
        id: uc.id,
        uc: uc.uc,
        numInstalacao: uc.numInstalacao,
        filial: uc.filial?.razaoSocial,
        fornecedor: uc.fornecedor?.nome,
        diaVencimento: uc.diaVencimento,
        meses,
        statusGeral,
      };
    });

    // 5. Indicadores do mês atual
    const totalUCs = todasUCs.length;
    const ucsMesAtual = matriz.map(uc => {
      const mesDado = uc.meses.find(m => m.mes === mesAtualNum);
      return mesDado ? mesDado.status : 'SEM_LANCAMENTO';
    });

    const lancadas = ucsMesAtual.filter(s => ['PAGO', 'EM_ANDAMENTO'].includes(s)).length;
    const aguardando = ucsMesAtual.filter(s => ['AGUARDANDO', 'PROXIMO_VENCIMENTO'].includes(s)).length;
    const emAtraso = ucsMesAtual.filter(s => s === 'ATRASO').length;

    const indicadores = {
      mesReferencia: mesAtualRef,
      totalUCs,
      lancadas: { quantidade: lancadas, percentual: totalUCs > 0 ? Math.round((lancadas / totalUCs) * 100) : 0 },
      aguardando: { quantidade: aguardando, percentual: totalUCs > 0 ? Math.round((aguardando / totalUCs) * 100) : 0 },
      emAtraso: { quantidade: emAtraso, percentual: totalUCs > 0 ? Math.round((emAtraso / totalUCs) * 100) : 0 },
      faturamentoAno: faturas.reduce((s, f) => s + (Number(f.valor) || 0), 0),
      omissoesCriticas: matriz.reduce((s, uc) => s + uc.meses.filter(m => m.status === 'ATRASO').length, 0),
    };

    // 6. Notificações simuladas (baseadas em dados reais)
    const notificacoes = [];
    const hoje = now.toISOString().split('T')[0];

    // UCs com atraso
    const ucsAtrasadas = matriz.filter(uc => {
      const mesAtual = uc.meses.find(m => m.mes === mesAtualNum);
      return mesAtual && mesAtual.status === 'ATRASO';
    });
    if (ucsAtrasadas.length > 0) {
      notificacoes.push({
        tipo: 'ALERTA',
        data: hoje,
        mensagem: `${ucsAtrasadas.length} fatura(s) vencida(s) detectada(s) sem lançamento`,
        detalhe: ucsAtrasadas.map(u => u.uc).join(', '),
      });
    }

    // UCs próximo do vencimento
    const ucsProximas = matriz.filter(uc => {
      const mesAtual = uc.meses.find(m => m.mes === mesAtualNum);
      return mesAtual && mesAtual.status === 'PROXIMO_VENCIMENTO';
    });
    if (ucsProximas.length > 0) {
      notificacoes.push({
        tipo: 'AVISO',
        data: hoje,
        mensagem: `${ucsProximas.length} fatura(s) vencem nos próximos 5 dias`,
        detalhe: ucsProximas.map(u => u.uc).join(', '),
      });
    }

    // UCs críticas
    const ucsCriticas = matriz.filter(uc => uc.statusGeral === 'CRITICO');
    if (ucsCriticas.length > 0) {
      notificacoes.push({
        tipo: 'CRITICO',
        data: hoje,
        mensagem: `${ucsCriticas.length} UC(s) em situação CRÍTICA (3+ meses sem fatura)`,
        detalhe: ucsCriticas.map(u => u.uc).join(', '),
      });
    }

    // Lançamentos do dia
    const inicioDia = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fimDia = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const faturasHoje = await prisma.fatura.count({
      where: { dataLancamento: { gte: inicioDia, lte: fimDia }, status: { not: 'REJEITADA' } },
    });
    if (faturasHoje > 0) {
      notificacoes.push({
        tipo: 'INFO',
        data: hoje,
        mensagem: `${faturasHoje} fatura(s) lançada(s) hoje`,
      });
    }

    res.json({
      ano: anoRef,
      indicadores,
      matriz,
      notificacoes,
    });
  } catch (err) {
    logger.error('GET /api/dashboard/checkout', err);
    res.status(500).json({ error: true, message: 'Erro ao gerar checkout de faturas' });
  }
});

module.exports = router;
