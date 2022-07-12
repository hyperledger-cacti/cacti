/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import ack_pb from '@hyperledger-labs/weaver-protos-js/common/ack_pb';
import eventsPb from '@hyperledger-labs/weaver-protos-js/common/events_pb';
import events_grpc_pb from '@hyperledger-labs/weaver-protos-js/relay/events_grpc_pb';
import queryPb from '@hyperledger-labs/weaver-protos-js/common/query_pb';
import { InteroperableHelper } from '@hyperledger-labs/weaver-fabric-interop-sdk'
import { getDriverKeyCert } from "./walletSetup"
import { DBConnector, LevelDBConnector } from "./dbConnector"
import { checkIfArraysAreEqual, relayCallback } from "./utils"

const DB_NAME: string = "driverdb";

function subscribeEventHelper(
    call_request: eventsPb.EventSubscription,
    client: events_grpc_pb.EventSubscribeClient
) {
    const newRequestId = call_request.getQuery()!.getRequestId();
    addEventSubscription(call_request).then((requestId) => {
        const ack_send = new ack_pb.Ack();
        if (newRequestId == requestId) {
            // event being subscribed for the first time
            ack_send.setMessage('Event subscription is successful!');
            ack_send.setStatus(ack_pb.Ack.STATUS.OK);
    
            // the event listener logic follows here
        } else {
            // event being subscribed already exists
            ack_send.setMessage(`Event subscription already exists with requestId: ${requestId}`);
            ack_send.setStatus(ack_pb.Ack.STATUS.ERROR);
        }
        ack_send.setRequestId(newRequestId);
    
        // gRPC response.
        console.log(`Sending to the relay the eventSubscription Ack: ${JSON.stringify(ack_send.toObject())}`);
    
        if (!process.env.RELAY_ENDPOINT) {
            throw new Error('RELAY_ENDPOINT is not set.');
        }
    
        // Sending the fabric state to the relay.
        client.sendDriverSubscriptionStatus(ack_send, relayCallback);
    }).catch((error) => {
        const errorString: string = `error (thrown as part of async processing while storing to DB during subscribeEvent): ${JSON.stringify(error)}`;
        console.error(errorString);
        const ack_send_error = new ack_pb.Ack();
        ack_send_error.setRequestId(newRequestId);
        ack_send_error.setMessage(errorString);
        ack_send_error.setStatus(ack_pb.Ack.STATUS.ERROR);
        // gRPC response.
        console.log(`Sending to the relay the eventSubscription error Ack: ${JSON.stringify(ack_send_error.toObject())}`);
        // Sending the fabric state to the relay.
        client.sendDriverSubscriptionStatus(ack_send_error, relayCallback);
    });
}

function unsubscribeEventHelper(
    call_request: eventsPb.EventSubscription,
    client: events_grpc_pb.EventSubscribeClient
) {
    const newRequestId = call_request.getQuery()!.getRequestId();
    deleteEventSubscription(call_request.getEventMatcher()!, newRequestId).then((deletedSubscription: eventsPb.EventSubscription) => {
        const ack_send = new ack_pb.Ack();
        
        // event got unsubscribed
        ack_send.setMessage(`Event ${JSON.stringify(deletedSubscription.toObject())} unsubscription is successful!`);
        ack_send.setStatus(ack_pb.Ack.STATUS.OK);
        ack_send.setRequestId(newRequestId);
    
        // gRPC response.
        console.log(`Sending to the relay the eventSubscription Ack: ${JSON.stringify(ack_send.toObject())}`);
    
        if (!process.env.RELAY_ENDPOINT) {
            throw new Error('RELAY_ENDPOINT is not set.');
        }
    
        // Sending the fabric state to the relay.
        client.sendDriverSubscriptionStatus(ack_send, relayCallback);
    }).catch((error) => {
        const errorString: string = `error (thrown as part of async processing while deleting from DB during unsubscribeEvent): ${JSON.stringify(error)}`;
        console.error(errorString);
        const ack_send_error = new ack_pb.Ack();
        ack_send_error.setRequestId(newRequestId);
        ack_send_error.setMessage(errorString);
        ack_send_error.setStatus(ack_pb.Ack.STATUS.ERROR);
        // gRPC response.
        console.log(`Sending to the relay the eventSubscription error Ack: ${JSON.stringify(ack_send_error.toObject())}`);
        // Sending the fabric state to the relay.
        client.sendDriverSubscriptionStatus(ack_send_error, relayCallback);
    });
}

