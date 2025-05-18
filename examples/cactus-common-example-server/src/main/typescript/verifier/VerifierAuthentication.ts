/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * VerifierAuthentication.ts
 */

import { ConfigUtil } from "../routing-interface/util/ConfigUtil";
const fs = require("fs");
const path = require("path");
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "VerifierAuthentication";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;
const jwt = require("jsonwebtoken");
import {
  verifyRoleToken,
  generateRoleToken,
  generateRoleTokens,
  ValidRole,
} from "./validator-authentication";

export class VerifierAuthentication {
  static verify(keyPath: string, targetData: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const publicKey = fs.readFileSync(path.resolve(__dirname, keyPath));

      const option = {
        algorithms: "ES256",
      };

      jwt.verify(
        targetData,
        publicKey,
        option,
        function (err: any, decoded: any) {
          if (err) {
            // Authentication NG
            logger.debug(`Authentication NG : error = ${err}`);
            reject(err);
          } else {
            // Authentication OK
            // logger.debug(`Authentication OK : decoded = ${JSON.stringify(decoded)}`);
            logger.debug(`Authentication OK`);
            resolve(decoded);
          }
        },
      );
    });
  }

  /**
   * Verify a role-based JWT token
   *
   * @param token - JWT token to verify
   * @returns Promise that resolves with decoded token or rejects with error
   */
  static verifyRoleToken(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const decoded = verifyRoleToken(token);
        if (decoded) {
          logger.debug(`Role token verification OK`);
          resolve(decoded);
        } else {
          logger.debug(`Role token verification NG`);
          reject(new Error("Invalid token"));
        }
      } catch (err) {
        logger.debug(`Role token verification NG : error = ${err}`);
        reject(err);
      }
    });
  }

  /**
   * Generate a role-based JWT token
   *
   * @param username - Username for the token
   * @param role - Role (manufacturer or customer)
   * @returns JWT token with role and organization information
   */
  static generateRoleToken(username: string, role: ValidRole): string {
    return generateRoleToken(username, role);
  }

  /**
   * Generate tokens for both roles (for testing/demo purposes)
   *
   * @returns Object containing tokens for manufacturer and customer roles
   */
  static generateRoleTokens(): { manufacturer: string; customer: string } {
    return generateRoleTokens();
  }
}
