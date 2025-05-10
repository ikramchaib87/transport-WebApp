const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// GET /api/sousadmins
router.get('/', adminController.getSousAdmins);

module.exports = router;