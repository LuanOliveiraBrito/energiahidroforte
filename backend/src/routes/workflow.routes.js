const express = require('express');
const prisma = require('../config/database');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');
const { registrarLog } = require('../utils/auditLog');
const { atualizarHashVerificacao } = require('../utils/verificacaoHash');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authMiddleware);

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
  protocoladoPor: { select: { id: true, nome: true } },
  baixadoPor: { select: { id: true, nome: true } },
  estornadoPor: { select: { id: true, nome: true } },
};

// POST /api/workflow/aprovar-lote - Aprovar várias faturas de uma vez
router.post(
  '/aprovar-lote',
  authorize('ADMINISTRADOR', 'GERENTE_ADM', 'DIRETOR'),
  async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: true, message: 'Informe os IDs das faturas' });
      }

      const faturaIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));

      // Buscar faturas pendentes
      const faturas = await prisma.fatura.findMany({
        where: { id: { in: faturaIds }, status: 'PENDENTE' },
      });

      if (faturas.length === 0) {
        return res.status(400).json({ error: true, message: 'Nenhuma fatura pendente encontrada para aprovar' });
      }

      const idsParaAprovar = faturas.map(f => f.id);

      // Atualizar todas de uma vez
      await prisma.fatura.updateMany({
        where: { id: { in: idsParaAprovar } },
        data: {
          status: 'APROVADA',
          aprovadoPorId: req.userId,
          dataAprovacao: new Date(),
        },
      });

      // Registrar logs e atualizar hashes individualmente
      for (const fatura of faturas) {
        await registrarLog({
          userId: req.userId,
          faturaId: fatura.id,
          acao: 'APROVACAO',
          descricao: `Fatura #${fatura.id} aprovada em lote por ${req.userName}`,
          ip: req.ip,
        });
        await atualizarHashVerificacao(fatura.id);
      }

      res.json({
        message: `${faturas.length} fatura(s) aprovada(s) com sucesso`,
        aprovadas: faturas.length,
        ids: idsParaAprovar,
      });
    } catch (err) {
      logger.error('POST /api/workflow/aprovar-lote', err);
      res.status(500).json({ error: true, message: 'Erro ao aprovar faturas em lote' });
    }
  }
);

// POST /api/workflow/aprovar/:id - Aprovar fatura (PENDENTE -> APROVADA)
router.post(
  '/aprovar/:id',
  authorize('ADMINISTRADOR', 'GERENTE_ADM', 'DIRETOR'),
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

      if (fatura.status !== 'PENDENTE') {
        return res.status(400).json({
          error: true,
          message: `Fatura não pode ser aprovada. Status atual: ${fatura.status}`,
        });
      }

      const atualizada = await prisma.fatura.update({
        where: { id: faturaId },
        data: {
          status: 'APROVADA',
          aprovadoPorId: req.userId,
          dataAprovacao: new Date(),
        },
        include: faturaIncludes,
      });

      await registrarLog({
        userId: req.userId,
        faturaId,
        acao: 'APROVACAO',
        descricao: `Fatura #${id} aprovada por ${req.userName}`,
        ip: req.ip,
      });

      // Gerar/atualizar hash de verificação criptográfica
      await atualizarHashVerificacao(faturaId);

      res.json(atualizada);
    } catch (err) {
      logger.error('POST /api/workflow/aprovar', err);
      res.status(500).json({ error: true, message: 'Erro ao aprovar fatura' });
    }
  }
);

// POST /api/workflow/rejeitar/:id - Rejeitar fatura
router.post(
  '/rejeitar/:id',
  authorize('ADMINISTRADOR', 'GERENTE_ADM', 'DIRETOR'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      if (!motivo) {
        return res.status(400).json({ error: true, message: 'Motivo da rejeição é obrigatório' });
      }

      const faturaId = parseInt(id);
      if (isNaN(faturaId)) {
        return res.status(400).json({ error: true, message: 'ID inválido' });
      }

      const fatura = await prisma.fatura.findUnique({ where: { id: faturaId } });

      if (!fatura) {
        return res.status(404).json({ error: true, message: 'Fatura não encontrada' });
      }

      if (fatura.status !== 'PENDENTE') {
        return res.status(400).json({
          error: true,
          message: `Fatura não pode ser rejeitada. Status atual: ${fatura.status}`,
        });
      }

      const atualizada = await prisma.fatura.update({
        where: { id: faturaId },
        data: {
          status: 'REJEITADA',
          motivoRejeicao: motivo,
          aprovadoPorId: req.userId,
          dataAprovacao: new Date(),
        },
        include: faturaIncludes,
      });

      await registrarLog({
        userId: req.userId,
        faturaId,
        acao: 'REJEICAO',
        descricao: `Fatura #${id} rejeitada por ${req.userName}. Motivo: ${motivo}`,
        ip: req.ip,
      });

      res.json(atualizada);
    } catch (err) {
      res.status(500).json({ error: true, message: 'Erro ao rejeitar fatura' });
    }
  }
);

