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
        const ctx = new eventsPb.ContractTransaction()
        ctx.setDriverId(driverId)
        ctx.setLedgerId(channelId)
        ctx.setContractId(chaincodeId)
        ctx.setFunc(ccFunc)
        ctx.setArgsList(ccArgs)
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
        relay.ProcessSuscribeEventRequest(
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

export {
    createEventMatcher,
    createEventPublicationSpec,
    subscribeRemoteEvent,
}

