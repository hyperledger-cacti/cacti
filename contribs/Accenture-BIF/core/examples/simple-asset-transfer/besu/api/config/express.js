const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const compress = require('compression');
const methodOverride = require('method-override');
const cors = require('cors');
const httpStatus = require('http-status');
const expressValidation = require('express-validation');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const routes = require('../routes');
const config = require('./config');
const APIError = require('../utils/APIError');
const { API } = require('./constants');

const app = express();
const server = http.Server(app);
app.set('server', server);

if (config.env === 'development') {
  app.use(logger('dev'));
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(compress());
app.use(methodOverride());

// secure apps by setting various HTTP headers
app.use(helmet());

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

// Serve any static files
app.use(express.static(path.join(__dirname, config.clientBuild)));

// mount all routes on /api/v1 path
app.use(API.ROOT, routes);

// Publish the frontend index.
app.use('/*', (req, res) => res.sendFile(path.join(__dirname, config.clientBuild, '/index.html')));

// Express could not sent array to Joi for validation
// https://github.com/AndrewKeig/express-validation/issues/36
expressValidation.options({
  contextRequest: true,
});

// if error is not an instanceOf APIError, convert it.
app.use((err, req, res, next) => {
  if (err instanceof expressValidation.ValidationError) {
    // validation error contains errors which is an array of error each containing message[]
    const unifiedErrorMessage = err.errors.map(error => error.messages.join('. ')).join(' and ');
    const error = new APIError(unifiedErrorMessage, err.status, true);
    return next(error);
  }
  if (!(err instanceof APIError)) {
    const apiError = new APIError(err.message, err.status, err.isPublic);
    return next(apiError);
  }
  return next(err);
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new APIError('API not found', httpStatus.NOT_FOUND);
  return next(err);
});

// log errors
if (config.env !== 'test') {
  app.use((err, req, res, next) => {
    console.error(err.stack);
    next(err);
  });
}

// error handler, send stacktrace only during development
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) =>
  res.status(err.status).json({
    message: err.isPublic ? err.message : httpStatus[err.status],
    stack: config.env === 'development' ? err.stack : {},
  })
);

module.exports = { app, server };
