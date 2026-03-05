const express = require('express');
const prisma = require('../config/database');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');
const ExcelJS = require('exceljs');

// Todos os perfis com acesso a Cadastros
const TODOS_PERFIS = ['ADMINISTRADOR', 'ADMINISTRATIVO', 'GERENTE_ADM', 'DIRETOR', 'FINANCEIRO'];
const { registrarLog } = require('../utils/auditLog');

const router = express.Router();

// Todas as rotas exigem autenticaÃ§Ã£o
router.use(authMiddleware);

// ========================
// FILIAIS
// ========================

// GET /api/cadastros/filiais
router.get('/filiais', async (req, res) => {
  try {
    const { page, limit, search } = req.query;

    // Se não tem paginação, retorna tudo (para selects)
    if (!page && !limit) {
      const filiais = await prisma.filial.findMany({
        where: { ativo: true },
        orderBy: { razaoSocial: 'asc' },
      });
      return res.json(filiais);
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * pageSize;

    const where = { ativo: true };
    if (search && search.trim()) {
      where.OR = [
        { razaoSocial: { contains: search.trim(), mode: 'insensitive' } },
        { cnpj: { contains: search.trim().replace(/\D/g, ''), mode: 'insensitive' } },
        { cidade: { contains: search.trim(), mode: 'insensitive' } },
        { estado: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [dados, total] = await Promise.all([
      prisma.filial.findMany({
        where,
        orderBy: { razaoSocial: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.filial.count({ where }),
    ]);

    res.json({
      data: dados,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao buscar filiais' });
  }
});

// POST /api/cadastros/filiais
router.post('/filiais', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const { razaoSocial, cnpj, estado, cidade } = req.body;

    if (!razaoSocial || !cnpj || !estado || !cidade) {
      return res.status(400).json({ error: true, message: 'Todos os campos sÃ£o obrigatÃ³rios' });
    }

    // Validar CNPJ (formato)
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      return res.status(400).json({ error: true, message: 'CNPJ invÃ¡lido' });
    }

    // Verificar se existe um registro inativo com o mesmo CNPJ
    const existente = await prisma.filial.findUnique({ where: { cnpj: cnpjLimpo } });

    let filial;
    if (existente && !existente.ativo) {
      // Reativar e atualizar dados
      filial = await prisma.filial.update({
        where: { id: existente.id },
        data: { razaoSocial, estado, cidade, ativo: true },
      });
    } else {
      filial = await prisma.filial.create({
        data: { razaoSocial, cnpj: cnpjLimpo, estado, cidade },
      });
    }

    await registrarLog({
      userId: req.userId,
      acao: 'CADASTRO_FILIAL',
      descricao: `Filial "${razaoSocial}" cadastrada`,
      ip: req.ip,
    });

    res.status(201).json(filial);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: true, message: 'CNPJ jÃ¡ cadastrado em uma filial ativa' });
    }
    res.status(500).json({ error: true, message: 'Erro ao salvar filial' });
  }
});

// PUT /api/cadastros/filiais/:id
router.put('/filiais/:id', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const { id } = req.params;
    const { razaoSocial, cnpj, estado, cidade } = req.body;

    const cnpjLimpo = cnpj ? cnpj.replace(/\D/g, '') : undefined;

    const filial = await prisma.filial.update({
      where: { id: parseInt(id) },
      data: {
        ...(razaoSocial && { razaoSocial }),
        ...(cnpjLimpo && { cnpj: cnpjLimpo }),
        ...(estado && { estado }),
        ...(cidade && { cidade }),
      },
    });

    await registrarLog({
      userId: req.userId,
      acao: 'EDICAO_FILIAL',
      descricao: `Filial ID ${id} editada`,
      ip: req.ip,
    });

    res.json(filial);
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao atualizar filial' });
  }
});

// DELETE /api/cadastros/filiais/:id (soft delete)
router.delete('/filiais/:id', authorize('ADMINISTRADOR'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.filial.update({
      where: { id: parseInt(id) },
      data: { ativo: false },
    });

    await registrarLog({
      userId: req.userId,
      acao: 'EXCLUSAO_FILIAL',
      descricao: `Filial ID ${id} desativada`,
      ip: req.ip,
    });

    res.json({ message: 'Filial desativada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao desativar filial' });
  }
});

