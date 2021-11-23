/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * testDriver_getNumericBalance.js
 */

const request = require("request");

var param = {
  apiType: "getNumericBalance",
  progress: "",
  data: {
    referedAddress: "9d624f7995e8bd70251f8265f2f9f2b49f169c55",
  },
};
var target =
  "http://localhost:5000/validatorDriver?validator=ethereum&func=requestLedgerOperation&param=" +
  JSON.stringify(param);

console.log("url : " + target);

const options = {
  url: target,
  method: "GET",
};

request(options, (error, response, body) => {
  if (error !== null) {
    console.log("error:", error);
    return false;
  }

  console.log("statusCode:", response && response.statusCode);
  console.log("body:", body);
});
