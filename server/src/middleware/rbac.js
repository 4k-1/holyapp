const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.sub,
      parish_id: payload.parish_id,
      role: payload.role,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...allowedRoles) {
  const allowed = allowedRoles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        required_roles: allowed,
        role: req.user.role,
      });
    }
    return next();
  };
}

module.exports = { authenticate, requireRole };