// ========================
// FORNECEDORES
// ========================

router.get('/fornecedores', async (req, res) => {
  try {
    const fornecedores = await prisma.fornecedor.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });
    res.json(fornecedores);
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao buscar fornecedores' });
  }
});

router.post('/fornecedores', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const { nome, cnpj, tipoPagamento, banco, agencia, conta, tipoConta, op, chavePix, tipoChavePix } = req.body;

    if (!nome || !cnpj) {
      return res.status(400).json({ error: true, message: 'Nome e CNPJ sÃ£o obrigatÃ³rios' });
    }

    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      return res.status(400).json({ error: true, message: 'CNPJ invÃ¡lido' });
    }

    const dadosFornecedor = {
      nome,
      tipoPagamento: tipoPagamento || null,
      banco: tipoPagamento === 'TED' ? (banco || null) : null,
      agencia: tipoPagamento === 'TED' ? (agencia || null) : null,
      conta: tipoPagamento === 'TED' ? (conta || null) : null,
      tipoConta: tipoPagamento === 'TED' ? (tipoConta || null) : null,
      op: tipoPagamento === 'TED' ? (op || null) : null,
      chavePix: tipoPagamento === 'PIX' ? (chavePix || null) : null,
      tipoChavePix: tipoPagamento === 'PIX' ? (tipoChavePix || null) : null,
    };

    // Verificar se existe um registro inativo com o mesmo CNPJ
    const existente = await prisma.fornecedor.findUnique({ where: { cnpj: cnpjLimpo } });

    let fornecedor;
    if (existente && !existente.ativo) {
      // Reativar e atualizar dados
      fornecedor = await prisma.fornecedor.update({
        where: { id: existente.id },
        data: { ...dadosFornecedor, ativo: true },
      });
    } else {
      fornecedor = await prisma.fornecedor.create({
        data: { ...dadosFornecedor, cnpj: cnpjLimpo },
      });
    }

    await registrarLog({
      userId: req.userId,
      acao: 'CADASTRO_FORNECEDOR',
      descricao: `Fornecedor "${nome}" cadastrado`,
      ip: req.ip,
    });

    res.status(201).json(fornecedor);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: true, message: 'CNPJ jÃ¡ cadastrado em um fornecedor ativo' });
    }
    res.status(500).json({ error: true, message: 'Erro ao salvar fornecedor' });
  }
});

router.put('/fornecedores/:id', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cnpj, tipoPagamento, banco, agencia, conta, tipoConta, op, chavePix, tipoChavePix } = req.body;
    const cnpjLimpo = cnpj ? cnpj.replace(/\D/g, '') : undefined;

    const fornecedor = await prisma.fornecedor.update({
      where: { id: parseInt(id) },
      data: {
        ...(nome && { nome }),
        ...(cnpjLimpo && { cnpj: cnpjLimpo }),
        tipoPagamento: tipoPagamento || null,
        banco: tipoPagamento === 'TED' ? (banco || null) : null,
        agencia: tipoPagamento === 'TED' ? (agencia || null) : null,
        conta: tipoPagamento === 'TED' ? (conta || null) : null,
        tipoConta: tipoPagamento === 'TED' ? (tipoConta || null) : null,
        op: tipoPagamento === 'TED' ? (op || null) : null,
        chavePix: tipoPagamento === 'PIX' ? (chavePix || null) : null,
        tipoChavePix: tipoPagamento === 'PIX' ? (tipoChavePix || null) : null,
      },
    });

    await registrarLog({
      userId: req.userId,
      acao: 'EDICAO_FORNECEDOR',
      descricao: `Fornecedor ID ${id} editado`,
      ip: req.ip,
    });

    res.json(fornecedor);
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao atualizar fornecedor' });
  }
});

