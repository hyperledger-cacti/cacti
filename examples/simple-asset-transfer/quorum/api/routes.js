const express = require('express');
const authRoute = require('./routes/auth/auth.route');
const actorsRoute = require('./routes/actors/actors.route');
const assetsRoute = require('./routes/assets/assets.route');
const { API } = require('./config/constants');

const router = express.Router();

/** GET /health-check - Check service health */
router.get('/health-check', (req, res) => res.send('OK'));

// mount auth route at /auth
router.use(API.AUTH, authRoute);

// mount actors route at /actors
router.use(API.ACTORS, actorsRoute);

// mount assets route at /assets
router.use(API.ASSETS, assetsRoute);

module.exports = router;
