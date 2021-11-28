/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ConfigUtil.ts
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

export class ConfigUtil {
  /**
   * Get configuration object
   *
   * @return {object} Configuration object
   */
  static getConfig(): object {
    const configCommon: any = yaml.safeLoad(
      fs.readFileSync("/etc/cactus/default.yaml", "utf8")
    );
    const configAppli: any = yaml.safeLoad(
      fs.readFileSync("/etc/cactus/usersetting.yaml", "utf8")
    );
    return ConfigUtil.mergeObjects(configCommon, configAppli);
  }

  /**
   * Merge objects
   *
   * @param {object} target - Target object
   * @param {object} source - Source object
   * @return {object} Merged objects
   */
  private static mergeObjects(target: object, source: object): object {
    const isObject = (obj: unknown) =>
      obj && typeof obj === "object" && !Array.isArray(obj);
    const mergeObject = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
      for (const [sourceKey, sourceValue] of Object.entries(source)) {
        const targetValue = (target as { [key: string]: any })[sourceKey];
        if (isObject(sourceValue) && target.hasOwnProperty(sourceKey)) {
          (mergeObject as { [key: string]: any })[sourceKey] =
            ConfigUtil.mergeObjects(targetValue, sourceValue);
        } else {
          Object.assign(mergeObject, { [sourceKey]: sourceValue });
        }
      }
    }
    return mergeObject;
  }
}
