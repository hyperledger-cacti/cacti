const express = require('express');
const validate = require('express-validation');
const expressJwt = require('express-jwt');
const asyncErrorHandler = require('../../middlewares/asyncErrorHandler');
const assetValidation = require('./assets.validation');
const assetCtrl = require('./assets.controller');
const config = require('../../config/config');

const router = express.Router();

router
  .route('/')

  /** POST /api/v1/assets - Create Asset */
  .post(
    expressJwt({ secret: config.jwtSecret }),
    validate(assetValidation.createAsset),
    asyncErrorHandler(assetCtrl.createAsset)
  );

router
  .route('/:assetId')

  /** GET /api/v1/assets/:assetId - Get Asset */
  .get(
    expressJwt({ secret: config.jwtSecret }),
    validate(assetValidation.getAsset),
    asyncErrorHandler(assetCtrl.getAsset)
  )

  /** POST /api/v1/assets/:assetId - Lock Asset */
  .post(
    expressJwt({ secret: config.jwtSecret }),
    validate(assetValidation.lockAsset),
    asyncErrorHandler(assetCtrl.lockAsset)
  )

  /** PUT /api/v1/assets/:assetId - Set Asset Property */
  .put(
    expressJwt({ secret: config.jwtSecret }),
    validate(assetValidation.setProperty),
    asyncErrorHandler(assetCtrl.setProperty)
  );

module.exports = router;
