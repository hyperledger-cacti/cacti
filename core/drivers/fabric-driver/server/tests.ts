/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import eventsPb from "@hyperledger-labs/weaver-protos-js/common/events_pb";
import queryPb from '@hyperledger-labs/weaver-protos-js/common/query_pb';
import { addEventSubscription, deleteEventSubscription, lookupEventSubscriptions } from "./events"
import { LevelDBConnector, DBConnector, DBNotOpenError, DBKeyNotFoundError, DBLockedError } from "./dbConnector"

// test the LevelDB basic operations
async function dbConnectionTest(
): Promise<boolean> {
    console.log(`Start testing LevelDBConnector()`)
    let db: DBConnector;
    try {
        // Create connection to a database
        db = new LevelDBConnector("");

        const key: string = 'key';
        var value: string = 'insert';

        // Add the entry <key, value> to the database
        await db.insert(key, value);

        // Fetch the value of the key
        value = await db.read(key);
        console.log(`obtained <key, value>: <${key}, ${value}>`);

        // Close the database connection
        await db.close();

        // Try to update the key before opening the database connection
        try {
            value = 'update';
            await db.update(key, value);
        } catch (error: any) {
            const errorString: string = `${error.toString()}`;
            if (error instanceof DBNotOpenError) {
                console.log(`test success for DBNotOpenError`);
                // open the database connection
                await db.open();
                // try to update again the key
                await db.update(key, value);
            } else {
                console.error(`re-throwing the error: ${errorString}`);
                db.close();
                throw new Error(error);
            }
        }

        // Delete the key
        await db.delete(key);

        // Try to read key that is already deleted
        try {
            await db.read(key);
        } catch (error: any) {
            const errorString: string = `${error.toString()}`;
            if (error instanceof DBKeyNotFoundError) {
                console.log(`test success for DBKeyNotFoundError`);
            } else {
                console.error(`re-throwing the error: ${errorString}`);
                db.close();
                throw new Error(error);
            }
        }

        // Try to open another connection which should fail
        try {
            let db2 = new LevelDBConnector("");
            await db2.open();
        } catch (error: any) {
            const errorString: string = `${error.toString()}`;
            if (error instanceof DBLockedError) {
                console.log(`test success for DBLockedError`);
            } else {
                console.error(`re-throwing the error: ${errorString}`);
                throw new Error(error);
            }
        }

        await db.close();
    } catch (error) {
        console.error(`Failed testing LevelDBConnector, with error: ${error.toString()}`);
        db.close();
        return false;
    }

    console.log(`End testing LevelDBConnector()`);
    return true;
}

// test the event subscription operations: subscribeEvent, listEvents, deleteEvent
async function eventSubscriptionTest(
    eventSub: eventsPb.EventSubscription
): Promise<boolean> {
    console.debug(`Start eventSubscriptionTest()`);

    try {
        var eventMatcher: eventsPb.EventMatcher = eventSub.getEventMatcher()!;
        await addEventSubscription(eventSub);
        var subscriptions: Array<queryPb.Query> = await lookupEventSubscriptions(eventMatcher) as Array<queryPb.Query>;

        for (const subscription of subscriptions) {
            if (subscription.getRequestId() == eventSub.getQuery()!.getRequestId()) {
                await deleteEventSubscription(eventMatcher, subscription.getRequestId());
                break;
            }
        }
    } catch (error) {
        console.error(`Failed testing event subscription operations, with error: ${error.toString()}`);
        return false;
    }

    console.debug(`End eventSubscriptionTest()`);
    return true;
}

export {
    dbConnectionTest,
    eventSubscriptionTest
}