async function addEventSubscription(
    eventSub: eventsPb.EventSubscription
): Promise<string> {
    console.log(`adding to driver, subscription of the eventSub: ${JSON.stringify(eventSub.toObject())}`);
    let db: DBConnector;
    try {
        // Create connection to a database
        db = new LevelDBConnector(DB_NAME!);
        await db.open();

        // eventMatcher need to be non-null, hence apply the NaN assertion operator '!'
        var eventMatcher: eventsPb.EventMatcher = eventSub.getEventMatcher()!;
        // the serialized protobuf for eventMatcher below can be decoded to other formats like 'utf8' [.toString('utf8')]
        const key: string = Buffer.from(eventMatcher.serializeBinary()).toString('base64');

        // query need to be non-null, hence apply the NaN assertion operator '!'
        var query: queryPb.Query = eventSub.getQuery()!;
        // the serialized protobuf for query below can be decoded to other formats like 'utf8' [.toString('utf8')]
        var querySerialized: string = Buffer.from(query.serializeBinary()).toString('base64');
        // serialized content of subscriptions is the value present in the key/value LevelDB corresponding to the key
        var subscriptions: Array<string>;

        try {
            // fetch the current values in the DB against the given key
            var subscriptionsSerialized: string = await db.read(key) as string;
            subscriptions = JSON.parse(subscriptionsSerialized);

            console.debug(`subscriptions.length: ${subscriptions.length}`);
            // check if the event to be subscribed is already present in the DB
            for (const subscriptionSerialized of subscriptions) {
                var subscription: queryPb.Query =  queryPb.Query.deserializeBinary(Buffer.from(subscriptionSerialized, 'base64'));
                if (checkIfArraysAreEqual(subscription.getPolicyList(), query.getPolicyList()) &&
                    subscription.getAddress() == query.getAddress() &&
                    subscription.getRequestingRelay() == query.getRequestingRelay() &&
                    subscription.getRequestingNetwork() == query.getRequestingNetwork() &&
                    subscription.getCertificate() == query.getCertificate() &&
                    subscription.getRequestingOrg() == query.getRequestingOrg() &&
                    subscription.getConfidential() == query.getConfidential()) {

                    console.log(`found subscription for query with requestId: ${subscription.getRequestId()}`);
                    await db.close();
                    return subscription.getRequestId();
                }
            }

            // case of key being present in the list
            console.debug(`eventMatcher: ${JSON.stringify(eventMatcher.toObject())} is already present in the database`);
            subscriptions.push(querySerialized);
        } catch (error: any) {
            let errorString = `${JSON.stringify(error)}`;
            if (errorString.includes('Error: NotFound:')) {
                // case of read failing due to key not found
                console.debug(`eventMatcher: ${JSON.stringify(eventMatcher.toObject())} is not present before in the database`);
                subscriptions = new Array<string>();
                subscriptions.push(querySerialized);
            } else {
                // case of read failing due to some other issue
                console.error(`re-throwing error: ${errorString}`);
                await db.close();
                throw new Error(error);
            }
        }

        console.debug(`subscriptions.length: ${subscriptions.length}`);
        subscriptionsSerialized = JSON.stringify(subscriptions);
        // insert the value against key in the DB (it can be the scenario of a new key addition, or update to the value of an existing key)
        await db.insert(key, subscriptionsSerialized);
        await db.close();

        // TODO: register the event with fabric sdk
        console.log(`end addEventSubscription() .. requestId: ${query.getRequestId()}`);
        return query.getRequestId();

    } catch(error: any) {
        console.error(`Error during addEventSubscription(): ${JSON.stringify(error)}`);
        await db?.close();
        throw new Error(error);
    }
}

const deleteEventSubscription = async (
    eventMatcher: eventsPb.EventMatcher,
    requestId: string
): Promise<eventsPb.EventSubscription> => {
    console.log(`deleting from driver subscription of the eventMatcher: ${JSON.stringify(eventMatcher.toObject())} with requestId: ${requestId}`);
    var subscriptions: Array<string>;
    var retVal: eventsPb.EventSubscription = new eventsPb.EventSubscription();
    retVal.setEventMatcher(eventMatcher);
    let db: DBConnector;
    try {
        // Create connection to a database
        db = new LevelDBConnector(DB_NAME!);
        await db.open();

        const key: string = Buffer.from(eventMatcher.serializeBinary()).toString('base64');
        try {
            // fetch the current values in the DB against the given key
            var subscriptionsSerialized: string = await db.read(key) as string;
            subscriptions = JSON.parse(subscriptionsSerialized);

            console.debug(`subscriptions.length: ${subscriptions.length}`);
            var foundEntry: boolean = false;
            for (var subscriptionSerialized of subscriptions) {
                var subscription: queryPb.Query =  queryPb.Query.deserializeBinary(Buffer.from(subscriptionSerialized, 'base64'));
                if (subscription.getRequestId() == requestId) {
                    console.debug(`deleting the subscription (with input requestId): ${JSON.stringify(subscription.toObject())}`);
                    subscriptions.splice(subscriptions.indexOf(subscriptionSerialized), 1);
                    retVal.setQuery(subscription);
                    foundEntry = true;
                    break;
                }
            }

            if (!foundEntry) {
                throw new Error(`event subscription with requestId: ${requestId} is not found!`);
            }
        } catch (error: any) {
            // error could be either due to key not being present in the database or some other issue with database access
            console.error(`re-throwing error: ${JSON.stringify(error)}`);
            await db.close();
            throw new Error(error);
        }

        console.debug(`subscriptions.length: ${subscriptions.length}`);
        if (subscriptions.length == 0) {
            await db.delete(key);
        } else {
            subscriptionsSerialized = JSON.stringify(subscriptions);
            await db.insert(key, subscriptionsSerialized);
        }

        await db.close();
        console.log(`end deleteEventSubscription() .. retVal: ${JSON.stringify(retVal.toObject())}`);
        return retVal;
    } catch(error: any) {
        console.error(`Error during delete: ${JSON.stringify(error)}`);
        await db?.close();
        throw new Error(error);
    }
}

