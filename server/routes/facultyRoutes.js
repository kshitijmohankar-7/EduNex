const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');
const {getAssignedStudents,markAttendance,enterMarks,publishMarks,getSubjectChoices,approveSubjectChoice,rejectSubjectChoice}=require('../controllers/facultyController');
const {searchStudents,getStudentDetails}=require('../controllers/facultyStudentController');
router.use(authenticate,authorize('faculty'));
router.get('/student-details/search',searchStudents);router.get('/student-details/:studentId',getStudentDetails);router.get('/students',getAssignedStudents);router.post('/attendance',markAttendance);router.post('/marks',enterMarks);router.post('/marks/publish',publishMarks);router.get('/subject-choices',getSubjectChoices);router.post('/subject-choices/:choiceId/approve',approveSubjectChoice);router.post('/subject-choices/:choiceId/reject',rejectSubjectChoice);
module.exports=router;
