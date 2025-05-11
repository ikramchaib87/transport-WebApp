const express = require('express');
const router = express.Router();
const assignmentLineController = require('../controllers/assignmentLineController');

// Bus assignment routes
router.post('/assign-bus-to-line', assignmentLineController.assignBusToLine);
router.post('/unassign-bus-from-line', assignmentLineController.unassignBusFromLine);
router.get('/bus-assignments/:busId', assignmentLineController.getBusAssignments);
router.get('/line-assignments/:lineId', assignmentLineController.getLineAssignments);
router.get('/bus-line-assignments', assignmentLineController.getAllBusLineAssignments);
router.get('/bus-assignments/:busId', assignmentLineController.getbusassignmentsbusId);
router.get('/line-assignments/:lineId', assignmentLineController.getlineassignmentslineId);
module.exports = router;