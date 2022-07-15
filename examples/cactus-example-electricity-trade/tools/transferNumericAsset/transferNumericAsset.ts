/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * transferNumericAsset.ts
 */

import { io } from "socket.io-client";

{
  // Validator test program.(socket.io client)
  const config = require("config");

  // Specify the server (Validator) of the communication destination
  const validatorUrl = config.validatorUrl;
  console.log("validatorUrl: " + validatorUrl);
  const options = {
    rejectUnauthorized: false, // temporary avoidance since self-signed certificates are used
    reconnection: false,
    timeout: 20000,
  };
  const socket = io(validatorUrl, options);

  // ## Request for "transferNumericAsset"
  if (process.argv.length !== 5) {
    console.log("Number of parameters is abnormal.");
    process.exit(-1);
  }
  const paramAmount: number = parseInt(process.argv[4]);
  if (Number.isNaN(paramAmount)) {
    console.log(`Third parameter is not numeric. ${process.argv[4]}`);
    process.exit(-1);
  }

  console.log(
    `execution parameter : fromAddress = ${process.argv[2]}, toAddress = ${process.argv[3]}, amount = ${process.argv[4]}`,
  );

  const fromAddress = process.argv[2];
  const toAddress = process.argv[3];
  const amount = paramAmount;
  const reqID = "reqID_TNA_001";

  // function param
  const requestData = {
    contract: {},
    method: {
      type: "web3Eth",
      command: "sendTransaction",
    },
    args: {
      args: [
        {
          from: fromAddress,
          to: toAddress,
          value: amount,
        },
      ],
    },
    reqID: reqID,
  };

  const json2str = (jsonObj) => {
    try {
      return JSON.stringify(jsonObj);
    } catch (error) {
      return null;
    }
  };

  socket.on("connect_error", (err) => {
    console.log("####connect_error:", err);
    // end communication
    socket.disconnect();
    process.exit(0);
  });

  socket.on("connect_timeout", (err) => {
    console.log("####Error:", err);
    // end communication
    socket.disconnect();
    process.exit(0);
  });

  socket.on("error", (err) => {
    console.log("####Error:", err);
  });

  socket.on("eventReceived", function (res) {
    // output the data received from the client
    console.log("#[recv]eventReceived, res: " + json2str(res));
  });

  const requestStopMonitor = () => {
    console.log("##exec requestStopMonitor()");
    socket.emit("stopMonitor");

    setTimeout(function () {
      // end communication
      socket.disconnect();
      process.exit(0);
    }, 5000);
  };

  // request StartMonitor
  const requestStartMonitor = () => {
    console.log("##exec requestStartMonitor()");
    socket.emit("startMonitor");

    setTimeout(requestStopMonitor, 15000);
  };

  const sendRequest = () => {
    console.log("exec sendRequest()");
    console.log("#[send]requestData: " + json2str(requestData));
    socket.emit("request2", requestData);
  };

  setTimeout(requestStartMonitor, 2000);
  setTimeout(sendRequest, 4000);
}
