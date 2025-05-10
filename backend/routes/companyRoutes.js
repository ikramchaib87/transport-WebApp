const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

// GET /api/companies
router.get('/', companyController.getAllCompanies);
// GET /api/companies/:id
router.get('/:id', companyController.getCompanyById);
// POST /api/companies
router.post('/', companyController.createCompany);
// PUT /api/companies/:id
router.put('/:id', companyController.updateCompany);
// DELETE /api/companies/:id
router.delete('/:id', companyController.deleteCompany);
// GET /api/companies/:id/buses
router.get('/:id/buses', companyController.getCompanyBuses);

module.exports = router;