/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fabproto6 from 'fabric-protos';
import { Gateway, Network, Contract, ContractEvent, BlockListener, ContractListener, BlockEvent } from 'fabric-network';
import query_pb from '@hyperledger-labs/weaver-protos-js/common/query_pb';
import events_pb from '@hyperledger-labs/weaver-protos-js/common/events_pb';
import { lookupEventSubscriptions, readAllEventMatchers } from './events';
import { invoke, getNetworkGateway, packageFabricView } from './fabric-code';
import { handlePromise, relayCallback, getRelayClientForEventPublish } from './utils';
import { DBLockedError } from './dbConnector';

let networkGatewayMap = new Map<string, Gateway>();
let networkChannelMap = new Map<string, Network>();
let networkChannelContractMap = new Map<string, Contract>();
let channelBlockListenerMap = new Map<string, BlockListener>();
let channelBlockListenerCount = new Map<string, number>();
let channelContractListenerMap = new Map<string, ContractListener>();
let channelContractListenerCount = new Map<string, number>();

function getChannelContractKey(channelId: string, contractId: string) {
    return channelId + ':' + contractId;
}

/**
 * Register a block listener with a callback
 **/
const initBlockEventListenerForChannel = async (
    network: Network,
    networkName: string,
    channelId: string,
): Promise<any> => {
    const listener: BlockListener = async (event: BlockEvent) => {
        // Parse the block data; typically there is only one element in this array but we will interate over it just to be safe
        const blockData = ((event.blockData as fabproto6.common.Block).data as fabproto6.common.BlockData).data;
        blockData.forEach((item) => {
            const payload = Object.values(item)[Object.keys(item).indexOf('payload')];
            const payloadData = Object.values(payload)[Object.keys(payload).indexOf('data')];
            const transactions = payloadData.actions;
            // Iterate through the transaction list
            transactions.forEach(async (transaction: any) => {
                // Get transaction chaincode ID
                const chaincodeId = transaction.payload.chaincode_proposal_payload.input.chaincode_spec.chaincode_id.name;
                if (transaction.payload.chaincode_proposal_payload.input.chaincode_spec.input.args.length > 0) {
                    // below way of fetching payload requires that the response has been set by the chaincode function via return value
                    const responsePayload = transaction.payload.action.proposal_response_payload.extension.response.payload;
                    // below way of fetching payload is similar to ContractEventListener in which we fetch event.payload
                    // const responsePayload = transaction.payload.action.proposal_response_payload.extension.events.payload;
                    // Get transaction function name: first argument according to convention
                    const chaincodeFunc = transaction.payload.chaincode_proposal_payload.input.chaincode_spec.input.args[0].toString();
                    console.log('Trying to find match for channel', channelId, 'chaincode', chaincodeId, 'function', chaincodeFunc);
                    // Find all matching event subscriptions stored in the database
                    let eventMatcher = new events_pb.EventMatcher();
                    eventMatcher.setEventType(events_pb.EventType.LEDGER_STATE);
                    eventMatcher.setEventClassId('');       // Only match subscriptions where class ID is not specified
                    eventMatcher.setTransactionLedgerId(channelId);
                    eventMatcher.setTransactionContractId(chaincodeId);
                    eventMatcher.setTransactionFunc(chaincodeFunc);
                    let eventSubscriptionQueries;
                    for (let i = 0 ; i < 10 ; i++) {
                        try{
                            eventSubscriptionQueries = await lookupEventSubscriptions(eventMatcher);
                            break;
                        } catch(error) {
                            let errorString: string = error.toString();
                            if (!(error instanceof DBLockedError)) {    // Check if contention was preventing DB access
                                throw(error);
                            }
                            await new Promise(f => setTimeout(f, 2000));    // Sleep 2 seconds
                        }
                    }
                    // Iterate through the view requests in the matching event subscriptions
                    eventSubscriptionQueries.forEach(async (eventSubscriptionQuery: query_pb.Query) => {
                        console.log('Generating view and collecting proof for channel', channelId, 'chaincode', chaincodeId, 'function', chaincodeFunc, 'responsePayload', responsePayload.toString());
                        // Trigger proof collection
                        const [result, invokeError] = await handlePromise(
                            invoke(
                                eventSubscriptionQuery,
                                networkName,
                                'HandleEventRequest',
                                responsePayload
                            ),
                        );
                        if (!invokeError) {
                            // Package view and send to relay
                            const client = getRelayClientForEventPublish();
                            const viewPayload = packageFabricView(eventSubscriptionQuery, result);

                            console.log('Sending block event');
                            // Sending the Fabric event to the relay.
                            client.sendDriverState(viewPayload, relayCallback);
                        }
                    })
                }
            })
        })
    };
    await network.addBlockListener(listener);
    channelBlockListenerMap.set(channelId, listener);
    console.log('Added block listener for channel', channelId);
    return listener;
}