async function lookupEventSubscriptions(
    eventMatcher: eventsPb.EventMatcher
): Promise<Array<queryPb.Query>> {
    console.info(`finding the subscriptions with eventMatcher: ${JSON.stringify(eventMatcher.toObject())}`);
    var subscriptions: Array<string>;
    var returnSubscriptions: Array<queryPb.Query> = new Array<queryPb.Query>();
    let db: DBConnector;

    try {
        // Create connection to a database
        db = new LevelDBConnector(DB_NAME!);
        await db.open();

        var eventMatcher: eventsPb.EventMatcher = eventMatcher;
        const key: string = Buffer.from(eventMatcher.serializeBinary()).toString('base64');

        // fetch the current values in the DB against the given key
        var subscriptionsSerialized: string = await db.read(key) as string;
        subscriptions = JSON.parse(subscriptionsSerialized)
        for (const subscriptionSerialized of subscriptions) {
            var subscription: queryPb.Query =  queryPb.Query.deserializeBinary(Buffer.from(subscriptionSerialized, 'base64'));
            console.debug(`subscription: ${JSON.stringify(subscription.toObject())}`)
            returnSubscriptions.push(subscription);
        }

        console.debug(`returnSubscriptions.length: ${returnSubscriptions.length}`);
        console.log(`end lookupEventSubscriptions()`);
        await db.close();
        return returnSubscriptions;

    } catch (error: any) {
        let errorString: string = `${JSON.stringify(error)}`
        await db?.close();
        if (errorString.includes('Error: NotFound:')) {
            // case of read failing due to key not found
            returnSubscriptions = new Array<queryPb.Query>();
            console.debug(`returnSubscriptions.length: ${returnSubscriptions.length}`);
            return returnSubscriptions;
        } else {
            // case of read failing due to some other issue
            console.error(`Error during lookup: ${JSON.stringify(error)}`);
            throw new Error(error);
        }
    }
}

async function signEventSubscriptionQuery(
    inputQuery: queryPb.Query
): Promise<queryPb.Query> {
    console.log(`driver ready to provide sign on query: ${JSON.stringify(inputQuery.toObject())}`);
    let signedQuery = new queryPb.Query();

    try {
        signedQuery.setPolicyList(inputQuery.getPolicyList());
        signedQuery.setAddress(inputQuery.getAddress());
        signedQuery.setRequestingRelay(inputQuery.getRequestingRelay());
        signedQuery.setRequestingOrg(inputQuery.getRequestingOrg());
        signedQuery.setRequestingNetwork(inputQuery.getRequestingNetwork());
        signedQuery.setNonce(inputQuery.getNonce());
        signedQuery.setRequestId(inputQuery.getRequestId());
        signedQuery.setConfidential(inputQuery.getConfidential());

        const keyCert = await getDriverKeyCert()
        signedQuery.setCertificate(keyCert.cert);
        signedQuery.setRequestorSignature(
            InteroperableHelper.signMessage(
                inputQuery.getAddress() + inputQuery.getNonce(),
                keyCert.key.toBytes()
            ).toString("base64")
        );
        return signedQuery;
    } catch (error: any) {
        const errorString: string = `${JSON.stringify(error)}`;
        console.error(`signing query failed with error: ${errorString}`);
        throw new Error(error);
    }
}

export {
    subscribeEventHelper,
    unsubscribeEventHelper,
    addEventSubscription,
    deleteEventSubscription,
    lookupEventSubscriptions,
    signEventSubscriptionQuery
}