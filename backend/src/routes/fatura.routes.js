const express = require('express');
const prisma = require('../config/database');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');
const logger = require('../utils/logger');

// Todos os perfis com acesso a Lançar Fatura
const TODOS_PERFIS = ['ADMINISTRADOR', 'ADMINISTRATIVO', 'GERENTE_ADM', 'DIRETOR', 'FINANCEIRO'];
const upload = require('../middlewares/upload.middleware');
const { registrarLog } = require('../utils/auditLog');

const router = express.Router();

router.use(authMiddleware);

// Incluir relações padrão em consultas de fatura
const faturaIncludes = {
  uc: { select: { id: true, uc: true, numInstalacao: true } },
  fornecedor: { select: { id: true, nome: true, cnpj: true } },
  filial: { select: { id: true, razaoSocial: true, cnpj: true } },
  centroCusto: { select: { id: true, numero: true, descricao: true } },
  contaContabil: { select: { id: true, numero: true, descricao: true } },
  natureza: { select: { id: true, descricao: true } },
  lancadoPor: { select: { id: true, nome: true } },
  aprovadoPor: { select: { id: true, nome: true } },
  liberadoPor: { select: { id: true, nome: true } },
  baixadoPor: { select: { id: true, nome: true } },
  estornadoPor: { select: { id: true, nome: true } },
};

