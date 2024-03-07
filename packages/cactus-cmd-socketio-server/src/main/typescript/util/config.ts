/*
 * Copyright 2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * NOTE: Be sure that NODE_CONFIG_DIR env variable points to the location
 * of current module config files before loading this.
 *
 * config.js
 */

import config from "config";

/**
 * Get configuration entry (uses node-config setup)
 *
 * @param key : Key to retrieve
 * @param defaultValue : Value to return if key is not present in the config.
 * @returns : Configuration value
 */
export function configRead<T>(key: string, defaultValue?: T): T {
  if (config.has(key)) {
    return config.get(key);
  }

  if (defaultValue) {
    return defaultValue;
  }

  throw Error(
    `Missing configuration entry '${key}', config dir = ${process.env["NODE_CONFIG_DIR"]}`,
  );
}
