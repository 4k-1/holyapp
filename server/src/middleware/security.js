// What the API needs once it is on the public internet: only our own site may call it,
// basic browser security headers, attempt limits on sign-in and codes, and no internal
// error details sent to the browser.

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test';

/** The sites allowed to call the API: CORS_ORIGINS (comma-separated), else FRONTEND_URL. */
function allowedOrigins() {
  const raw = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

/**
 * Options for the cors package. In development (no list set) any site may call the API,
 * as before. In production only the listed sites may; requests with no Origin header
 * (PayMongo's webhook, uptime checks, curl) are not affected by CORS at all.
 */
function corsOptions() {
  const origins = allowedOrigins();
  if (!IS_PRODUCTION && !process.env.CORS_ORIGINS) return {};
  return {
    origin(origin, done) {
      if (!origin || origins.includes(origin.replace(/\/+$/, ''))) return done(null, true);
      return done(null, false);
    },
  };
}

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
}

/**
 * A small in-memory attempt limiter (one server, so memory is enough).
 * `key(req)` says whose attempts are counted: an IP address, an email, a code challenge.
 * Returns null to skip counting for that request.
 */
function limitAttempts({ name, max, windowMinutes, key, message }) {
  const windowMs = windowMinutes * 60 * 1000;
  const hits = new Map();

  function sweep(now) {
    for (const [k, entry] of hits) if (entry.resetAt <= now) hits.delete(k);
  }

  const middleware = function attemptLimiter(req, res, next) {
    if (IS_TEST && !middleware.enabledInTests) return next();
    const who = key(req);
    if (!who) return next();
    const now = Date.now();
    if (hits.size > 10000) sweep(now);
    const id = `${name}:${String(who).toLowerCase()}`;
    let entry = hits.get(id);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(id, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      const waitMinutes = Math.max(1, Math.ceil((entry.resetAt - now) / 60000));
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({
        error: message || `Too many attempts. Please wait ${waitMinutes} minute${waitMinutes === 1 ? '' : 's'} and try again.`,
      });
    }
    return next();
  };
  middleware.enabledInTests = false;
  middleware.reset = () => hits.clear();
  return middleware;
}

const byIp = (req) => req.ip;
const byEmail = (req) => {
  const email = req.body && typeof req.body.email === 'string' ? req.body.email.trim() : '';
  return email || null;
};
const byChallenge = (req) => (req.body && (req.body.challenge_id || req.body.challengeId)) || null;

// Sign-in: generous per address (a parish office shares one), tight per account.
const loginByIp = limitAttempts({ name: 'login-ip', max: 60, windowMinutes: 15, key: byIp });
const loginByEmail = limitAttempts({ name: 'login-email', max: 10, windowMinutes: 15, key: byEmail });
// Email codes are 4 digits, so each code gets only a handful of guesses.
const codeByChallenge = limitAttempts({
  name: 'code-challenge',
  max: 5,
  windowMinutes: 15,
  key: byChallenge,
  message: 'Too many wrong codes. Sign in again to get a new code.',
});
const codeByEmail = limitAttempts({
  name: 'code-email',
  max: 5,
  windowMinutes: 15,
  key: byEmail,
  message: 'Too many wrong codes. Ask for a new code and try again.',
});
const codeByIp = limitAttempts({ name: 'code-ip', max: 30, windowMinutes: 15, key: byIp });
const emailsByIp = limitAttempts({ name: 'emails-ip', max: 15, windowMinutes: 60, key: byIp });
const emailsByEmail = limitAttempts({ name: 'emails-email', max: 5, windowMinutes: 60, key: byEmail });
const contactByIp = limitAttempts({ name: 'contact-ip', max: 5, windowMinutes: 60, key: byIp });

/**
 * In production, a 500 never carries the internal message (database errors name tables
 * and columns). The real message goes to the server log instead.
 */
function hideServerErrors(req, res, next) {
  if (!IS_PRODUCTION) return next();
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500 && body && typeof body === 'object' && 'error' in body) {
      console.error(`[${req.method} ${req.originalUrl}] ${res.statusCode}:`, body.error);
      return json({ error: 'Something went wrong on our side. Please try again.' });
    }
    return json(body);
  };
  return next();
}

/** Last stop for anything thrown and not caught by a route. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err);
  if (res.headersSent) return;
  if (err.type === 'entity.too.large') {
    res.status(413).json({ error: 'That file or form is too large.' });
    return;
  }
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on our side. Please try again.' : err.message });
}

module.exports = {
  corsOptions,
  securityHeaders,
  hideServerErrors,
  errorHandler,
  limitAttempts,
  limits: {
    loginByIp,
    loginByEmail,
    codeByChallenge,
    codeByEmail,
    codeByIp,
    emailsByIp,
    emailsByEmail,
    contactByIp,
  },
};
