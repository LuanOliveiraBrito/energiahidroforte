const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticação JWT
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  // Fallback: token via query param (para downloads de arquivos)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: true, message: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.userName = decoded.nome;
    return next();
  } catch (err) {
    return res.status(401).json({ error: true, message: 'Token inválido ou expirado' });
  }
}

/**
 * Middleware de autorização por perfil (role)
 * @param  {...string} roles - Roles permitidas
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        error: true,
        message: 'Acesso negado. Permissão insuficiente.',
      });
    }
    return next();
  };
}

module.exports = { authMiddleware, authorize };
