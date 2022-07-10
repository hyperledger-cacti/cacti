/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const { Level } = require('level')

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
    // close the database connection
    close(): Promise<boolean>;
}

// Implementation of DBConnector for LevelDB
class LevelDBConnector implements DBConnector {

    DB_TYPE: string = "Level";
    DB_NAME: string;
    dbHandle: any;
    
    constructor(
        dbName: string
    ) {
        this.DB_NAME = dbName;
        this.dbHandle = new Level(dbName, { valueEncoding: 'json' });
    }

    async open(
    ): Promise<boolean> {
        try {
            await this.dbHandle.open();
        } catch (error: any) {
            console.error(`failed to open database connection with error: ${JSON.stringify(error)}`);
            throw new Error(error);
        }

        return Promise.resolve(true);
    }

    async insert(
        key: any,
        value: any
    ): Promise<boolean> {
        try {
            await this.dbHandle.put(key, value);
        } catch (error: any) {
            console.error(`failed to insert key ${JSON.stringify(key)} with error: ${JSON.stringify(error)}`);
            throw new Error(error);
        }

        return Promise.resolve(true);
    }

    async read(
        key: any
    ): Promise<any> {
        var value: any
        try {
            value = await this.dbHandle.get(key);
            console.debug(`read() got value: ${JSON.stringify(value)}`)
        } catch (error: any) {
            console.error(`failed to read key ${JSON.stringify(key)} with error: ${JSON.stringify(error)}`);
            throw new Error(error);
        }
        
        return value;
    }

    async update(
        key: any,
        value: any
    ): Promise<boolean> {
        try {
            await this.dbHandle.put(key, value);
        } catch (error: any) {
            console.error(`failed to update key ${JSON.stringify(key)} with error: ${JSON.stringify(error)}`);
            throw new Error(error);
        }

        return true; 
    }

    async delete(
        key: any
    ): Promise<any> {
        var value: any
        try {
            value = this.read(key);
            await this.dbHandle.del(key);
        } catch (error: any) {
            console.error(`failed to delete key ${JSON.stringify(key)} with error: ${JSON.stringify(error)}`);
            throw new Error(error);
        }
        
        return value;
    }

    async close(
    ): Promise<boolean> {
        try {
            await this.dbHandle.close();
        } catch (error: any) {
            console.error(`failed to close database connection with error: ${JSON.stringify(error)}`);
            throw new Error(error);
        }

        return Promise.resolve(true);
    }
}

export {
    LevelDBConnector
}