// POST /api/workflow/protocolar/:id - Registrar protocolo (APROVADA -> PROTOCOLADA)
router.post(
  '/protocolar/:id',
  authorize('ADMINISTRADOR', 'ADMINISTRATIVO'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { numeroProtocolo } = req.body;

      if (!numeroProtocolo || !numeroProtocolo.trim()) {
        return res.status(400).json({ error: true, message: 'Número do protocolo é obrigatório' });
      }

      const faturaId = parseInt(id);
      if (isNaN(faturaId)) {
        return res.status(400).json({ error: true, message: 'ID inválido' });
      }

      const fatura = await prisma.fatura.findUnique({ where: { id: faturaId } });

      if (!fatura) {
        return res.status(404).json({ error: true, message: 'Fatura não encontrada' });
      }

      if (fatura.status !== 'APROVADA') {
        return res.status(400).json({
          error: true,
          message: `Fatura não pode ser protocolada. Status atual: ${fatura.status}`,
        });
      }

      const atualizada = await prisma.fatura.update({
        where: { id: faturaId },
        data: {
          status: 'PROTOCOLADA',
          numeroProtocolo: numeroProtocolo.trim(),
          protocoladoPorId: req.userId,
          dataProtocolo: new Date(),
        },
        include: faturaIncludes,
      });

      await registrarLog({
        userId: req.userId,
        faturaId,
        acao: 'PROTOCOLO',
        descricao: `Fatura #${id} protocolada por ${req.userName}. Protocolo: ${numeroProtocolo.trim()}`,
        ip: req.ip,
      });

      // Gerar/atualizar hash de verificação criptográfica
      await atualizarHashVerificacao(faturaId);

      res.json(atualizada);
    } catch (err) {
      logger.error('POST /api/workflow/protocolar', err);
      res.status(500).json({ error: true, message: 'Erro ao protocolar fatura' });
    }
  }
);

// POST /api/workflow/baixar/:id - Confirmar pagamento/baixa (PROTOCOLADA -> PAGA)
router.post(
  '/baixar/:id',
  authorize('ADMINISTRADOR', 'FINANCEIRO'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { dataPagamento } = req.body || {};

      const faturaId = parseInt(id);
      if (isNaN(faturaId)) {
        return res.status(400).json({ error: true, message: 'ID inválido' });
      }

      const fatura = await prisma.fatura.findUnique({ where: { id: faturaId } });

      if (!fatura) {
        return res.status(404).json({ error: true, message: 'Fatura não encontrada' });
      }

      if (fatura.status !== 'PROTOCOLADA') {
        return res.status(400).json({
          error: true,
          message: `Fatura não pode ser baixada. Status atual: ${fatura.status}`,
        });
      }

      // Usa a data informada pelo usuário ou a data atual como fallback
      const dataBaixa = dataPagamento ? new Date(dataPagamento + 'T12:00:00') : new Date();

      const atualizada = await prisma.fatura.update({
        where: { id: faturaId },
        data: {
          status: 'PAGA',
          baixadoPorId: req.userId,
          dataBaixa,
        },
        include: faturaIncludes,
      });

      await registrarLog({
        userId: req.userId,
        faturaId,
        acao: 'BAIXA',
        descricao: `Fatura #${id} paga/baixada por ${req.userName}`,
        ip: req.ip,
      });

      // Gerar/atualizar hash de verificação criptográfica
      await atualizarHashVerificacao(faturaId);

      res.json(atualizada);
    } catch (err) {
      res.status(500).json({ error: true, message: 'Erro ao baixar fatura' });
    }
  }
);

// POST /api/workflow/estornar/:id - Estornar fatura paga (PAGA -> PROTOCOLADA)
router.post(
  '/estornar/:id',
  authorize('ADMINISTRADOR', 'FINANCEIRO'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      if (!motivo || !motivo.trim()) {
        return res.status(400).json({ error: true, message: 'O motivo do estorno é obrigatório' });
      }

      const faturaId = parseInt(id);
      if (isNaN(faturaId)) {
        return res.status(400).json({ error: true, message: 'ID inválido' });
      }

      const fatura = await prisma.fatura.findUnique({
        where: { id: faturaId },
        include: { fornecedor: { select: { nome: true } }, baixadoPor: { select: { nome: true } } },
      });

      if (!fatura) {
        return res.status(404).json({ error: true, message: 'Fatura não encontrada' });
      }

      if (fatura.status !== 'PAGA') {
        return res.status(400).json({
          error: true,
          message: `Somente faturas com status PAGA podem ser estornadas. Status atual: ${fatura.status}`,
        });
      }

      // Estornar: volta para PROTOCOLADA, limpa dados de baixa, registra estorno
      const atualizada = await prisma.fatura.update({
        where: { id: faturaId },
        data: {
          status: 'PROTOCOLADA',
          // Limpa dados da baixa anterior
          baixadoPorId: null,
          dataBaixa: null,
          // Registra dados do estorno
          estornadoPorId: req.userId,
          dataEstorno: new Date(),
          motivoEstorno: motivo.trim(),
        },
        include: faturaIncludes,
      });

      // Log detalhado para auditoria completa
      const baixadoPorNome = fatura.baixadoPor?.nome || 'N/A';
      const dataBaixaOriginal = fatura.dataBaixa
        ? new Date(fatura.dataBaixa).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        : 'N/A';

      await registrarLog({
        userId: req.userId,
        faturaId,
        acao: 'ESTORNO',
        descricao: `Fatura #${id} ESTORNADA por ${req.userName}. Motivo: ${motivo.trim()}. Baixa original: ${dataBaixaOriginal} por ${baixadoPorNome}. Valor: R$ ${Number(fatura.valor || 0).toFixed(2)}`,
        ip: req.ip,
      });

      // Atualizar hash (novo hash com status PROTOCOLADA)
      await atualizarHashVerificacao(faturaId);

      res.json(atualizada);
    } catch (err) {
      logger.error('POST /api/workflow/estornar', err);
      res.status(500).json({ error: true, message: 'Erro ao estornar fatura' });
    }
  }
);

module.exports = router;
