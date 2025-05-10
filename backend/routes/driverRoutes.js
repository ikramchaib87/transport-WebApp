const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');

// GET /api/chauffeurs
router.get('/', driverController.getDrivers);

module.exports = router;