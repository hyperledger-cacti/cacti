/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ConfigUtil.ts
 */

export const __configMock = {
  logLevel: "silent",
};

export class ConfigUtil {
  static getConfig(): object {
    return __configMock;
  }
}
