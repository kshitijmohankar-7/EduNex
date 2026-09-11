const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');
const { getStudentAcademicMetrics } = require('../controllers/academicMetricsController');

router.get('/', authenticate, authorize('student'), getStudentAcademicMetrics);
module.exports = router;
