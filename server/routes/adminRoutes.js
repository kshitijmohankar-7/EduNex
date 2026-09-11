const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');
const admin = require('../controllers/adminController');
const teaching = require('../controllers/adminTeachingController');

router.use(authenticate, authorize('admin'));
router.get('/overview', admin.getOverview);
router.get('/people', admin.listPeople); router.post('/people', admin.createPerson); router.patch('/people/:id', admin.updatePerson); router.post('/people/:id/deactivate', admin.deactivatePerson);
router.get('/departments', admin.listDepartments); router.post('/departments', admin.createDepartment); router.put('/departments/:id', admin.updateDepartment); router.delete('/departments/:id', admin.deleteDepartment);
router.get('/courses', admin.listCourses); router.post('/courses', admin.createCourse); router.put('/courses/:id', admin.updateCourse); router.delete('/courses/:id', admin.deleteCourse);
router.get('/academic-years', admin.listAcademicYears); router.post('/academic-years', admin.createAcademicYear); router.put('/academic-years/:id', admin.updateAcademicYear); router.delete('/academic-years/:id', admin.deleteAcademicYear);
router.get('/semesters', admin.listSemesters); router.post('/semesters', admin.createSemester); router.put('/semesters/:id', admin.updateSemester); router.delete('/semesters/:id', admin.deleteSemester);
router.get('/divisions', admin.listDivisions); router.post('/divisions', admin.createDivision); router.put('/divisions/:id', admin.updateDivision); router.delete('/divisions/:id', admin.deleteDivision);
router.get('/subjects', admin.listSubjects); router.post('/subjects', admin.createSubject); router.put('/subjects/:id', admin.updateSubject); router.delete('/subjects/:id', admin.deleteSubject);
router.get('/faculty-assignments', teaching.listFacultyAssignments); router.post('/faculty-assignments', teaching.createFacultyAssignment); router.delete('/faculty-assignments/:id', teaching.deleteFacultyAssignment);
module.exports = router;
