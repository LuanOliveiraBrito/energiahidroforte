const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { authMiddleware } = require('../middlewares/auth.middleware');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: true, message: 'Email e senha são obrigatórios' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: true, message: 'E-mail não encontrado no sistema' });
    }

    if (!user.ativo) {
      return res.status(401).json({ error: true, message: 'Usuário desativado. Contate o administrador' });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: true, message: 'Senha incorreta' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, nome: user.nome },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    logger.error('POST /api/auth/login', err);
    res.status(500).json({ error: true, message: 'Erro interno' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, nome: true, email: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: true, message: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erro interno' });
  }
});

module.exports = router;
