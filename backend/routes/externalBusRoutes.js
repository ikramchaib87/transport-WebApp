const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const externalBusController = require('../controllers/externalBusController');

// Configure file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/drivers'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'driver-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// GET /api/external-buses
router.get('/', externalBusController.getAllBuses);
// GET /api/external-buses/:id
router.get('/:id', externalBusController.getBusById);
// POST /api/external-buses
router.post('/', upload.single('photo_chauffeur'), externalBusController.createBus);
// PUT /api/external-buses/:id
router.put('/:id', upload.single('photo_chauffeur'), externalBusController.updateBus);
// DELETE /api/external-buses/:id
router.delete('/:id', externalBusController.deleteBus);

module.exports = router;