/**
 * Register a chaincode event listener with a callback
 **/
const initContractEventListener = (
    contract: Contract,
    networkName: string,
    channelId: string,
    chaincodeId: string,
): any => {
    const listener: ContractListener = async (event: ContractEvent) => {
        console.log('Trying to find match for channel', channelId, 'chaincode', chaincodeId, 'event class', event.eventName);
        // Find all matching event subscriptions stored in the database
        let eventMatcher = new events_pb.EventMatcher();
        eventMatcher.setEventType(events_pb.EventType.LEDGER_STATE);
        eventMatcher.setEventClassId(event.eventName);
        eventMatcher.setTransactionLedgerId(channelId);
        eventMatcher.setTransactionContractId(chaincodeId);
        eventMatcher.setTransactionFunc('*');
        let eventSubscriptionQueries;
        for (let i = 0 ; i < 10 ; i++) {
            try{
                eventSubscriptionQueries = await lookupEventSubscriptions(eventMatcher);
                break;
            } catch(error) {
                let errorString: string = error.toString();
                if (!(error instanceof DBLockedError)) {    // Check if contention was preventing DB access
                    throw(error);
                }
                await new Promise(f => setTimeout(f, 2000));    // Sleep 2 seconds
            }
        }
        // Iterate through the view requests in the matching event subscriptions
        eventSubscriptionQueries.forEach(async (eventSubscriptionQuery: query_pb.Query) => {
            console.log('Generating view and collecting proof for event class', event.eventName, 'channel', channelId, 'chaincode', chaincodeId, 'event.payload', event.payload.toString());
            // Trigger proof collection
            const [result, invokeError] = await handlePromise(
                invoke(
                    eventSubscriptionQuery,
                    networkName,
                    'HandleEventRequest',
                    event.payload
                ),
            );
            if (!invokeError) {
                // Package view and send to relay
                const client = getRelayClientForEventPublish();
                const viewPayload = packageFabricView(eventSubscriptionQuery, result);

                console.log('Sending contract event');
                // Sending the Fabric event to the relay.
                client.sendDriverState(viewPayload, relayCallback);
            }
        })
    };
    contract.addContractListener(listener);
    channelContractListenerMap.set(getChannelContractKey(channelId, chaincodeId), listener);
    console.log('Added contract listener for channel', channelId, 'and contract', chaincodeId);
    return listener;
}

/**
 * Start an appropriate listener if there is currently none for the channel (or chaincode) this event subscription refers to.
 **/
const registerListenerForEventSubscription = async (
    eventMatcher: events_pb.EventMatcher,
    networkName: string,
): Promise<any> => {
    const channelId = eventMatcher.getTransactionLedgerId();
    let gateway: Gateway, network: Network;
    if (networkGatewayMap.has(networkName)) {
        gateway = networkGatewayMap.get(networkName);
        network = networkChannelMap.get(channelId);
        if (!network) {
            throw new Error('No network/channel handle found for existing gateway and channel ID: ' + channelId);
        }
    } else {
        gateway = await getNetworkGateway(networkName);
        networkGatewayMap.set(networkName, gateway);
        network = await gateway.getNetwork(channelId);
        networkChannelMap.set(channelId, network);
    }
    // Check if the event_class_id is specified in the event matcher field.
    if (eventMatcher.getEventClassId().length === 0) {
        // Check if there is an active block listener for the channel specified in this event subscription.
        if (channelBlockListenerMap.has(channelId)) {
            channelBlockListenerCount.set(channelId, channelBlockListenerCount.get(channelId) + 1);
        } else {
            // Start a block listener.
            const listener = await initBlockEventListenerForChannel(network, networkName, channelId);
            channelBlockListenerCount.set(channelId, 1);
            return listener;
        }
    } else {
        // Check if there is an active contract listener for the contract function specified in this event subscription.
        const contractId = eventMatcher.getTransactionContractId();
        const channelContractKey = getChannelContractKey(channelId, contractId);
        let contract: Contract;
        if (networkChannelContractMap.has(channelContractKey)) {
            contract = networkChannelContractMap.get(channelContractKey);
        } else {
            contract = network.getContract(contractId);
            networkChannelContractMap.set(channelContractKey, contract);
        }
        if (channelContractListenerMap.has(channelContractKey)) {
            channelContractListenerCount.set(channelContractKey, channelContractListenerCount.get(channelContractKey) + 1);
        } else {
            // Start a contract listener.
            const listener = initContractEventListener(contract, networkName, channelId, contractId);
            channelContractListenerCount.set(channelContractKey, 1);
            return listener;
        }
    }
    return null;    // Listener was already running. Nothing to do.
}

