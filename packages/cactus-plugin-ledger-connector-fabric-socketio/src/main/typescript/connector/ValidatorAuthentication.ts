/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ValidatorAuthentication.ts
 */

import fs from "fs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
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

    const jwtAlgo = config.read<jwt.Algorithm>('sslParam.jwtAlgo', 'ES256');
    const keyType = crypto.createPrivateKey(privateKey).asymmetricKeyType;
    if (keyType === 'rsa' && jwtAlgo.startsWith('RS')) {
      logger.debug(`Using RSA key with JWT algorithm ${jwtAlgo}`);
    }
    else if (keyType === 'ec' && jwtAlgo.startsWith('ES')) {
      logger.debug(`Using ECDSA key with JWT algorithm ${jwtAlgo}`);
    }
    else {
      throw new Error(`Not supported combination ${keyType}/${jwtAlgo}. Please use either RSA or ECDSA key.`);
    }

    const option: jwt.SignOptions = {
      algorithm: jwtAlgo,
      expiresIn: 60 * 15, // 15 minutes
    };

    const signature = jwt.sign(payload, privateKey, option);
    logger.debug(`signature: OK`);
    return signature;
  }
}
