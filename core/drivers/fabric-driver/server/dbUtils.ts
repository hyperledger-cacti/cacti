/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import eventsPb from "@hyperledger-labs/weaver-protos-js/common/events_pb";
import { Query } from "@hyperledger-labs/weaver-protos-js/common/query_pb";

import { LevelDBConnector } from "./dbConnector"

// Create connection to a database
const db = new LevelDBConnector("mydb")

async function addEventSubscription(
    eventSub: eventsPb.EventSubscription
): Promise<boolean> {
    console.log(`adding to driver, subscription of the event: ${eventSub}`)

    try {

        //let key = JSON.stringify(eventSub.getEventmatcher());
        let key = eventSub.getEventmatcher();
        let value = eventSub.getQuery();
        var subscriptions: any
        try {
            subscriptions = await db.read(key)
        } catch (error: any) {
            console.log(`error: ${error}`);
            let errorString = `${error}`
            if (errorString.includes('Error: NotFound:')) {
                // case of read failing due to key not found
                subscriptions = [value]
                console.log(`inside add.. subscriptions: ${subscriptions}`);
            } else {
                // case of read failing due to some other issue
                console.log(`re-throwing error: ${error}`);
                throw new Error(error);
            }
        }

        if (typeof subscriptions !== 'undefined') {
            if (subscriptions.length == 0) {
                // empty list
                subscriptions.push(value)
            } else {
                // check if the value already exists
                // insert if it doesn't exist already
            }
        } else {
            subscriptions = [eventSub.getQuery]
        }
        console.info(`inside add.. subscriptions: ${subscriptions}`);
        await db.insert(key, subscriptions);

    } catch(error) {
        console.error(`Error during addEventSubscription(): ${error}`);
    }
    // if the EventMatcher is already present, then append
    // else insert new EventMatcher

    // register the event with fabric sdk
    console.info(`end adding`)
    return true;
}

const deleteEventSubscription = async (
    eventMatcher: eventsPb.EventMatcher,
    requestId: string
): Promise<eventsPb.EventSubscription> => {
    console.debug(`deleting from driver subscription of the event: ${eventMatcher} with requestId: ${requestId}`)
    var value: any

    return value
}

async function lookupEventSubscriptions(
    eventMatcher: eventsPb.EventMatcher
): Promise<Array<Query>> {
    console.info(`finding the subscriptions with eventMatcher: ${eventMatcher}`)
    var subscriptions: any
    try {
        //let key = JSON.stringify(eventMatcher);
        let key = eventMatcher;
        subscriptions = await db.read(key)
        let subscriptionArr = <Query[]> subscriptions;
    
        console.log(`subscriptions: ${subscriptionArr.length}`);
        console.info(`subscriptions: ${subscriptionArr[0]}`);
        if (typeof subscriptions == 'undefined') {
            subscriptions = []
        } else {
            console.log(`subscriptions: ${subscriptions.length}`);
            console.info(`subscriptions: ${subscriptions[0]}`);
        }
    } catch(e) {
        console.error(`Error during lookup: ${e}`);
    }

    console.info(`end lookup`)
    return subscriptions
}


export {
    addEventSubscription,
    //deleteEventSubscription,
    lookupEventSubscriptions
}