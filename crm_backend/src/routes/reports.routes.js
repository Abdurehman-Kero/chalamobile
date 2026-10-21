const router = require('express').Router();
const ctrl = require('../controllers/reports.controller');
const auth = require('../middleware/auth');
const allow = require('../middleware/roles');

// Owner only. The two download routes authenticate with a short-lived link
// token instead of a header, because they are opened in the phone's browser.
router.get('/daily.pdf', ctrl.pdf);
router.get('/daily.png', ctrl.image);
router.get('/daily',         auth, allow('owner'), ctrl.daily);
router.post('/export-links', auth, allow('owner'), ctrl.exportLinks);

module.exports = router;
