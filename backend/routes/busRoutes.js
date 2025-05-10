const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');

// GET /api/buses
router.get('/', busController.getAllBuses);
// POST /api/buses
router.post('/', busController.createBus);
// PUT /api/buses/:id
router.put('/:id', busController.updateBus);
// DELETE /api/buses/:id
router.delete('/:id', busController.deleteBus);
// GET /api/buses/search
router.get('/search', busController.searchBuses);

module.exports = router;