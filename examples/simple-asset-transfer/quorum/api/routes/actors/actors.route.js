const express = require('express');
const expressJwt = require('express-jwt');
const validate = require('express-validation');
const asyncErrorHandler = require('../../middlewares/asyncErrorHandler');
const actorsValidation = require('./actors.validation');
const actorsCtrl = require('./actors.controller');
const config = require('../../config/config');

const router = express.Router();

router
  .route('/')
  /** GET /api/v1/actors - Get list of actors */
  .get(asyncErrorHandler(actorsCtrl.getAllActorsDetails));

router
  .route('/')
  /** POST /api/v1/actors - Create new actor */
  .post(validate(actorsValidation.registerActor), asyncErrorHandler(actorsCtrl.registerActor));

router
  .route('/whoami')
  /** GET /api/v1/actors/whoami - Get my actor */
  .get(asyncErrorHandler(actorsCtrl.getMyActor));

router
  .route('/:actorAddress')
  /** GET /api/v1/actors/:actorAddress - Get actor */
  .get(asyncErrorHandler(actorsCtrl.getActorDetails));

router
  .route('/verify')
  /** POST /api/v1/actors/verify - Verify signatures */
  .post(
    expressJwt({ secret: config.jwtSecret }),
    validate(actorsValidation.verify),
    asyncErrorHandler(actorsCtrl.verify)
  );

module.exports = router;
