const express = require('express');
const { sendDemoRequest } = require('../controllers/contactController');

const router = express.Router();

// Public: the landing page's Book a demo form.
router.post('/', sendDemoRequest);

module.exports = router;
