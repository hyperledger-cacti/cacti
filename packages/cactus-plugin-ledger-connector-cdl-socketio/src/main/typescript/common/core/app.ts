/*
 * Copyright 2023 Hyperledger Cacti Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * app.js
 */

/* Summary:
 *
 */

import type { NextFunction, Request, Response, RequestHandler } from "express";
import createError from "http-errors";
import express from "express";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";

const app: express.Express = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser() as RequestHandler);

// catch 404 and forward to error handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(createError(404));
});

// error handler
app.use(
  (
    err: { message: string; status?: number },
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // set erreor response
    const errorResponse: {} = {
      statusCode: err.status || 500,
      message: err.message,
    };

    // render the error page
    res.status(err.status || 500);
    res.send(errorResponse);
  },
);

export default app;
