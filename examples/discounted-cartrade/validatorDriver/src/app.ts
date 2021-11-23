/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * app.ts
 */

/* Summary:
 *
 */

const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const fabricAccess = require("./fabricValidatorAccess");
const ethereumAccess = require("./ethereumValidatorAccess");

const app = express();

app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.get("/validatorDriver", function (req, res, next) {
  console.log("call GET : /validatorDriver");
  const validator = req.query.validator;
  const func = req.query.func;
  const param = req.query.param;
  console.log("validator : " + validator);
  console.log("func : " + func);
  console.log("param : " + param);

  foo(validator, func, param, res, next);
});

app.post("/validatorDriver", function (req, res, next) {
  console.log("call POST : /validatorDriver");
  const validator = req.body.validator;
  const func = req.body.func;
  const param = req.body.param;
  console.log("req.body : " + JSON.stringify(req.body));
  console.log("validator : " + validator);
  console.log("func : " + func);
  console.log("param : " + param);

  foo(validator, func, param, res, next);
});

function foo(validator, func, param, res, next): void {
  // Determine BC type
  if (validator === "fabric") {
    // fabric
    if (fabricAccess.isExistFunction(func)) {
      // Can be called with Server plugin function name.
      fabricAccess
        .execFunction(func, param)
        .then((respObj) => {
          const retObj = {
            status: 200,
            data: respObj,
          };
          res.json(retObj);
        })
        .catch((errObj) => {
          const err: { status?: number; message: string } = new Error(errObj);
          err.status = 500;
          next(err);
        });
    } else {
      var err: { status?: number; message: string } = new Error(
        "Function is Not Found : " + func
      );
      err.status = 400;
      next(err);
    }
  } else if (validator === "ethereum") {
    // ethereum
    if (ethereumAccess.isExistFunction(func)) {
      // Can be called with Server plugin function name.
      ethereumAccess
        .execFunction(func, param)
        .then((respObj) => {
          const retObj = {
            status: 200,
            data: respObj,
          };
          res.json(retObj);
        })
        .catch((errObj) => {
          const err: { status?: number; message: string } = new Error(errObj);
          err.status = 500;
          next(err);
        });
    } else {
      var err: { status?: number; message: string } = new Error(
        "Function is Not Found : " + func
      );
      err.status = 400;
      next(err);
    }
  } else {
    // Non-existent Validator
    var err: { status?: number; message: string } = new Error(
      "validator is Not Found : " + validator
    );
    err.status = 400;
    next(err);
  }
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err: { status?: number; message: string } = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  console.log(err);
  res.send(err);
});

module.exports = app;