router.delete('/fornecedores/:id', authorize('ADMINISTRADOR'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.fornecedor.update({
      where: { id: parseInt(id) },
      data: { ativo: false },
    });

    await registrarLog({
      userId: req.userId,
      acao: 'EXCLUSAO_FORNECEDOR',
      descricao: `Fornecedor ID ${id} desativado`,
      ip: req.ip,
    });

    res.json({ message: 'Fornecedor desativado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao desativar fornecedor' });
  }
});

// ========================
// UNIDADES CONSUMIDORAS (UC)
// ========================

router.get('/unidades', async (req, res) => {
  try {
    const { page, limit, search } = req.query;

    // Se não tem paginação, retorna tudo (para selects)
    if (!page && !limit) {
      const unidades = await prisma.unidadeConsumidora.findMany({
        where: { ativo: true },
        include: {
          filial: { select: { id: true, razaoSocial: true } },
          fornecedor: { select: { id: true, nome: true, tipoPagamento: true } },
        },
        orderBy: { uc: 'asc' },
      });
      return res.json(unidades);
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * pageSize;

    const where = { ativo: true };
    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { uc: { contains: s, mode: 'insensitive' } },
        { numInstalacao: { contains: s, mode: 'insensitive' } },
        { filial: { razaoSocial: { contains: s, mode: 'insensitive' } } },
        { fornecedor: { nome: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [dados, total] = await Promise.all([
      prisma.unidadeConsumidora.findMany({
        where,
        include: {
          filial: { select: { id: true, razaoSocial: true } },
          fornecedor: { select: { id: true, nome: true, tipoPagamento: true } },
        },
        orderBy: { uc: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.unidadeConsumidora.count({ where }),
    ]);

    res.json({
      data: dados,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao buscar unidades' });
  }
});

router.post('/unidades', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const { uc, numInstalacao, filialId, fornecedorId, prazoVencimento, diaEmissao } = req.body;

    if (!uc || !numInstalacao || !filialId || !fornecedorId) {
      return res.status(400).json({ error: true, message: 'Todos os campos são obrigatórios' });
    }

    // Validar prazo de vencimento (dias da emissão até o vencimento)
    const prazoVenc = prazoVencimento ? parseInt(prazoVencimento) : null;
    if (prazoVenc !== null && (prazoVenc < 1 || prazoVenc > 120)) {
      return res.status(400).json({ error: true, message: 'Prazo de vencimento deve ser entre 1 e 120 dias' });
    }

    // Validar dia de emissão
    const diaEmis = diaEmissao ? parseInt(diaEmissao) : null;
    if (diaEmis !== null && (diaEmis < 1 || diaEmis > 31)) {
      return res.status(400).json({ error: true, message: 'Dia de emissão deve ser entre 1 e 31' });
    }

    // Verificar se existe UC inativa com o mesmo código
    const existente = await prisma.unidadeConsumidora.findUnique({ where: { uc } });

    let unidade;
    if (existente && !existente.ativo) {
      // Reativar e atualizar dados
      unidade = await prisma.unidadeConsumidora.update({
        where: { id: existente.id },
        data: {
          numInstalacao,
          filialId: parseInt(filialId),
          fornecedorId: parseInt(fornecedorId),
          prazoVencimento: prazoVenc,
          diaEmissao: diaEmis,
          ativo: true,
        },
        include: {
          filial: { select: { id: true, razaoSocial: true } },
          fornecedor: { select: { id: true, nome: true } },
        },
      });
    } else {
      unidade = await prisma.unidadeConsumidora.create({
        data: {
          uc,
          numInstalacao,
          filialId: parseInt(filialId),
          fornecedorId: parseInt(fornecedorId),
          prazoVencimento: prazoVenc,
          diaEmissao: diaEmis,
        },
        include: {
          filial: { select: { id: true, razaoSocial: true } },
          fornecedor: { select: { id: true, nome: true } },
        },
      });
    }

    await registrarLog({
      userId: req.userId,
      acao: 'CADASTRO_UC',
      descricao: `Unidade Consumidora "${uc}" cadastrada`,
      ip: req.ip,
    });

    res.status(201).json(unidade);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: true, message: 'UC jÃ¡ cadastrada em um registro ativo' });
    }
    res.status(500).json({ error: true, message: 'Erro ao salvar unidade' });
  }
});

router.put('/unidades/:id', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const { id } = req.params;
    const { uc, numInstalacao, filialId, fornecedorId, prazoVencimento, diaEmissao } = req.body;

    // Validar prazo de vencimento se informado
    const prazoVenc = prazoVencimento !== undefined && prazoVencimento !== '' ? parseInt(prazoVencimento) : undefined;
    if (prazoVenc !== undefined && prazoVenc !== null && (isNaN(prazoVenc) || prazoVenc < 1 || prazoVenc > 120)) {
      return res.status(400).json({ error: true, message: 'Prazo de vencimento deve ser entre 1 e 120 dias' });
    }

    // Validar dia de emissão se informado
    const diaEmis = diaEmissao !== undefined && diaEmissao !== '' ? parseInt(diaEmissao) : undefined;
    if (diaEmis !== undefined && diaEmis !== null && (isNaN(diaEmis) || diaEmis < 1 || diaEmis > 31)) {
      return res.status(400).json({ error: true, message: 'Dia de emissão deve ser entre 1 e 31' });
    }

    const unidade = await prisma.unidadeConsumidora.update({
      where: { id: parseInt(id) },
      data: {
        ...(uc && { uc }),
        ...(numInstalacao && { numInstalacao }),
        ...(filialId && { filialId: parseInt(filialId) }),
        ...(fornecedorId && { fornecedorId: parseInt(fornecedorId) }),
        ...(prazoVencimento !== undefined && { prazoVencimento: prazoVencimento === '' || prazoVencimento === null ? null : parseInt(prazoVencimento) }),
        ...(diaEmissao !== undefined && { diaEmissao: diaEmissao === '' || diaEmissao === null ? null : parseInt(diaEmissao) }),
      },
      include: {
        filial: { select: { id: true, razaoSocial: true } },
        fornecedor: { select: { id: true, nome: true } },
      },
    });

    await registrarLog({
      userId: req.userId,
      acao: 'EDICAO_UC',
      descricao: `UC ID ${id} editada`,
      ip: req.ip,
    });

    res.json(unidade);
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao atualizar unidade' });
  }
});

router.delete('/unidades/:id', authorize('ADMINISTRADOR'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.unidadeConsumidora.update({
      where: { id: parseInt(id) },
      data: { ativo: false },
    });

    await registrarLog({
      userId: req.userId,
      acao: 'EXCLUSAO_UC',
      descricao: `UC ID ${id} desativada`,
      ip: req.ip,
    });

    res.json({ message: 'UC desativada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao desativar UC' });
  }
});