/**
 * Decrement subscription count against an active listener. Stop the listener if the count is 0.
 **/
const unregisterListenerForEventSubscription = async (
    eventMatcher: events_pb.EventMatcher,
    networkName: string,
): Promise<boolean> => {
    const channelId = eventMatcher.getTransactionLedgerId();
    let gateway: Gateway, network: Network;
    if (networkGatewayMap.has(networkName)) {
        gateway = networkGatewayMap.get(networkName);
        network = networkChannelMap.get(channelId);
        if (!network) {
            throw new Error('No network/channel handle found for existing gateway and channel ID: ' + channelId);
        }
    } else {
        gateway = await getNetworkGateway(networkName);
        networkGatewayMap.set(networkName, gateway);
        network = await gateway.getNetwork(channelId);
        networkChannelMap.set(channelId, network);
    }
    // Check if the event_class_id is specified in the event matcher field.
    if (eventMatcher.getEventClassId().length === 0) {
        if (!channelBlockListenerMap.has(channelId)) {
            return false;
        }
        channelBlockListenerCount.set(channelId, channelBlockListenerCount.get(channelId) - 1);
        if (channelBlockListenerCount.get(channelId) === 0) {   // Remove listener and counter
            network.removeBlockListener(channelBlockListenerMap.get(channelId));
            channelBlockListenerCount.delete(channelId);
            return channelBlockListenerMap.delete(channelId);
        } else {
            return true;
        }
    } else {
        const contractId = eventMatcher.getTransactionContractId();
        const channelContractKey = getChannelContractKey(channelId, contractId);
        let contract: Contract;
        if (networkChannelContractMap.has(channelContractKey)) {
            contract = networkChannelContractMap.get(channelContractKey);
        } else {
            contract = network.getContract(contractId);
            networkChannelContractMap.set(channelContractKey, contract);
        }
        if (!channelContractListenerMap.has(channelContractKey)) {
            return false;
        }
        channelContractListenerCount.set(channelContractKey, channelContractListenerCount.get(channelContractKey) - 1);
        if (channelContractListenerCount.get(channelContractKey) === 0) {   // Remove listener and counter
            contract.removeContractListener(channelContractListenerMap.get(channelContractKey));
            channelContractListenerCount.delete(channelContractKey);
            return channelContractListenerMap.delete(channelContractKey);
        } else {
            return true;
        }
    }
}

/**
 * Load event subscriptions from the driver database.
 * Start a listener for each channel from which one of the subscribed events originate.
 **/
const loadEventSubscriptionsFromStorage = async (networkName: string): Promise<boolean> => {
    console.log('Starting event listeners for subscribed events in database...')
    try {
        const eventMatchers = await readAllEventMatchers();
        for (const eventMatcher of eventMatchers) {
            try {
                const listenerHandle = await registerListenerForEventSubscription(
                    eventMatcher,
                    networkName
                )
            } catch(error) {
                console.error(`Error: Could not start event listener for ${JSON.stringify(eventMatcher.toObject())} with error: ${error}`)
                return false
            }
        }
    } catch(error) {
        console.error(`Error: event matcher read error: ${error}`)
        return false
    }
    return true
}

export { registerListenerForEventSubscription, unregisterListenerForEventSubscription, loadEventSubscriptionsFromStorage };
