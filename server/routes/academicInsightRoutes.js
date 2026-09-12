const express=require('express');
const router=express.Router();
const authenticate=require('../middleware/auth');
const authorize=require('../middleware/roleCheck');
const {getAcademicInsights}=require('../controllers/academicInsightController');
router.get('/',authenticate,authorize('student'),getAcademicInsights);
module.exports=router;
