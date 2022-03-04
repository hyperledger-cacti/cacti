/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * config.js
 */

export const DEFAULT_NODE_CONFIG_DIR = "/etc/cactus/connector-fabric-socketio/";
if (!process.env["NODE_CONFIG_DIR"]) {
  // Must be set before import config
  process.env["NODE_CONFIG_DIR"] = DEFAULT_NODE_CONFIG_DIR;
}

import config from "config";

/**
 * Get configuration entry (uses node-config setup)
 *
 * @param key : Key to retrieve
 * @param defaultValue : Value to return if key is not present in the config.
 * @returns : Configuration value
 */
export function read<T>(key: string, defaultValue?: T): T {
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
