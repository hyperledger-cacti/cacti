/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * This file provides helper functions for interoperability operations.
 **/
/** End file docs */

import log4js from "log4js";
import { v4 as uuidv4 } from "uuid";
import { ICryptoKey } from "fabric-common";
import { Contract } from "fabric-network";
import eventsPb from "@hyperledger-labs/weaver-protos-js/common/events_pb";
import { Relay } from "./Relay";
import { InteropJSON } from "./types";
import { getPolicyCriteriaForAddress, createAddress, signMessage } from "./InteroperableHelper";
import * as helpers from "./helpers";

const logger = log4js.getLogger("EventsManager");

function createEventMatcher ({
    eventType,
    eventClassId,
    transactionLedgerId,
    transactionContractId,
    transactionFunc
}: {
    eventType: eventsPb.EventType,
    eventClassId: string,
    transactionLedgerId: string,
    transactionContractId: string,
    transactionFunc: string
}): eventsPb.EventMatcher {
    const eventMatcher = new eventsPb.EventMatcher()
    eventMatcher.setEventType(eventType)
    eventMatcher.setEventClassId(eventClassId)
    eventMatcher.setTransactionLedgerId(transactionLedgerId)
    eventMatcher.setTransactionContractId(transactionContractId)
    eventMatcher.setTransactionFunc(transactionFunc)
    return eventMatcher
}


function createEventPublicationSpec ({
    appUrl,
    driverId,
    channelId,
    chaincodeId,
    ccFunc,
    ccArgs,
    replaceArgIndex
}: {
    appUrl?: string,
    driverId?: string,
    channelId?: string,
    chaincodeId?: string,
    ccFunc?: string,
    ccArgs?: string[],
    replaceArgIndex?: number,
}): eventsPb.EventPublication {
    const eventPublicationSpec = new eventsPb.EventPublication()
    if (appUrl) {
        eventPublicationSpec.setAppUrl(appUrl)
    } else {

        let ccArgsB64 = [];
	for (const ccArg of ccArgs) {
            ccArgsB64.push(Buffer.from(ccArg).toString('base64'));
	}
        console.log(`ccArgs: ${ccArgs} ccArgsB64: ${ccArgsB64}`)

        const ctx = new eventsPb.ContractTransaction()
        ctx.setDriverId(driverId)
        ctx.setLedgerId(channelId)
        ctx.setContractId(chaincodeId)
        ctx.setFunc(ccFunc)
        ctx.setArgsList(ccArgsB64)
        ctx.setReplaceArgIndex(replaceArgIndex)
        eventPublicationSpec.setCtx(ctx)
    }
    return eventPublicationSpec
}

const subscribeRemoteEvent = async (
    interopContract: Contract,
    eventMatcher: eventsPb.EventMatcher,
    eventPublicationSpec: eventsPb.EventPublication,
    networkID: string,
    org: string,
    localRelayEndpoint: string,
    interopJSON: InteropJSON,
    keyCert: { key: ICryptoKey; cert: any },
    useTls: boolean = false,
    tlsRootCACertPaths?: Array<string>,
    confidential: boolean = false,
): Promise<any> => {
    logger.debug("Remote Event Subscription")
    const {
        address,
        ChaincodeFunc,
        ChaincodeID,
        ChannelID,
        RemoteEndpoint,
        NetworkID: RemoteNetworkID,
        Sign,
        ccArgs: args,
    } = interopJSON;
    // Step 1
    const computedAddress =
        address ||
        createAddress(
            { ccFunc: ChaincodeFunc, contractName: ChaincodeID, channel: ChannelID, ccArgs: args },
            RemoteNetworkID,
            RemoteEndpoint,
        );
        
    const [policyCriteria, policyCriteriaError] = await helpers.handlePromise(
        getPolicyCriteriaForAddress(interopContract, computedAddress),
    );
    if (policyCriteriaError) {
        throw new Error(`InteropFlow failed to get policy criteria: ${policyCriteriaError}`);
    }

    const relay = useTls ? new Relay(localRelayEndpoint, Relay.defaultTimeout, true, tlsRootCACertPaths) : new Relay(localRelayEndpoint);
    const uuidValue = uuidv4();
    
    logger.debug("Making event subscription call to relay for \
        event: ${eventMatcher} and publication spec: ${eventPublicationSpec}")
    
    const [relayResponse, relayResponseError] = await helpers.handlePromise(
        relay.ProcessSubscribeEventRequest(
            eventMatcher,
            eventPublicationSpec,
            computedAddress,
            policyCriteria,
            networkID,
            keyCert.cert,
            Sign ? signMessage(computedAddress + uuidValue, keyCert.key.toBytes()).toString("base64") : "",
            uuidValue,
            // Org is empty as the name is in the certs for
            org,
            confidential,
        ),
    );
    if (relayResponseError) {
        throw new Error(`Event Subscription relay response error: ${relayResponseError}`);
    }
    
    logger.debug(`Event Subscription Successfull: ${JSON.stringify(relayResponse)}`)
    
    return relayResponse
}


