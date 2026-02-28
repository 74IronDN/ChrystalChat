const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/set-username', authController.setUsername);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

module.exports = router;