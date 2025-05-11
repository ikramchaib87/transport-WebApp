const express = require('express');
const router = express.Router();
const lineController = require('../controllers/lineController');

// Line routes
router.get('/', lineController.getAllLines);
router.get('/:id', lineController.getLineById);
router.post('/', lineController.createLine);
router.put('/:id', lineController.updateLine);
router.delete('/:id', lineController.deleteLine);

// Stop routes
router.get('/:lineId/stops', lineController.getLineStops);
router.post('/:lineId/stops', lineController.addStopToLine);

// Stop independent routes
router.put('/stops/:id', lineController.updateStop);
router.delete('/stops/:id', lineController.deleteStop);
router.get('/stops/search', lineController.searchStops);


module.exports = router;