const unsubscribeRemoteEvent = async (
    interopContract: Contract,
    eventMatcher: eventsPb.EventMatcher,
    eventPublicationSpec: eventsPb.EventPublication,
    requestID: string,
    networkID: string,
    org: string,
    localRelayEndpoint: string,
    interopJSON: InteropJSON,
    keyCert: { key: ICryptoKey; cert: any },
    useTls: boolean = false,
    tlsRootCACertPaths?: Array<string>,
    confidential: boolean = false,
): Promise<any> => {
    logger.debug("Remote Event Unsubscription")
    const {
        address,
        ChaincodeFunc,
        ChaincodeID,
        ChannelID,
        RemoteEndpoint,
        NetworkID: RemoteNetworkID,
        Sign,
        ccArgs: args,
    } = interopJSON;
    // Step 1
    const computedAddress =
        address ||
        createAddress(
            { ccFunc: ChaincodeFunc, contractName: ChaincodeID, channel: ChannelID, ccArgs: args },
            RemoteNetworkID,
            RemoteEndpoint,
        );
        
    const [policyCriteria, policyCriteriaError] = await helpers.handlePromise(
        getPolicyCriteriaForAddress(interopContract, computedAddress),
    );
    if (policyCriteriaError) {
        throw new Error(`InteropFlow failed to get policy criteria: ${policyCriteriaError}`);
    }

    const relay = useTls ? new Relay(localRelayEndpoint, Relay.defaultTimeout, true, tlsRootCACertPaths) : new Relay(localRelayEndpoint);
    const uuidValue = uuidv4();
    
    logger.debug("Making event unsubscription call to relay for \
        event: ${eventMatcher} and publication spec: ${eventPublicationSpec}")
    
    const [relayResponse, relayResponseError] = await helpers.handlePromise(
        relay.ProcessUnsubscribeEventRequest(
            eventMatcher,
            eventPublicationSpec,
            requestID,
            computedAddress,
            policyCriteria,
            networkID,
            keyCert.cert,
            Sign ? signMessage(computedAddress + uuidValue, keyCert.key.toBytes()).toString("base64") : "",
            uuidValue,
            // Org is empty as the name is in the certs for
            org,
            confidential,
        ),
    );
    if (relayResponseError) {
        throw new Error(`Event Unsubscription relay response error: ${relayResponseError}`);
    }
    
    logger.debug(`Event Unsubscription Successfull: ${JSON.stringify(relayResponse)}`)
    
    return relayResponse
}

const getSubscriptionStatus = async (
    requestID: string,
    localRelayEndpoint: string,
    asJson: boolean = true,
    useTls: boolean = false,
    tlsRootCACertPaths?: Array<string>,
): Promise<any> => {
    logger.debug("Get Event Subscription Status")

    const relay = useTls ? new Relay(localRelayEndpoint, Relay.defaultTimeout, true, tlsRootCACertPaths) : new Relay(localRelayEndpoint);

    const [relayResponse, relayResponseError] = await helpers.handlePromise(
        relay.GetEventSubscriptionState(
            requestID,
            false
        ),
    );
    if (relayResponseError) {
        throw new Error(`Get event subscription relay response error: ${relayResponseError}`);
    }

    let eventSubscriptionState: eventsPb.EventSubscriptionState = relayResponse;
    let ccArgsB64 = eventSubscriptionState.getEventPublicationSpec().getCtx().getArgsList_asB64();
    let ccArgsStr = [];
    for (const ccArgB64 of ccArgsB64) {
        ccArgsStr.push(Buffer.from(ccArgB64, 'base64').toString('utf8'));
    }

    eventSubscriptionState.getEventPublicationSpec().getCtx().setArgsList(ccArgsStr);

    logger.debug(`Get event subscription status response: ${JSON.stringify(relayResponse)}`)

    return asJson? eventSubscriptionState.toObject() : relayResponse;
}

const getAllReceivedEvents = async (
    requestID: string,
    localRelayEndpoint: string,
    asJson: boolean = true,
    useTls: boolean = false,
    tlsRootCACertPaths?: Array<string>,
): Promise<any> => {
    logger.debug("Get all received event states")

    const relay = useTls ? new Relay(localRelayEndpoint, Relay.defaultTimeout, true, tlsRootCACertPaths) : new Relay(localRelayEndpoint);
    
    const [relayResponse, relayResponseError] = await helpers.handlePromise(
        relay.GetEventStates(
            requestID,
            asJson
        ),
    );
    if (relayResponseError) {
        throw new Error(`Get event states relay response error: ${relayResponseError}`);
    }
    
    logger.debug(`Get event states response: ${JSON.stringify(relayResponse)}`)
    
    return relayResponse
}


export {
    createEventMatcher,
    createEventPublicationSpec,
    subscribeRemoteEvent,
    unsubscribeRemoteEvent,
    getSubscriptionStatus,
    getAllReceivedEvents,
}

