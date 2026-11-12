const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const ledger = require('../controllers/ledgerController');

const router = express.Router();
const base = [authenticate, scopeParish, requireParish];
// Parish admins and staff look through the registers and make records from them.
const office = [...base, requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF)];
// Only parish admins add books and pages, or remove a page.
const admin = [...base, requireRole(ROLES.PARISH_ADMIN)];

router.get('/books', ...office, ledger.listBooks);
router.post('/books', ...admin, ledger.createBook);
router.get('/books/:bookId', ...office, ledger.getBook);
router.get('/books/:bookId/pages', ...office, ledger.listPages);
// The photo is the raw request body (Content-Type: image/jpeg etc.), so no multipart
// library is needed; app.js's express.json() ignores non-JSON bodies.
router.post('/books/:bookId/pages', ...admin, express.raw({ type: 'image/*', limit: '25mb' }), ledger.uploadPage);

router.get('/search-text', ...office, ledger.listSearchText);

router.get('/pages/:pageId/image', ...office, ledger.getPageImage);
router.delete('/pages/:pageId', ...admin, ledger.deletePage);
router.get('/pages/:pageId/reading', ...office, ledger.getPageReading);
router.post('/pages/:pageId/read', ...office, ledger.readPage);

module.exports = router;
