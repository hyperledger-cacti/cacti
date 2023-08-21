/*
 * Copyright 2023 Hyperledger Cacti Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ValidatorAuthentication.ts
 */

import * as config from "../common/core/config";

import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

import { getLogger } from "log4js";
const logger = getLogger("ValidatorAuthentication[" + process.pid + "]");
logger.level = config.read("logLevel", "info");

const privateKey = fs.readFileSync(
  path.resolve(__dirname, config.read("sslParam.key")),
);

export class ValidatorAuthentication {
  static sign(payload: object): string {
    const signature: string = jwt.sign(payload, privateKey, {
      algorithm: "ES256",
      expiresIn: "10000",
    });
    logger.debug(`signature: OK`);
    return signature;
  }
}