// ========================
// CENTROS DE CUSTO
// ========================

router.get('/centros-custo', async (req, res) => {
  try {
    const { page, limit, search, filialId } = req.query;

    // Se não tem paginação, retorna tudo (para selects)
    if (!page && !limit) {
      const where = { ativo: true };
      if (filialId) where.filialId = parseInt(filialId);

      const dados = await prisma.centroCusto.findMany({
        where,
        orderBy: { numero: 'asc' },
        include: { filial: { select: { id: true, razaoSocial: true } } },
      });
      return res.json(dados);
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * pageSize;

    const where = { ativo: true };
    if (filialId) where.filialId = parseInt(filialId);
    if (search && search.trim()) {
      where.OR = [
        { numero: { contains: search.trim(), mode: 'insensitive' } },
        { descricao: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [dados, total] = await Promise.all([
      prisma.centroCusto.findMany({
        where,
        orderBy: { numero: 'asc' },
        skip,
        take: pageSize,
        include: { filial: { select: { id: true, razaoSocial: true } } },
      }),
      prisma.centroCusto.count({ where }),
    ]);

    res.json({
      data: dados,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao buscar centros de custo' });
  }
});

router.post('/centros-custo', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const { numero, descricao, filialId } = req.body;

    if (!numero || !descricao || !filialId) {
      return res.status(400).json({ error: true, message: 'Número, descrição e filial são obrigatórios' });
    }

    // Verificar se existe registro inativo com o mesmo número
    const existente = await prisma.centroCusto.findUnique({ where: { numero } });

    let cc;
    if (existente && !existente.ativo) {
      cc = await prisma.centroCusto.update({
        where: { id: existente.id },
        data: { descricao, filialId: parseInt(filialId), ativo: true },
        include: { filial: { select: { id: true, razaoSocial: true } } },
      });
    } else {
      cc = await prisma.centroCusto.create({
        data: { numero, descricao, filialId: parseInt(filialId) },
        include: { filial: { select: { id: true, razaoSocial: true } } },
      });
    }

    await registrarLog({
      userId: req.userId,
      acao: 'CADASTRO_CC',
      descricao: `Centro de Custo "${numero} - ${descricao}" cadastrado`,
      ip: req.ip,
    });

    res.status(201).json(cc);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: true, message: 'NÃºmero jÃ¡ cadastrado em um centro de custo ativo' });
    }
    res.status(500).json({ error: true, message: 'Erro ao salvar centro de custo' });
  }
});

router.put('/centros-custo/:id', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const { id } = req.params;
    const { numero, descricao, filialId } = req.body;

    const cc = await prisma.centroCusto.update({
      where: { id: parseInt(id) },
      data: {
        ...(numero && { numero }),
        ...(descricao && { descricao }),
        ...(filialId && { filialId: parseInt(filialId) }),
      },
      include: { filial: { select: { id: true, razaoSocial: true } } },
    });

    await registrarLog({
      userId: req.userId,
      acao: 'EDICAO_CC',
      descricao: `Centro de Custo ID ${id} editado`,
      ip: req.ip,
    });

    res.json(cc);
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao atualizar centro de custo' });
  }
});

