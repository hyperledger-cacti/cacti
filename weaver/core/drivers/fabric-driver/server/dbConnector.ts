/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Level } from "level";
import * as path from "path";
import logger from "./logger";
import { delay } from "./utils";

/*
 * Interfaces for all database connectors to be used for event subscriptions
 */
interface DBConnector {
  // type of the DB (LevelDB, MongoDB, etc.)
  DB_TYPE: string;
  // name of the <key/value> map
  DB_NAME: string;
  // connection to the DB
  dbHandle: any;

  // open the database connection
  open(): Promise<boolean>;
  // interface to add a <key,value> pair to the database
  insert(key: any, value: any): Promise<boolean>;
  // interface to read a key from the database
  read(key: any): Promise<any>;
  // interface to update a key's value in the database
  update(key: any, value: any): Promise<boolean>;
  // interface to delete a key from the database
  delete(key: any): Promise<any>;
  // get iterator
  filteredRead(
    keyFilterCallback: (key: any, targetKey: any) => boolean,
    targetKey: any,
  ): Promise<Array<any>>;
  // get All keys
  getAllKeys(): Promise<Array<any>>;
  // close the database connection
  close(): Promise<boolean>;
}

// Implementation of DBConnector for LevelDB
class LevelDBConnector implements DBConnector {
  DB_TYPE: string = "Level";
  DB_NAME: string;
  dbHandle: any;
  dbOpenMaxRetries: number;
  dbRetryBackoffTime: number;

  constructor(dbName: string, retryTimeout: number = 0) {
    if (!dbName || dbName.length == 0) {
      dbName = "driverdb";
    }
    this.DB_NAME = dbName;
    this.dbHandle = new Level(
      path.join(
        process.env.DB_PATH ? process.env.DB_PATH : "./driverdbs",
        dbName,
      ),
      {
        valueEncoding: "json",
      },
    );
    // Retry max attempts, default 250, making it 5 seconds for retries
    this.dbOpenMaxRetries = process.env.LEVELDB_LOCKED_MAX_RETRIES
      ? parseInt(process.env.LEVELDB_LOCKED_MAX_RETRIES)
      : 250;
    // Retry back off time in ms, default 20ms
    this.dbRetryBackoffTime = process.env.LEVELDB_LOCKED_RETRY_BACKOFF_MSEC
      ? parseInt(process.env.LEVELDB_LOCKED_RETRY_BACKOFF_MSEC)
      : 20;
    if (retryTimeout > 0) {
      this.dbOpenMaxRetries = Math.floor(
        retryTimeout / this.dbRetryBackoffTime,
      );
    }
  }

  async open(i: number = 0): Promise<boolean> {
    logger.debug(`attempt #${i} to open database ${this.DB_NAME}`);
    try {
      await this.dbHandle.open();
    } catch (error: any) {
      if (i >= this.dbOpenMaxRetries) {
        logger.error(
          `failed to open database connection with error: ${error.toString()}`,
        );
        if (
          error.code == "LEVEL_DATABASE_NOT_OPEN" &&
          error.cause &&
          error.cause.code == "LEVEL_LOCKED"
        ) {
          throw new DBLockedError(error.toString());
        } else {
          throw new DBNotOpenError(error.toString());
        }
      } else {
        logger.debug(
          `failed to open database connection with error: ${error.toString()}`,
        );
        await delay(this.dbRetryBackoffTime);
        await this.open(i + 1);
      }
    }

    return true;
  }

  async insert(key: any, value: any): Promise<boolean> {
    try {
      await this.dbHandle.put(key, value);
    } catch (error: any) {
      logger.error(
        `failed to insert key ${JSON.stringify(key)} with error: ${error.toString()}`,
      );
      if (error.code == "LEVEL_DATABASE_NOT_OPEN") {
        throw new DBNotOpenError(error.toString());
      } else {
        throw new DBError(error.toString());
      }
    }

    return true;
  }