// GET /api/faturas - Listar faturas com filtros
router.get('/', async (req, res) => {
  try {
    const { status, ucId, fornecedorId, filialId, referencia, page = 1, limit = 50 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (ucId) where.ucId = parseInt(ucId);
    if (fornecedorId) where.fornecedorId = parseInt(fornecedorId);
    if (filialId) where.filialId = parseInt(filialId);
    if (referencia) where.referencia = referencia;

    const [faturas, total] = await Promise.all([
      prisma.fatura.findMany({
        where,
        include: faturaIncludes,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.fatura.count({ where }),
    ]);

    res.json({
      data: faturas,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.error('GET /api/faturas', err);
    res.status(500).json({ error: true, message: 'Erro ao buscar faturas' });
  }
});

// GET /api/faturas/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: true, message: 'ID inválido' });
    }

    const fatura = await prisma.fatura.findUnique({
      where: { id },
      include: faturaIncludes,
    });

    if (!fatura) {
      return res.status(404).json({ error: true, message: 'Fatura não encontrada' });
    }

    res.json(fatura);
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao buscar fatura' });
  }
});

// POST /api/faturas - Lançar fatura
router.post(
  '/',
  authorize(...TODOS_PERFIS),
  upload.fields([
    { name: 'anexoFatura', maxCount: 1 },
    { name: 'anexoPedidoCompras', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        ucId,
        fornecedorId,
        filialId,
        centroCustoId,
        contaContabilId,
        naturezaId,
        notaFiscal,
        valor,
        leituraKwh,
        vencimento,
        referencia,
        pedidoCompras,
        formaPagamento,
        aplicacao,
        codigoBarras,
        vencimentoBoleto,
        dataEmissao,
      } = req.body;

      // Validações básicas
      if (!ucId || !fornecedorId || !filialId || !centroCustoId || !contaContabilId || !naturezaId || !valor || !vencimento || !referencia || !notaFiscal || !dataEmissao || !leituraKwh || !aplicacao || !pedidoCompras) {
        return res.status(400).json({ error: true, message: 'Todos os campos são obrigatórios' });
      }

      // Validar tipos numéricos
      const valorNum = parseFloat(valor);
      const leituraNum = parseFloat(leituraKwh);
      if (isNaN(valorNum) || valorNum <= 0) {
        return res.status(400).json({ error: true, message: 'Valor deve ser um número positivo' });
      }
      if (isNaN(leituraNum) || leituraNum < 0) {
        return res.status(400).json({ error: true, message: 'Leitura kWh deve ser um número válido' });
      }

      // Validar data de emissão
      const dataEmissaoDate = new Date(dataEmissao);
      if (isNaN(dataEmissaoDate.getTime())) {
        return res.status(400).json({ error: true, message: 'Data de emissão inválida' });
      }

      // Validar data de vencimento
      const vencimentoDate = new Date(vencimento);
      if (isNaN(vencimentoDate.getTime())) {
        return res.status(400).json({ error: true, message: 'Data de vencimento inválida' });
      }

      if (!req.files?.anexoFatura?.[0]) {
        return res.status(400).json({ error: true, message: 'Anexo da fatura (PDF) é obrigatório' });
      }

      // Validação de duplicidade de Nota Fiscal (ignora faturas REJEITADAS)
      if (notaFiscal && notaFiscal.trim()) {
        const nfExistente = await prisma.fatura.findFirst({
          where: { notaFiscal: notaFiscal.trim(), status: { not: 'REJEITADA' } },
          select: { id: true, referencia: true, valor: true, uc: { select: { uc: true } } },
        });
        if (nfExistente) {
          return res.status(409).json({
            error: true,
            message: `Duplicidade detectada: Nota Fiscal "${notaFiscal.trim()}" já está cadastrada na fatura #${nfExistente.id} (UC: ${nfExistente.uc?.uc || '-'}, Ref: ${nfExistente.referencia || '-'}, Valor: R$ ${Number(nfExistente.valor).toFixed(2)})`,
          });
        }
      }

      const fatura = await prisma.fatura.create({
        data: {
          ucId: parseInt(ucId),
          fornecedorId: parseInt(fornecedorId),
          filialId: parseInt(filialId),
          centroCustoId: parseInt(centroCustoId),
          contaContabilId: parseInt(contaContabilId),
          naturezaId: parseInt(naturezaId),
          notaFiscal: notaFiscal.trim(),
          valor: valorNum,
          leituraKwh: leituraNum,
          vencimento: vencimentoDate,
          referencia,
          pedidoCompras: pedidoCompras.trim(),
          formaPagamento: formaPagamento || null,
          aplicacao,
          dataEmissao: dataEmissaoDate,
          codigoBarras: codigoBarras || null,
          vencimentoBoleto: vencimentoBoleto || null,
          anexoFatura: req.files?.anexoFatura?.[0]?.filename || null,
          anexoPedidoCompras: req.files?.anexoPedidoCompras?.[0]?.filename || null,
          lancadoPorId: req.userId,
          status: 'PENDENTE',
        },
        include: faturaIncludes,
      });

      await registrarLog({
        userId: req.userId,
        faturaId: fatura.id,
        acao: 'LANCAMENTO',
        descricao: `Fatura #${fatura.id} lançada - Valor: R$ ${parseFloat(valor).toFixed(2)} - Ref: ${referencia}`,
        ip: req.ip,
      });

      res.status(201).json(fatura);
    } catch (err) {
      logger.error('POST /api/faturas', err);
      res.status(500).json({ error: true, message: 'Erro ao lançar fatura' });
    }
  }
);

// DELETE /api/faturas/:id - Excluir fatura (apenas ADMINISTRADOR)
router.delete(
  '/:id',
  authorize('ADMINISTRADOR'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const faturaId = parseInt(id);

      if (isNaN(faturaId)) {
        return res.status(400).json({ error: true, message: 'ID inválido' });
      }

      const fatura = await prisma.fatura.findUnique({ where: { id: faturaId } });

      if (!fatura) {
        return res.status(404).json({ error: true, message: 'Fatura não encontrada' });
      }

      // Deletar arquivos anexos do disco
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

      if (fatura.anexoFatura) {
        const filePath = path.join(uploadsDir, fatura.anexoFatura);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      if (fatura.anexoPedidoCompras) {
        const filePath = path.join(uploadsDir, fatura.anexoPedidoCompras);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      // Deletar logs de auditoria vinculados à fatura
      await prisma.auditLog.deleteMany({ where: { faturaId } });

      // Deletar a fatura
      await prisma.fatura.delete({ where: { id: faturaId } });

      // Registrar log de exclusão (sem vínculo com fatura, pois ela já foi deletada)
      await registrarLog({
        userId: req.userId,
        faturaId: null,
        acao: 'EXCLUSAO',
        descricao: `Fatura #${id} excluída por ${req.userName} — Fornecedor: ${fatura.fornecedorId}, Valor: R$ ${Number(fatura.valor || 0).toFixed(2)}, Ref: ${fatura.referencia || '-'}`,
        ip: req.ip,
      });

      res.json({ message: 'Fatura excluída com sucesso' });
    } catch (err) {
      logger.error('DELETE /api/faturas/:id', err);
      res.status(500).json({ error: true, message: 'Erro ao excluir fatura' });
    }
  }
);

module.exports = router;