router.delete('/centros-custo/:id', authorize('ADMINISTRADOR'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.centroCusto.update({
      where: { id: parseInt(id) },
      data: { ativo: false },
    });
    res.json({ message: 'Centro de custo desativado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao desativar centro de custo' });
  }
});

// ========================
// CONTAS CONTÃBEIS
// ========================

router.get('/contas-contabeis', async (req, res) => {
  try {
    const { page, limit, search } = req.query;

    // Se nÃ£o tem paginaÃ§Ã£o, retorna tudo (para selects)
    if (!page && !limit) {
      const dados = await prisma.contaContabil.findMany({
        where: { ativo: true },
        orderBy: { numero: 'asc' },
      });
      return res.json(dados);
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * pageSize;

    const where = { ativo: true };
    if (search && search.trim()) {
      where.OR = [
        { numero: { contains: search.trim(), mode: 'insensitive' } },
        { descricao: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [dados, total] = await Promise.all([
      prisma.contaContabil.findMany({
        where,
        orderBy: { numero: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.contaContabil.count({ where }),
    ]);

    res.json({
      data: dados,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao buscar contas contÃ¡beis' });
  }
});

router.post('/contas-contabeis', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const { numero, descricao } = req.body;

    if (!numero || !descricao) {
      return res.status(400).json({ error: true, message: 'NÃºmero e descriÃ§Ã£o sÃ£o obrigatÃ³rios' });
    }

    // Verificar se existe registro inativo com o mesmo nÃºmero
    const existente = await prisma.contaContabil.findUnique({ where: { numero } });

    let conta;
    if (existente && !existente.ativo) {
      conta = await prisma.contaContabil.update({
        where: { id: existente.id },
        data: { descricao, ativo: true },
      });
    } else {
      conta = await prisma.contaContabil.create({
        data: { numero, descricao },
      });
    }

    await registrarLog({
      userId: req.userId,
      acao: 'CADASTRO_CONTA',
      descricao: `Conta ContÃ¡bil "${numero} - ${descricao}" cadastrada`,
      ip: req.ip,
    });

    res.status(201).json(conta);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: true, message: 'NÃºmero jÃ¡ cadastrado em uma conta contÃ¡bil ativa' });
    }
    res.status(500).json({ error: true, message: 'Erro ao salvar conta contÃ¡bil' });
  }
});

router.put('/contas-contabeis/:id', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const { id } = req.params;
    const { numero, descricao } = req.body;

    const conta = await prisma.contaContabil.update({
      where: { id: parseInt(id) },
      data: {
        ...(numero && { numero }),
        ...(descricao && { descricao }),
      },
    });

    await registrarLog({
      userId: req.userId,
      acao: 'EDICAO_CONTA',
      descricao: `Conta ContÃ¡bil ID ${id} editada`,
      ip: req.ip,
    });

    res.json(conta);
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao atualizar conta contÃ¡bil' });
  }
});

router.delete('/contas-contabeis/:id', authorize('ADMINISTRADOR'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.contaContabil.update({
      where: { id: parseInt(id) },
      data: { ativo: false },
    });
    res.json({ message: 'Conta contÃ¡bil desativada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao desativar conta contÃ¡bil' });
  }
});

// ========================
// NATUREZAS
// ========================

router.get('/naturezas', async (req, res) => {
  try {
    const dados = await prisma.natureza.findMany({
      where: { ativo: true },
      orderBy: { descricao: 'asc' },
    });
    res.json(dados);
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao buscar naturezas' });
  }
});

router.post('/naturezas', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const { descricao } = req.body;

    if (!descricao) {
      return res.status(400).json({ error: true, message: 'DescriÃ§Ã£o Ã© obrigatÃ³ria' });
    }

    // Verificar se existe registro inativo com a mesma descriÃ§Ã£o
    const existente = await prisma.natureza.findUnique({ where: { descricao } });

    let natureza;
    if (existente && !existente.ativo) {
      natureza = await prisma.natureza.update({
        where: { id: existente.id },
        data: { ativo: true },
      });
    } else {
      natureza = await prisma.natureza.create({
        data: { descricao },
      });
    }

    await registrarLog({
      userId: req.userId,
      acao: 'CADASTRO_NATUREZA',
      descricao: `Natureza "${descricao}" cadastrada`,
      ip: req.ip,
    });

    res.status(201).json(natureza);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: true, message: 'Natureza jÃ¡ cadastrada em um registro ativo' });
    }
    res.status(500).json({ error: true, message: 'Erro ao salvar natureza' });
  }
});

