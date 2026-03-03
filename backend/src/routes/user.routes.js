const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');
const { registrarLog } = require('../utils/auditLog');

const router = express.Router();

router.use(authMiddleware);

// GET /api/users - Listar usuários (admin)
router.get('/', authorize('ADMINISTRADOR'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, nome: true, cpf: true, email: true, role: true, ativo: true, createdAt: true },
      orderBy: { nome: 'asc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao buscar usuários' });
  }
});

// POST /api/users - Criar usuário (admin)
router.post('/', authorize('ADMINISTRADOR'), async (req, res) => {
  try {
    const { nome, cpf, email, senha, role } = req.body;

    if (!nome || !cpf || !email || !senha || !role) {
      return res.status(400).json({ error: true, message: 'Todos os campos são obrigatórios (nome, CPF, email, senha, perfil)' });
    }

    if (cpf.replace(/\D/g, '').length !== 11) {
      return res.status(400).json({ error: true, message: 'CPF deve ter 11 dígitos' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const user = await prisma.user.create({
      data: { nome, cpf: cpf.replace(/\D/g, ''), email, senha: senhaHash, role },
      select: { id: true, nome: true, cpf: true, email: true, role: true, ativo: true },
    });

    await registrarLog({
      userId: req.userId,
      acao: 'CADASTRO_USUARIO',
      descricao: `Usuário "${nome}" (${role}) criado por ${req.userName}${cpf ? ` | CPF: ${cpf}` : ''}`,
      ip: req.ip,
    });

    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: true, message: 'Email já cadastrado' });
    }
    res.status(500).json({ error: true, message: 'Erro ao criar usuário' });
  }
});

// PUT /api/users/:id - Atualizar usuário (admin)
router.put('/:id', authorize('ADMINISTRADOR'), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, cpf, senha, role, ativo } = req.body;

    const userId = parseInt(id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: true, message: 'ID inválido' });
    }

    // Buscar usuário atual para log detalhado
    const userAtual = await prisma.user.findUnique({
      where: { id: userId },
      select: { nome: true, email: true, role: true, ativo: true },
    });

    if (!userAtual) {
      return res.status(404).json({ error: true, message: 'Usuário não encontrado' });
    }

    const data = {};
    const alteracoes = [];

    // Nome NUNCA é alterável (proteção contra fraude)
    if (email && email !== userAtual.email) {
      data.email = email;
      alteracoes.push(`Email: ${userAtual.email} → ${email}`);
    }
    if (cpf !== undefined) {
      data.cpf = cpf || null;
      alteracoes.push(`CPF atualizado`);
    }
    if (role && role !== userAtual.role) {
      data.role = role;
      alteracoes.push(`Perfil: ${userAtual.role} → ${role}`);
    }
    if (ativo !== undefined && ativo !== userAtual.ativo) {
      data.ativo = ativo;
      alteracoes.push(`Status: ${userAtual.ativo ? 'Ativo' : 'Inativo'} → ${ativo ? 'Ativo' : 'Inativo'}`);
    }
    if (senha) {
      data.senha = await bcrypt.hash(senha, 10);
      alteracoes.push('Senha redefinida');
    }

    // Evitar update sem dados
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: true, message: 'Nenhuma alteração informada' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, nome: true, cpf: true, email: true, role: true, ativo: true },
    });

    // Log detalhado com todas as alterações
    await registrarLog({
      userId: req.userId,
      acao: 'EDICAO_USUARIO',
      descricao: `Usuário "${userAtual.nome}" (ID ${id}) editado por ${req.userName}. Alterações: ${alteracoes.join('; ') || 'Nenhuma'}`,
      ip: req.ip,
    });

    res.json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: true, message: 'Email já cadastrado por outro usuário' });
    }
    res.status(500).json({ error: true, message: 'Erro ao atualizar usuário' });
  }
});

// DELETE /api/users/:id - Excluir usuário (admin)
router.delete('/:id', authorize('ADMINISTRADOR'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: true, message: 'ID inválido' });
    }

    // Não pode deletar a si mesmo
    if (userId === req.userId) {
      return res.status(400).json({ error: true, message: 'Você não pode excluir seu próprio usuário' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nome: true, email: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: true, message: 'Usuário não encontrado' });
    }

    // Verificar se tem faturas vinculadas
    const faturaCount = await prisma.fatura.count({
      where: {
        OR: [
          { lancadoPorId: userId },
          { aprovadoPorId: userId },
          { liberadoPorId: userId },
          { protocoladoPorId: userId },
          { baixadoPorId: userId },
        ],
      },
    });

    if (faturaCount > 0) {
      // Tem histórico — apenas desativar em vez de deletar
      await prisma.user.update({
        where: { id: userId },
        data: { ativo: false },
      });

      await registrarLog({
        userId: req.userId,
        acao: 'DESATIVACAO_USUARIO',
        descricao: `Usuário "${user.nome}" (${user.email}) desativado por ${req.userName} — possui ${faturaCount} fatura(s) vinculada(s), não pode ser removido`,
        ip: req.ip,
      });

      return res.json({ message: `Usuário desativado (possui ${faturaCount} fatura(s) vinculada(s) e não pode ser removido permanentemente)`, desativado: true });
    }

    // Sem faturas vinculadas — pode deletar audit logs e o usuário
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    await registrarLog({
      userId: req.userId,
      acao: 'EXCLUSAO_USUARIO',
      descricao: `Usuário "${user.nome}" (${user.email}, ${user.role}) excluído permanentemente por ${req.userName}`,
      ip: req.ip,
    });

    res.json({ message: `Usuário "${user.nome}" excluído com sucesso`, excluido: true });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro ao excluir usuário' });
  }
});

module.exports = router;
