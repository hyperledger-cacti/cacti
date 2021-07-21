/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ConfigUtil.ts
 */

import fs from "fs";
import path from "path";

export class ConfigUtil {
  /**
   * Get configuration object
   *
   * @return {object} Configuration object
   */
  static getConfig(): any {
    const configCommon: any = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../config/default.json"),
        "utf8",
      ),
    );
    const configAppli: any = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../config/usersetting.json"),
        "utf8",
      ),
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
  private static mergeObjects(target: any, source: any): any {
    const isObject = (obj: any) =>
      obj && typeof obj === "object" && !Array.isArray(obj);
    const mergeObject = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
      for (const [sourceKey, sourceValue] of Object.entries(source)) {
        const targetValue = target[sourceKey];
        // eslint-disable-next-line no-prototype-builtins
        if (isObject(sourceValue) && target.hasOwnProperty(sourceKey)) {
          mergeObject[sourceKey] = ConfigUtil.mergeObjects(
            targetValue,
            sourceValue,
          );
        } else {
          Object.assign(mergeObject, { [sourceKey]: sourceValue });
        }
      }
    }
    return mergeObject;
  }
}
