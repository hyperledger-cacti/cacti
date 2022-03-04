/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ValidatorAuthentication.ts
 */

const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
import * as config from "../common/core/config";
import { getLogger } from "log4js";
const logger = getLogger("ValidatorAuthentication[" + process.pid + "]");
logger.level = config.read("logLevel", "info");

const privateKey = fs.readFileSync(
  path.resolve(__dirname, config.read("sslParam.key")),
);

export class ValidatorAuthentication {
  static sign(payload: object): string {
    const option = {
      algorithm: "ES256",
      expiresIn: "1000",
    };

    // logger.debug(`payload = ${JSON.stringify(payload)}`);
    const signature: string = jwt.sign(payload, privateKey, option);
    // logger.debug(`signature = ${signature}`);
    logger.debug(`signature: OK`);
    return signature;
  }
}
