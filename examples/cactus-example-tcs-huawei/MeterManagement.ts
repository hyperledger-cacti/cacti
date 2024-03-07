/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * MeterManagement.ts
 */

import { MeterInfo } from "./MeterInfo";
import { ConfigUtil } from "@hyperledger/cactus-cmd-socketio-server";
import fs from "fs";
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "MeterManagement";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

// Meter Management Class
export class MeterManagement {
  fileName = "MeterInfo.json";

  constructor() {}

  // For debugging
  fileDump() {
    const confirmData: string = fs.readFileSync(this.fileName, "utf8");
    const arrayData: MeterInfo[] = JSON.parse(confirmData).table as MeterInfo[];
    logger.debug(arrayData);
  }

  addMeterInfo(addMeterInfo: MeterInfo): object {
    // Existence check of table file
    try {
      fs.statSync(this.fileName);
    } catch (err) {
      // Creating an empty table file
      const emptyTable = {
        table: [],
      };
      const emptyTableJson: string = JSON.stringify(emptyTable);
      fs.writeFileSync(this.fileName, emptyTableJson, "utf8");
    }

    // Read table file
    const meterInfoFileData: string = fs.readFileSync(this.fileName, "utf8");
    const meterInfoTable: string[] = JSON.parse(meterInfoFileData)
      .table as string[];

    // Search target records / replace data
    const meterInfoTableNew = {
      table: [],
    };
    let existFlag = false;
    let action = "";
    meterInfoTable.forEach((meterInfoJSON) => {
      const meterInfo: MeterInfo = JSON.parse(meterInfoJSON) as MeterInfo;

      // Determine if it is a target record
      if (meterInfo.meterID === addMeterInfo.meterID) {
        // Change Status
        meterInfo.bankAccount = addMeterInfo.bankAccount;
        meterInfo.bankAccountPKey = addMeterInfo.bankAccountPKey;
        meterInfo.powerCompanyAccount = addMeterInfo.powerCompanyAccount;
        existFlag = true;
        action = "update";
      }

      // Register Record
      const meterInfoNewJson: string = JSON.stringify(meterInfo);
      //            logger.debug(`meter info = ${meterInfoNewJson}`);
      meterInfoTableNew.table.push(meterInfoNewJson);
    });
    if (existFlag === false) {
      const addMeterInfoJson: string = JSON.stringify(addMeterInfo);
      logger.debug(`add meter info = ${addMeterInfoJson}`);
      meterInfoTableNew.table.push(addMeterInfoJson);
      action = "add";
    }

    // Table File Write
    const meterInfoTableNewJson: string = JSON.stringify(meterInfoTableNew);
    fs.writeFileSync(this.fileName, meterInfoTableNewJson, "utf8");

    //        this.fileDump();

    const result = {
      action: action,
      meterID: addMeterInfo.meterID,
    };
    return result;
  }

  getMeterInfo(meterID: string): MeterInfo {
    // Existence check of table file
    try {
      fs.statSync(this.fileName);
    } catch (err) {
      throw err;
    }

    // Read table file
    const meterInfoFileData: string = fs.readFileSync(this.fileName, "utf8");
    const meterInfoTable: string[] = JSON.parse(meterInfoFileData)
      .table as string[];

    // Search target records
    let retMeterInfo: MeterInfo | null = null;
    meterInfoTable.forEach((meterInfoJSON) => {
      const meterInfo: MeterInfo = JSON.parse(meterInfoJSON) as MeterInfo;

      // Determine if it is a target record
      if (meterInfo.meterID === meterID) {
        retMeterInfo = meterInfo;
        return;
      }
    });

    return retMeterInfo;
  }
}
