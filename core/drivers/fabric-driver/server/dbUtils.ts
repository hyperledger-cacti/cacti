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
): Promise<string> {
    console.log(`adding to driver, subscription of the eventSub: ${eventSub}`)

    try {

        const key = JSON.stringify(eventSub.getEventmatcher()!.toObject());
        const query = eventSub.getQuery()!;
        var subscriptions: Array<Query> = new Array<Query>();

        try {
            subscriptions = await db.read(key);

            console.debug(`subscriptions.length: ${subscriptions.length}`);
            for (const subscription of subscriptions) {
                if (subscription.getAddress() == query.getAddress() &&
                    subscription.getRequestingRelay() == query.getRequestingRelay() &&
                    subscription.getRequestingNetwork() == query.getRequestingNetwork() &&
                    subscription.getCertificate() == query.getCertificate() &&
                    subscription.getRequestorSignature() == query.getRequestorSignature() &&
                    subscription.getRequestingOrg() == query.getRequestingOrg() &&
                    subscription.getConfidential() == query.getConfidential()) {
                        console.debug(`found subscription for query with requestId: ${subscription.getRequestId()}`);
                        return subscription.getRequestId();
                    }
            }

            // case of key not being present in the list
            console.debug(`key: ${key} already present in the database`);
            subscriptions.push(query);
        } catch (error: any) {
            console.log(`error: ${error}`);
            let errorString = `${error}`
            if (errorString.includes('Error: NotFound:')) {
                // case of read failing due to key not found
                console.debug(`key: ${key} was not present before in the database`);
                subscriptions.push(query);
            } else {
                // case of read failing due to some other issue
                console.error(`re-throwing error: ${error}`);
                throw new Error(error);
            }
        }

        console.debug(`subscriptions: ${subscriptions}`);
        await db.insert(key, subscriptions);

        // register the event with fabric sdk
        console.log(`end addEventSubscription() requestId: ${query.getRequestId()}`)
        return query.getRequestId();

    } catch(error: any) {
        console.error(`Error during addEventSubscription(): ${error}`);
        throw new Error(error);
    }
}

const deleteEventSubscription = async (
    eventMatcher: eventsPb.EventMatcher,
    requestId: string
): Promise<eventsPb.EventSubscription> => {
    console.error(`deleting from driver subscription of the eventMatcher: ${eventMatcher} with requestId: ${requestId}`)
    var subscriptions: Array<Query> = new Array<Query>();
    var retVal: eventsPb.EventSubscription = new eventsPb.EventSubscription();
    retVal.setEventmatcher(eventMatcher);
    try {
        const key = JSON.stringify(eventMatcher!.toObject());
        try {
            //subscriptions = <Query[]> await db.read(key)
            subscriptions = await db.read(key) as Array<Query>;
            console.debug(`subscriptions.length: ${subscriptions.length}`);
            for (const subscription of subscriptions) {
                if (subscription.getRequestId() == requestId) {
                        console.debug(`deleting the subscription with input requestId: ${JSON.stringify(subscription)}`);
                        subscriptions.splice(subscriptions.indexOf(subscription), 1);
                        retVal.setQuery(subscription);
                        break;
                    }
            }
        } catch (error: any) {
            // error could be either due to key not being present in the database or some other issue with database access
            console.error(`re-throwing error: ${error}`);
            throw new Error(error);
        }

        console.debug(`subscriptions: ${JSON.stringify(subscriptions)}`);
        await db.insert(key, subscriptions);
        console.log(`end deleteEventSubscription()`)
        return retVal;
    } catch(error: any) {
        console.error(`Error during lookup: ${error}`);
        throw new Error(error);
    }
}

async function lookupEventSubscriptions(
    eventMatcher: eventsPb.EventMatcher
): Promise<any> {
    console.info(`finding the subscriptions with eventMatcher: ${eventMatcher}`)
    var subscriptions: Array<Query> = new Array<Query>();
    try {
        const key = JSON.stringify(eventMatcher!.toObject());
        try {
            subscriptions = await db.read(key)
        } catch (error: any) {
            let errorString: string = `${error}`
            if (errorString.includes('Error: NotFound:')) {
                // case of read failing due to key not found
                subscriptions = new Array<Query>();
                console.debug(`subscriptions: ${JSON.stringify(subscriptions)}`);
                return subscriptions;
            } else {
                // case of read failing due to some other issue
                console.log(`re-throwing error: ${error}`);
                throw new Error(error);
            }
        }

        console.debug(`subscriptions.length: ${subscriptions.length}`);
        console.debug(`subscriptions: ${JSON.stringify(subscriptions)}`);
        console.log(`end lookupEventSubscriptions()`)
        return subscriptions;
    } catch(error: any) {
        console.error(`Error during lookup: ${error}`);
        throw new Error(error);
    }
}


export {
    addEventSubscription,
    deleteEventSubscription,
    lookupEventSubscriptions
}