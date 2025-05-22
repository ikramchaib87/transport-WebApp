const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');

router.get('/trajets/:id', tripController.getTrajetById);  
router.post('/trajets', tripController.posttrajets);
router.get('/trajets', tripController.gettrajets);
router.put('/trajets/:id', tripController.updatetrajets);
router.delete('/trajets/:id', tripController.deletetrajets);
router.get('/plan', tripController.getplan);

module.exports = router;