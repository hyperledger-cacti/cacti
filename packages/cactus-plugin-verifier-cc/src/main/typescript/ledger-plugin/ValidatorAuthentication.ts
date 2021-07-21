/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ValidatorAuthentication.ts
 */

import jwt from "jsonwebtoken";
import { getLogger } from "log4js";
import type { Logger } from "log4js";

export interface IValidatorAuthenticationOptions {
  /**
   * Base64 encoded contents of the private key. Used to construct
   * Buffer object that is then used by for JWT signing.
   */
  readonly privateKeyB64: string;
  /**
   * Optional log level to use internally defaults to `"info"`.
   */
  readonly logLevel?: string;
}
export class ValidatorAuthentication {
  private readonly privateKeyB64: string;
  private readonly privateKey: Buffer;
  private readonly log: Logger;

  constructor(readonly options: IValidatorAuthenticationOptions) {
    if (!options) {
      throw new Error(
        "ValidatorAuthentication#constructor expected options to be truthy",
      );
    }
    if (!options.privateKeyB64) {
      throw new Error(
        "ValidatorAuthentication#constructor expected options.privateKeyB64 to be truthy",
      );
    }
    this.privateKeyB64 = options.privateKeyB64;
    this.privateKey = Buffer.from(this.privateKeyB64, "base64");
    this.log = getLogger("ValidatorAuthentication[" + process.pid + "]");
    this.log.level = options.logLevel || "info";
  }

  sign(payload: Record<string, unknown>): string {
    const option: any = {
      algorithm: "RS256",
      expiresIn: "1000",
    };

    const signature: string = jwt.sign(payload, this.privateKey, option);
    this.log.debug(`signature = ${signature}`);
    return signature;
  }
}
