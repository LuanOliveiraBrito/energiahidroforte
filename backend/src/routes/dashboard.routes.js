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
        // Calcular se está atrasada com base no prazoVencimento
        const [anoRef, mesRefNum] = mesRef.split('-').map(Number);
        let statusUC = 'PENDENTE';
        let dataVencimento = null;

        if (uc.diaEmissao && uc.prazoVencimento) {
          // Calcular: emissão + prazo = vencimento
          const ultimoDia = new Date(anoRef, mesRefNum, 0).getDate();
          const diaEmis = Math.min(uc.diaEmissao, ultimoDia);
          const dataEmissao = new Date(anoRef, mesRefNum - 1, diaEmis);
          dataVencimento = new Date(dataEmissao);
          dataVencimento.setDate(dataVencimento.getDate() + uc.prazoVencimento);

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
          prazoVencimento: uc.prazoVencimento,
          diaEmissao: uc.diaEmissao,
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

module.exports = router;
