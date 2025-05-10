const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// GET /api/employes
router.get('/', employeeController.getEmployees);

module.exports = router;