router.put('/naturezas/:id', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao } = req.body;

    const natureza = await prisma.natureza.update({
      where: { id: parseInt(id) },
      data: { descricao },
    });

    await registrarLog({
      userId: req.userId,
      acao: 'EDICAO_NATUREZA',
      descricao: `Natureza ID ${id} editada`,
      ip: req.ip,
    });

    res.json(natureza);
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao atualizar natureza' });
  }
});

router.delete('/naturezas/:id', authorize('ADMINISTRADOR'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.natureza.update({
      where: { id: parseInt(id) },
      data: { ativo: false },
    });
    res.json({ message: 'Natureza desativada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao desativar natureza' });
  }
});

// ========================
// EXPORTAÇÃO EXCEL
// ========================

const HEADER_STYLE = {
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
  alignment: { horizontal: 'center', vertical: 'middle' },
  border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
};

function applyZebra(sheet, dataCount) {
  sheet.eachRow((row, idx) => {
    if (idx > 1 && idx <= dataCount + 1) {
      row.eachCell(cell => {
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        if (idx % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        }
      });
    }
  });
}

// GET /api/cadastros/filiais/export/excel
router.get('/filiais/export/excel', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const filiais = await prisma.filial.findMany({ where: { ativo: true }, orderBy: { razaoSocial: 'asc' } });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Voltaris Energy';
    const sheet = workbook.addWorksheet('Filiais');

    sheet.columns = [
      { header: 'Razão Social', key: 'razaoSocial', width: 40 },
      { header: 'CNPJ', key: 'cnpj', width: 22 },
      { header: 'Cidade', key: 'cidade', width: 25 },
      { header: 'UF', key: 'estado', width: 8 },
    ];
    sheet.getRow(1).eachCell(cell => { Object.assign(cell, HEADER_STYLE); });

    filiais.forEach(f => {
      const cnpj = f.cnpj ? f.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : '';
      sheet.addRow({ razaoSocial: f.razaoSocial, cnpj, cidade: f.cidade, estado: f.estado });
    });

    const totalRow = sheet.addRow({ razaoSocial: `Total: ${filiais.length} filiais`, cnpj: '', cidade: '', estado: '' });
    totalRow.font = { bold: true };
    applyZebra(sheet, filiais.length);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=filiais_${new Date().toISOString().slice(0, 10)}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao exportar filiais' });
  }
});

