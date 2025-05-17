const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// GET /api/employes
router.get('/', employeeController.getEmployees);
router.get('/:id', employeeController.getEmployeesid);
router.get('/search', employeeController.getemployessearch);

module.exports = router;