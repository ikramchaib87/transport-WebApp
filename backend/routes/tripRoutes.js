const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');

router.post('/trajets', tripController.posttrajets);
router.get('/trajets', tripController.gettrajets);

module.exports = router;