// GET /api/cadastros/unidades/export/excel
router.get('/unidades/export/excel', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const unidades = await prisma.unidadeConsumidora.findMany({
      where: { ativo: true },
      include: {
        filial: { select: { razaoSocial: true } },
        fornecedor: { select: { nome: true } },
      },
      orderBy: { uc: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Voltaris Energy';
    const sheet = workbook.addWorksheet('Unidades Consumidoras');

    sheet.columns = [
      { header: 'UC', key: 'uc', width: 20 },
      { header: 'Nº Instalação', key: 'numInstalacao', width: 20 },
      { header: 'Filial', key: 'filial', width: 35 },
      { header: 'Fornecedor', key: 'fornecedor', width: 30 },
      { header: 'Dia Emissão', key: 'diaEmissao', width: 14 },
      { header: 'Prazo (dias)', key: 'prazo', width: 14 },
    ];
    sheet.getRow(1).eachCell(cell => { Object.assign(cell, HEADER_STYLE); });

    unidades.forEach(u => {
      sheet.addRow({
        uc: u.uc,
        numInstalacao: u.numInstalacao || '',
        filial: u.filial?.razaoSocial || '',
        fornecedor: u.fornecedor?.nome || '',
        diaEmissao: u.diaEmissao || '',
        prazo: u.prazoVencimento || '',
      });
    });

    const totalRow = sheet.addRow({ uc: `Total: ${unidades.length} UCs`, numInstalacao: '', filial: '', fornecedor: '', diaEmissao: '', prazo: '' });
    totalRow.font = { bold: true };
    applyZebra(sheet, unidades.length);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=unidades_consumidoras_${new Date().toISOString().slice(0, 10)}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao exportar unidades' });
  }
});

// GET /api/cadastros/centros-custo/export/excel
router.get('/centros-custo/export/excel', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const centros = await prisma.centroCusto.findMany({
      where: { ativo: true },
      include: { filial: { select: { razaoSocial: true } } },
      orderBy: { numero: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Voltaris Energy';
    const sheet = workbook.addWorksheet('Centros de Custo');

    sheet.columns = [
      { header: 'Número', key: 'numero', width: 20 },
      { header: 'Descrição', key: 'descricao', width: 40 },
      { header: 'Filial', key: 'filial', width: 35 },
    ];
    sheet.getRow(1).eachCell(cell => { Object.assign(cell, HEADER_STYLE); });

    centros.forEach(c => {
      sheet.addRow({ numero: c.numero, descricao: c.descricao, filial: c.filial?.razaoSocial || '' });
    });

    const totalRow = sheet.addRow({ numero: `Total: ${centros.length} centros de custo`, descricao: '', filial: '' });
    totalRow.font = { bold: true };
    applyZebra(sheet, centros.length);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=centros_custo_${new Date().toISOString().slice(0, 10)}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao exportar centros de custo' });
  }
});

// GET /api/cadastros/contas-contabeis/export/excel
router.get('/contas-contabeis/export/excel', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const contas = await prisma.contaContabil.findMany({ where: { ativo: true }, orderBy: { numero: 'asc' } });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Voltaris Energy';
    const sheet = workbook.addWorksheet('Contas Contábeis');

    sheet.columns = [
      { header: 'Número', key: 'numero', width: 20 },
      { header: 'Descrição', key: 'descricao', width: 50 },
    ];
    sheet.getRow(1).eachCell(cell => { Object.assign(cell, HEADER_STYLE); });

    contas.forEach(c => {
      sheet.addRow({ numero: c.numero, descricao: c.descricao });
    });

    const totalRow = sheet.addRow({ numero: `Total: ${contas.length} contas`, descricao: '' });
    totalRow.font = { bold: true };
    applyZebra(sheet, contas.length);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=contas_contabeis_${new Date().toISOString().slice(0, 10)}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao exportar contas contábeis' });
  }
});

module.exports = router;
