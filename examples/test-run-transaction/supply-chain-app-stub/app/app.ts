/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * app.ts
 */

// Load the library
import express from "express";
import helmet from "helmet";
import cors from "cors";
const app = express();
app.use(helmet());
app.use(cors());
const bodyParser = require("body-parser");

//import indexRouter from   './routes/index';
///import loginRouter from   './routes/login';
//import carsRouter from   './routes/cars';
//var carsRouter = require('./routes/cars.js').default;
//var loginRouter = require('./routes/login.js').default;
//var carsRouter = require('./routes/cars.js').default;

// body-parser settings
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//app.use('/api/v1/', indexRouter);
//app.use('/api/v1/login/', loginRouter);
//app.use('/api/v1/cars/', carsRouter);

// Dynamic loading
console.debug(`start Dynamic loading`);
const targetJsArray = [
  //    {uri: '/api/v1/login/', jsPath: './routes/login.js'},
  //    {uri: '/api/v1/cars/', jsPath: './routes/cars.js'},
  {
    uri: "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/test-run-transaction/",
    jsPath: "./routes/supply-chain-app.js",
  },
];
for (const targetJs of targetJsArray) {
  console.debug(`url: ${targetJs.uri}, jsPath: ${targetJs.jsPath}`);
  // var targetRouter = require(targetJs.jsPath).default;
  app.use(targetJs.uri, require(targetJs.jsPath).default);
}

const port = process.env.PORT || 5053; // Specify the port number

app.get("/helloWorld", (req, res) => {
  res.status(200).send({ message: "hello, world" });
});

// Server startup
app.listen(port);
console.log("listen on port " + port);
