const express = require('express');
const validate = require('express-validation');
const expressJwt = require('express-jwt');
const asyncErrorHandler = require('../../middlewares/asyncErrorHandler');
const authValidation = require('./auth.validation');
const authCtrl = require('./auth.controller');
const config = require('../../config/config');

const router = express.Router();

/** POST /api/auth/login - Returns token if correct username and password is provided */
router.route('/login').post(validate(authValidation.login), asyncErrorHandler(authCtrl.login));

/** GET /api/auth/random-number - Protected route,
 * needs token returned by the above as header. Authorization: Bearer {token} */
router.route('/random-number').get(expressJwt({ secret: config.jwtSecret }), authCtrl.getRandomNumber);

module.exports = router;
