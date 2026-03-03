const prisma = require('../config/database');

/**
 * Registra um log de auditoria
 */
async function registrarLog({ userId, faturaId = null, acao, descricao, ip = null }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        faturaId,
        acao,
        descricao,
        ip,
      },
    });
  } catch (err) {
    console.error('Erro ao registrar log:', err);
  }
}

module.exports = { registrarLog };
