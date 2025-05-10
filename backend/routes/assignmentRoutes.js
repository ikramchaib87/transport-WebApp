const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');

// GET /api/affectations
router.get('/', assignmentController.getAllAssignments);
// POST /api/affectations
router.post('/', assignmentController.createAssignment);
// PUT /api/affectations/:id
router.put('/:id', assignmentController.updateAssignment);
// DELETE /api/affectations/:id
router.delete('/:id', assignmentController.deleteAssignment);

module.exports = router;