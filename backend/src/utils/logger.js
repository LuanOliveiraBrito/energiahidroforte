// ==========================================
// LOGGER — Sistema de logs em arquivo
// ==========================================
// Logs rotativos por dia, sem dependências externas.
// Arquivos em backend/logs/YYYY-MM-DD.log
// Níveis: ERROR, WARN, INFO
//
// Uso:
//   const logger = require('../utils/logger');
//   logger.error('Mensagem', { contexto });
//   logger.warn('Mensagem', { contexto });
//   logger.info('Mensagem', { contexto });
// ==========================================

const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', '..', 'logs');
const MAX_DIAS_LOG = 30; // Manter logs dos últimos 30 dias

// Garantir que a pasta existe
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Formatar data local como YYYY-MM-DD
function dataLocal(d = new Date()) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Nome do arquivo baseado na data local
function getLogFile() {
  return path.join(LOGS_DIR, `${dataLocal()}.log`);
}

// Formatar timestamp legível (horário local)
function timestamp() {
  const d = new Date();
  const horas = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const segs = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${dataLocal(d)} ${horas}:${mins}:${segs}.${ms}`;
}

// Serializar contexto extra (objetos, errors, etc)
function serializeExtra(extra) {
  if (!extra) return '';
  if (extra instanceof Error) {
    return ` | ${extra.message}${extra.stack ? '\n' + extra.stack : ''}`;
  }
  try {
    const str = JSON.stringify(extra, null, 0);
    // Truncar se muito grande (evitar logs gigantes)
    return ` | ${str.length > 2000 ? str.slice(0, 2000) + '...[TRUNCADO]' : str}`;
  } catch {
    return ` | [Objeto não serializável]`;
  }
}

// Escrever no arquivo (append, assíncrono e não-bloqueante)
function writeLog(level, message, extra) {
  const linha = `[${timestamp()}] [${level}] ${message}${serializeExtra(extra)}\n`;

  // Também imprimir no console para development
  if (level === 'ERROR') {
    process.stderr.write(`❌ ${linha}`);
  }

  // Escrita assíncrona — não bloqueia a event loop
  fs.appendFile(getLogFile(), linha, (err) => {
    if (err) {
      // Se falhar ao escrever o log, só imprime no console (não gera loop)
      console.error('[LOGGER] Falha ao escrever log:', err.message);
    }
  });
}

// Limpeza de logs antigos (rodar 1x por dia)
let ultimaLimpeza = null;
function limparLogsAntigos() {
  const hoje = new Date().toISOString().slice(0, 10);
  if (ultimaLimpeza === hoje) return; // Já limpou hoje
  ultimaLimpeza = hoje;

  try {
    const arquivos = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.log'));
    const limite = new Date();
    limite.setDate(limite.getDate() - MAX_DIAS_LOG);

    for (const arquivo of arquivos) {
      const dataArquivo = arquivo.replace('.log', '');
      if (dataArquivo < limite.toISOString().slice(0, 10)) {
        fs.unlinkSync(path.join(LOGS_DIR, arquivo));
        console.log(`🗑️ [LOGGER] Log antigo removido: ${arquivo}`);
      }
    }
  } catch {
    // Silencioso — limpeza não é crítica
  }
}

// API pública
const logger = {
  error(message, extra) {
    writeLog('ERROR', message, extra);
    limparLogsAntigos();
  },

  warn(message, extra) {
    writeLog('WARN', message, extra);
  },

  info(message, extra) {
    writeLog('INFO', message, extra);
  },

  // Ler logs de um dia específico (para a rota admin)
  lerLogs(data, nivel) {
    const arquivo = path.join(LOGS_DIR, `${data}.log`);
    if (!fs.existsSync(arquivo)) return [];

    const conteudo = fs.readFileSync(arquivo, 'utf-8');
    const linhas = conteudo.split('\n').filter(l => l.trim());

    if (nivel) {
      return linhas.filter(l => l.includes(`[${nivel}]`));
    }
    return linhas;
  },

  // Listar datas disponíveis
  listarDatas() {
    try {
      return fs.readdirSync(LOGS_DIR)
        .filter(f => f.endsWith('.log'))
        .map(f => f.replace('.log', ''))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  },

  // Caminho da pasta de logs
  LOGS_DIR,
};

module.exports = logger;
