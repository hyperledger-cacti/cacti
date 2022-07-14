/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as $protobuf from "protobufjs";
import ByteBuffer from 'bytebuffer';
import * as fabproto6 from 'fabric-protos';
import { Gateway, Wallets, Network, Contract, BlockListener, ContractListener } from 'fabric-network';
import query_pb from '@hyperledger-labs/weaver-protos-js/common/query_pb';
import events_pb from '@hyperledger-labs/weaver-protos-js/common/events_pb';
import { lookupEventSubscriptions } from './events';
import { invoke, getNetworkGateway } from './fabric-code';
import { getRelayClient, packageViewAndSendToRelay } from './server';
import { handlePromise } from './utils';

let channelBlockListenerMap = new Map<string, BlockListener>();
let channelContractListenerMap = new Map<string, ContractListener>();

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
): Promise<void> => {
    const listener: BlockListener = async (event) => {
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
                    // Get transaction function name: first argument according to convention
                    const chaincodeFunc = transaction.payload.chaincode_proposal_payload.input.chaincode_spec.input.args[0].toString();
                    console.log('Trying to find match for channel', channelId, 'chaincode', chaincodeId, 'function', chaincodeFunc);
                    // Find all matching event subscriptions stored in the database
                    let eventMatcher = new events_pb.EventMatcher();
                    eventMatcher.setEventType(events_pb.EventType.LEDGER_STATE);
                    eventMatcher.setEventClassId('*');
                    eventMatcher.setTransactionLedgerId(channelId);
                    eventMatcher.setTransactionContractId(chaincodeId);
                    eventMatcher.setTransactionFunc(chaincodeFunc);
                    const eventSubscriptionQueries = await lookupEventSubscriptions(eventMatcher);
                    // Iterate through the view requests in the matching event subscriptions
                    eventSubscriptionQueries.forEach(async (eventSubscriptionQuery: query_pb.Query) => {
                        console.log('Generating view and collecting proof for channel', channelId, 'chaincode', chaincodeId);
                        // Trigger proof collection
                        const [result, invokeError] = await handlePromise(
                            invoke(
                                eventSubscriptionQuery,
                                networkName,
                            ),
                        );
                        if (!invokeError) {
                            // Package view and send to relay
                            packageViewAndSendToRelay(eventSubscriptionQuery, result, getRelayClient());
                        }
                    })
                }
            })
        })
    };
    await network.addBlockListener(listener);
    channelBlockListenerMap.set(channelId, listener);
    console.log('Added block listener for channel', channelId);
}

/**
 * Register a block listener with a callback
 **/
const initContractEventListener = (
    contract: Contract,
    networkName: string,
    channelId: string,
    chaincodeId: string,
): void => {
    const listener: ContractListener = async (event) => {
        console.log('Trying to find match for channel', channelId, 'chaincode', chaincodeId, 'event class', event.eventName);
        // Find all matching event subscriptions stored in the database
        let eventMatcher = new events_pb.EventMatcher();
        eventMatcher.setEventType(events_pb.EventType.LEDGER_STATE);
        eventMatcher.setEventClassId(event.eventName);
        eventMatcher.setTransactionLedgerId(channelId);
        eventMatcher.setTransactionContractId(chaincodeId);
        eventMatcher.setTransactionFunc('*');
        const eventSubscriptionQueries = await lookupEventSubscriptions(eventMatcher);
        // Iterate through the view requests in the matching event subscriptions
        eventSubscriptionQueries.forEach(async (eventSubscriptionQuery: query_pb.Query) => {
            // Trigger proof collection
            // Package view and send to relay
            console.log('Generating view and collecting proof for event class', event.eventName, 'channel', channelId, 'chaincode', chaincodeId);
            // Trigger proof collection
            const [result, invokeError] = await handlePromise(
                invoke(
                    eventSubscriptionQuery,
                    networkName,
                ),
            );
            if (!invokeError) {
                // Package view and send to relay
                packageViewAndSendToRelay(eventSubscriptionQuery, result, getRelayClient());
            }
        })
    };
    contract.addContractListener(listener);
    channelContractListenerMap.set(getChannelContractKey(channelId, chaincodeId), listener);
    console.log('Added contract listener for channel', channelId, 'and contract', chaincodeId);
}

/**
 * Record event subscription in the driver database.
 * Start an appropriate listener if there is currently none for the channel this event subscription refers to.
 **/
const registerListenerForEventSubscription = async (
    eventSubscription: events_pb.EventSubscription,
    networkName: string,
): Promise<void> => {
    // Lookup the event suscription from the database.
    const eventMatcher = eventSubscription.getEventMatcher();
    if (!eventMatcher) {
        throw new Error('No event matcher in event subscription');
    }

    const channelId = eventMatcher.getTransactionLedgerId();
    const gateway = await getNetworkGateway(networkName);
    const network = await gateway.getNetwork(channelId);
    // Check if the event_class_id is specified in the event matcher field.
    if (eventMatcher.getEventClassId().length === 0) {
        // Check if there is an active block listener for the channel specified in this event subscription.
        if (!channelBlockListenerMap.has(channelId)) {
            // Start a block listener.
            await initBlockEventListenerForChannel(network, networkName, channelId);
        }
    } else {
        // Check if there is an active contract listener for the contract function specified in this event subscription.
        const contractId = eventMatcher.getTransactionContractId();
        const contract = network.getContract(contractId);
        if (!channelContractListenerMap.has(getChannelContractKey(channelId, contractId))) {
            // Start a contract listener.
            initContractEventListener(contract, networkName, channelId, contractId);
        }
    }
}

/**
 * Load event subscriptions from the driver database.
 * Start a listener for each channel from which one of the subscribed events originate.
 **/
const loadEventSubscriptionsFromStorage = (
): void => {
    // TODO
}

export { registerListenerForEventSubscription, loadEventSubscriptionsFromStorage };
