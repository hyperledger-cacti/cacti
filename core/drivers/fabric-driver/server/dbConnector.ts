/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const { Level } = require('level')
//const { ClassicLevel } = require('classic-level')

/*
 * Interfaces for all database connectors to be used for event subscriptions 
 */
interface DBConnector {
    DB_TYPE: string;

    // interface to  add a <key,value> pair to the database
    insert(key: any, value: any): Promise<boolean>;
    // interface to read a key from the database
    read(key: any): Promise<any>;
    // interface to update a key's value in the database
    update(key: any, value: any): Promise<boolean>;
    // interface to delete a key from the database
    delete(key: any): Promise<any>;
}

class LevelDBConnector implements DBConnector {

    DB_TYPE: string = "Level";
    dbHandle: any;
    
    constructor(
        dbName: string
    ) {
        this.dbHandle = new Level(dbName, { valueEncoding: 'json' });
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
}

export {
    LevelDBConnector
}