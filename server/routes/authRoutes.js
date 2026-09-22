const express = require('express');
const router = express.Router();
const { register, login, logout } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/password-reset/request', require('../controllers/platformController').requestPasswordReset);
router.post('/password-reset/reset', require('../controllers/platformController').resetPassword);

module.exports = router;