  async read(key: any): Promise<any> {
    let value: any;
    try {
      value = await this.dbHandle.get(key);
      logger.debug(`read() got value: ${JSON.stringify(value)}`);
    } catch (error: any) {
      logger.error(
        `failed to read key ${JSON.stringify(key)} with error: ${error.toString()}`,
      );
      if (error.code == "LEVEL_NOT_FOUND") {
        throw new DBKeyNotFoundError(error.toString());
      } else if (error.code == "LEVEL_DATABASE_NOT_OPEN") {
        throw new DBNotOpenError(error.toString());
      } else {
        throw new DBError(error.toString());
      }
    }

    return value;
  }

  async update(key: any, value: any): Promise<boolean> {
    try {
      await this.dbHandle.put(key, value);
    } catch (error: any) {
      logger.error(
        `failed to update key ${JSON.stringify(key)} with error: ${error.toString()}`,
      );
      if (error.code == "LEVEL_DATABASE_NOT_OPEN") {
        throw new DBNotOpenError(error.toString());
      } else {
        throw new DBError(error.toString());
      }
    }

    return true;
  }

  async delete(key: any): Promise<any> {
    let value: any;
    try {
      value = this.read(key);
      await this.dbHandle.del(key);
    } catch (error: any) {
      logger.error(
        `failed to delete key ${JSON.stringify(key)} with error: ${error.toString()}`,
      );
      if (error.code == "LEVEL_NOT_FOUND") {
        throw new DBKeyNotFoundError(error.toString());
      } else if (error.code == "LEVEL_DATABASE_NOT_OPEN") {
        throw new DBNotOpenError(error.toString());
      } else {
        throw new DBError(error.toString());
      }
    }

    return value;
  }

  async filteredRead(
    keyFilterCallback: (key: any, targetKey: any) => boolean,
    targetKey: any,
  ): Promise<Array<any>> {
    try {
      const retVal = new Array<any>();
      for await (const [key1, value1] of this.dbHandle.iterator()) {
        if (keyFilterCallback(key1, targetKey)) {
          retVal.push(value1);
        }
      }

      return retVal;
    } catch (error: any) {
      logger.error(`filteredRead error: ${error.toString()}`);
      if (error.code == "LEVEL_DATABASE_NOT_OPEN") {
        throw new DBNotOpenError(error.toString());
      } else {
        throw new DBError(error.toString());
      }
    }
  }

  async close(): Promise<boolean> {
    try {
      await this.dbHandle.close();
    } catch (error: any) {
      logger.error(
        `failed to close database connection with error: ${error.toString()}`,
      );
      if (error.code == "LEVEL_DATABASE_NOT_OPEN") {
        throw new DBNotOpenError(error.toString());
      } else {
        throw new DBError(error.toString());
      }
    }

    return true;
  }

  async getAllKeys(): Promise<Array<any>> {
    const keys = await this.dbHandle.keys().all();
    return keys;
  }
}

class DBKeyNotFoundError extends Error {
  constructor(msg: string) {
    super(`key not found in database: ${msg}`);
    Object.setPrototypeOf(this, DBKeyNotFoundError.prototype);
  }
}

class DBNotOpenError extends Error {
  constructor(msg: string) {
    super(`database is not open: ${msg}`);
    Object.setPrototypeOf(this, DBNotOpenError.prototype);
  }
}

class DBLockedError extends Error {
  constructor(msg: string) {
    super(`database already in use: ${msg}`);
    Object.setPrototypeOf(this, DBLockedError.prototype);
  }
}

class DBError extends Error {
  constructor(msg: string) {
    super(`database error: ${msg}`);
    Object.setPrototypeOf(this, DBError.prototype);
  }
}

export {
  DBConnector,
  LevelDBConnector,
  DBLockedError,
  DBKeyNotFoundError,
  DBNotOpenError,
  DBError,
};
