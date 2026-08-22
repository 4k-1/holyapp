const { ROLES } = require('../constants/roles');

function requestedParishId(req) {
  return (
    req.params.parishId ||
    req.get('x-parish-id') ||
    req.query.parish_id ||
    (req.body && req.body.parish_id) ||
    null
  );
}

function scopeParish(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const requested = requestedParishId(req);

  if (req.user.role === ROLES.SUPER_ADMIN) {
    req.parishId = requested || req.user.parish_id || null;
    return next();
  }

  if (!req.user.parish_id) {
    return res.status(403).json({ error: 'No parish assigned' });
  }

  if (requested && requested !== req.user.parish_id) {
    return res.status(403).json({
      error: 'Cannot access another parish',
      parish_id: req.user.parish_id,
    });
  }

  req.parishId = req.user.parish_id;
  return next();
}

module.exports = { scopeParish };
