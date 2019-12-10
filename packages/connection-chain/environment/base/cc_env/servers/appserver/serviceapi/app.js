/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * app.js
 */

/* Summary:
 * Service API Server Main
*/

var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var session = require('express-session');

var login = require('./routes/common/login');
var ccusers = require('./routes/common/ccusers');
var ecaccounts = require('./routes/common/ecaccounts');
var endchains = require('./routes/common/endchains');
// Write your own additional REST API

var ServiceAPIError = require('./lib/common/ServiceAPIError.js');

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({resave: false, saveUninitialized: false, secret: 'cookie enc key'}));
app.use(passport.initialize());
app.use(passport.session());

// Login API is not subject to authentication check
app.use('/login', login);

// Perform authentication checks for APIs other than login
app.use('/ccusers', isAuthenticated, ccusers);
app.use('/ecaccounts', isAuthenticated, ecaccounts);
app.use('/endchains', isAuthenticated, endchains);
// Write your own additional REST API

function isAuthenticated(req, res, next){
    if (req.isAuthenticated()) {  // authenticated
        return next();
    }
    else {  // not authenticated
        res.status(401).send();
    }
}

app.get("/logout", function(req, res){
    // Just unlogin
    req.logout();
    res.send('logout.');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new ServiceAPIError(404, 1000);
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

module.exports = app;
