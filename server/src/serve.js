// Production entry point: one server for the whole site.
//   /api/...   the API (src/app.js)
//   anything else   the built website (client/dist, copied to ./public), with every page
//                   address falling back to index.html so deep links and refreshes work.
//
// Run with `npm run start:prod` (the Dockerfile at the repo root does this after migrating).

require('dotenv').config({ quiet: true });

const path = require('path');
const fs = require('fs');
const express = require('express');
const api = require('./app');
const { frontendUrl } = require('./utils/frontendUrl');
const { startRequestDocumentCleanup } = require('./utils/requestDocumentRetention');

const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(__dirname, '..', 'public');
const INDEX = path.join(PUBLIC_DIR, 'index.html');

if (!fs.existsSync(INDEX)) {
  console.error(`No built website at ${INDEX}. Build the client first (see Dockerfile).`);
  process.exit(1);
}

const site = express();
site.disable('x-powered-by');
site.set('trust proxy', api.get('trust proxy'));

site.use('/api', api);

// Hashed build files never change, so browsers may keep them; index.html must always be fresh.
site.use(
  '/assets',
  express.static(path.join(PUBLIC_DIR, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false })
);
site.use(express.static(PUBLIC_DIR, { index: false, maxAge: '1h' }));

site.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.sendFile(INDEX);
});

site.use((req, res) => res.status(404).json({ error: 'Not found.' }));

const PORT = process.env.PORT || 5000;
site.listen(PORT, '0.0.0.0', () => {
  console.log(`HolyApp running on port ${PORT}`);
  console.log(`Emails and QR codes will link to ${frontendUrl()}`);
  if (!process.env.DATA_ENCRYPTION_KEY) {
    console.warn('DATA_ENCRYPTION_KEY is not set: personal data will be stored without encryption.');
  }
  startRequestDocumentCleanup();
  require('./testing/testOffice').startTestOffice();
});
