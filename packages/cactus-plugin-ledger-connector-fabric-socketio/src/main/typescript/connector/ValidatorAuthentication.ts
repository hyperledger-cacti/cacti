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

let privateKey: string;

export class ValidatorAuthentication {
  static sign(payload: object): string {
    if (!privateKey) {
      try {
        privateKey = config.read<string>('sslParam.keyValue');
      } catch {
        privateKey = fs.readFileSync(config.read('sslParam.key'), "ascii");
      }
    }

    const option = {
      algorithm: "ES256",
      expiresIn: 60 * 15, // 15 minutes
    };

    const signature: string = jwt.sign(payload, privateKey, option);
    logger.debug(`signature: OK`);
    return signature;
  }
}
