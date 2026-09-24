const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleCheck');
const controller = require('../controllers/examScheduleController');

router.use(auth);
router.get('/', controller.listExamSchedule);
router.post('/', role('admin'), controller.createExam);
router.put('/:id', role('admin'), controller.updateExam);
router.delete('/:id', role('admin'), controller.deleteExam);

module.exports = router;
