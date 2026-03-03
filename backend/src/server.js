require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');

// Captura global de erros não tratados → salva no log
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', reason instanceof Error ? reason : { reason: String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception — servidor pode estar instável', err);
  // Não encerrar o processo — deixar rodando, mas logar para investigar
});

const authRoutes = require('./routes/auth.routes');
const cadastroRoutes = require('./routes/cadastro.routes');
const faturaRoutes = require('./routes/fatura.routes');
const workflowRoutes = require('./routes/workflow.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const relatorioRoutes = require('./routes/relatorio.routes');
const userRoutes = require('./routes/user.routes');
const capaProcessoRoutes = require('./routes/capaProcesso.routes');
const processoCompletoRoutes = require('./routes/processoCompleto.routes');
const boletoRoutes = require('./routes/boleto.routes');
const verificacaoRoutes = require('./routes/verificacao.routes');
const checkoutRoutes = require('./routes/checkout.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globais
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir uploads como estáticos (com MIME types explícitos)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/cadastros', cadastroRoutes);
app.use('/api/faturas', faturaRoutes);
app.use('/api/faturas', capaProcessoRoutes);
app.use('/api/faturas', processoCompletoRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/users', userRoutes);
app.use('/api/boleto', boletoRoutes);
app.use('/api/checkout', checkoutRoutes);

// Rota de logs do sistema (só ADMINISTRADOR)
const { authMiddleware, authorize } = require('./middlewares/auth.middleware');
app.get('/api/logs', authMiddleware, authorize('ADMINISTRADOR'), (req, res) => {
  try {
    const { data, nivel } = req.query;
    const dataConsulta = data || new Date().toISOString().slice(0, 10); // Hoje por default
    const linhas = logger.lerLogs(dataConsulta, nivel);
    const datasDisponiveis = logger.listarDatas();

    res.json({
      data: dataConsulta,
      nivel: nivel || 'TODOS',
      total: linhas.length,
      datasDisponiveis,
      linhas,
    });
  } catch (err) {
    logger.error('GET /api/logs', err);
    res.status(500).json({ error: true, message: 'Erro ao consultar logs' });
  }
});

// Rota PÚBLICA de verificação de documentos (sem autenticação)
app.use('/verificar', verificacaoRoutes);

// Rota para servir uploads via API (evita interceptação do IDM)
const fs = require('fs');
app.get('/api/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  // Sanitizar — só permite nome de arquivo simples (sem ../, sem /, sem \, sem caracteres especiais)
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\') || /[<>:"|?*]/.test(filename)) {
    return res.status(400).json({ error: 'Nome de arquivo inválido' });
  }
  const filePath = path.join(__dirname, '..', 'uploads', filename);
  // Verificar que o caminho resolvido está realmente dentro da pasta uploads
  const uploadsDir = path.resolve(path.join(__dirname, '..', 'uploads'));
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(uploadsDir)) {
    return res.status(400).json({ error: 'Acesso negado' });
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');
  fs.createReadStream(filePath).pipe(res);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir frontend em produção (build do Vite)
const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendPath));
app.get('*', (req, res, next) => {
  // Não interceptar rotas de API, uploads ou verificação
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.startsWith('/verificar')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handler global — loga todos os erros de rota
app.use((err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl}`, {
    status: err.status || 500,
    message: err.message,
    stack: err.stack,
    body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
    userId: req.user?.id,
  });
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Erro interno do servidor',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Voltaris Energy rodando na porta ${PORT}`);
  logger.info('Servidor iniciado', { port: PORT, env: process.env.NODE_ENV || 'development' });
});
