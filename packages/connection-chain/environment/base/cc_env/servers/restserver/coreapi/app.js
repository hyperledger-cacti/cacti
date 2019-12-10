/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * app.js
 */

/* Summary:
 * Core API Server Main
*/

var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var ecaccounts = require('./routes/common/ecaccounts');
var endchains = require('./routes/common/endchains');
// Write your own additional REST API if you have one

var CoreAPIError = require('./lib/common/CoreAPIError.js');
var MonitorManager = require('./lib/common/MonitorManager.js');
var EventMediator = require('./lib/userImple/EventMediator.js');
var config = require('config');

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/ecaccounts', ecaccounts);
app.use('/endchains', endchains);
// Write your own additional REST API if you have one


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new CoreAPIError(404, 1000);
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.statusCode || 500);
  res.send(err.errorBody);
});

// Execute server startup processing on user created chaincode of CC or EC
EventMediator.initAction();

// Start Event Monitoring (CC & EC)
MonitorManager.startAllMonitor();

module.exports = app;
