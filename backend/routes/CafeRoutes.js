const express = require('express');
const router = express.Router();
const CafeController = require('../controllers/CafeController');

router.post('/search', CafeController.search);
router.post('/contribute', CafeController.contribute);
router.get('/', CafeController.getAll);

module.exports = router;