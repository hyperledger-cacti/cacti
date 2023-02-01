/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import { Server, ServerCredentials, credentials } from '@grpc/grpc-js';
import ack_pb from '@hyperledger-labs/weaver-protos-js/common/ack_pb';
import query_pb from '@hyperledger-labs/weaver-protos-js/common/query_pb';
import fabricViewPb from '@hyperledger-labs/weaver-protos-js/fabric/view_data_pb';
import eventsPb from '@hyperledger-labs/weaver-protos-js/common/events_pb';
import driver_pb_grpc from '@hyperledger-labs/weaver-protos-js/driver/driver_grpc_pb';
import datatransfer_grpc_pb from '@hyperledger-labs/weaver-protos-js/relay/datatransfer_grpc_pb';
import events_grpc_pb from '@hyperledger-labs/weaver-protos-js/relay/events_grpc_pb';
import state_pb from '@hyperledger-labs/weaver-protos-js/common/state_pb';
import { invoke, packageFabricView } from './fabric-code';
import 'dotenv/config';
import { loadEventSubscriptionsFromStorage } from './listener'
import { walletSetup } from './walletSetup';
import { subscribeEventHelper, unsubscribeEventHelper, signEventSubscriptionQuery, writeExternalStateHelper } from "./events"
import * as path from 'path';
import { handlePromise, relayCallback, getRelayClientForQueryResponse, getRelayClientForEventSubscription } from './utils';
import { dbConnectionTest, eventSubscriptionTest } from "./tests"
import driverPb from '@hyperledger-labs/weaver-protos-js/driver/driver_pb';

const server = new Server();
console.log('driver def', JSON.stringify(driver_pb_grpc));

const mockedB64Data =
    'CkIIyAEaPRI7bG9jYWxob3N0OjkwODAvbmV0d29yazEvbXljaGFubmVsOnNpbXBsZXN0YXRlOlJlYWQ6QXJjdHVydXMa/AIKIFhDpf9CYfrxPkEtSWR8Kf+K5pBkSbx7VNYsAzijB+pnEtcCCoICEmYKCl9saWZlY3ljbGUSWAooCiJuYW1lc3BhY2VzL2ZpZWxkcy9pbnRlcm9wL1NlcXVlbmNlEgIIAwosCiZuYW1lc3BhY2VzL2ZpZWxkcy9zaW1wbGVzdGF0ZS9TZXF1ZW5jZRICCAYSYwoHaW50ZXJvcBJYCh4KGABhY2Nlc3NDb250cm9sAG5ldHdvcmsxABICCAsKHgoYAHNlY3VyaXR5R3JvdXAAbmV0d29yazEAEgIIDQoWChAA9I+/v2luaXRpYWxpemVkEgIIBBIzCgtzaW1wbGVzdGF0ZRIkChYKEAD0j7+/aW5pdGlhbGl6ZWQSAggHCgoKCEFyY3R1cnVzGkIIyAEaPRI7bG9jYWxob3N0OjkwODAvbmV0d29yazEvbXljaGFubmVsOnNpbXBsZXN0YXRlOlJlYWQ6QXJjdHVydXMiDBIHaW50ZXJvcBoBMSK1CArpBwoHT3JnMU1TUBLdBy0tLS0tQkVHSU4gQ0VSVElGSUNBVEUtLS0tLQpNSUlDckRDQ0FsT2dBd0lCQWdJVVdNUkUyTEJwdnY1TkdSRi9hMy82cWZTcE9TNHdDZ1lJS29aSXpqMEVBd0l3CmNqRUxNQWtHQTFVRUJoTUNWVk14RnpBVkJnTlZCQWdURGs1dmNuUm9JRU5oY205c2FXNWhNUTh3RFFZRFZRUUgKRXdaRWRYSm9ZVzB4R2pBWUJnTlZCQW9URVc5eVp6RXVibVYwZDI5eWF6RXVZMjl0TVIwd0d3WURWUVFERXhSagpZUzV2Y21jeExtNWxkSGR2Y21zeExtTnZiVEFlRncweU1EQTNNamt3TkRNMk1EQmFGdzB5TVRBM01qa3dORFF4Ck1EQmFNRnN4Q3pBSkJnTlZCQVlUQWxWVE1SY3dGUVlEVlFRSUV3NU9iM0owYUNCRFlYSnZiR2x1WVRFVU1CSUcKQTFVRUNoTUxTSGx3WlhKc1pXUm5aWEl4RFRBTEJnTlZCQXNUQkhCbFpYSXhEakFNQmdOVkJBTVRCWEJsWlhJdwpNRmt3RXdZSEtvWkl6ajBDQVFZSUtvWkl6ajBEQVFjRFFnQUU1RlFrSDgzRVdnYW9DZ2U5azhISU1Jd0NUVGVZCnFCR25xNFAzWHJCUGZQSFdXeE1oWGhBaDNvUHNUOXdna1dHcFVmYWlybkd0bmRBQ3ZrSitNQi9nMUtPQjNUQ0IKMmpBT0JnTlZIUThCQWY4RUJBTUNCNEF3REFZRFZSMFRBUUgvQkFJd0FEQWRCZ05WSFE0RUZnUVVLMkFuM3RCTAprMVQyRGord0hHZ1RIQ3NiYmlZd0h3WURWUjBqQkJnd0ZvQVUxZyt0UG5naDJ3OGc5OXoxbXdzVmJrS2pBS2t3CklnWURWUjBSQkJzd0dZSVhjR1ZsY2pBdWIzSm5NUzV1WlhSM2IzSnJNUzVqYjIwd1ZnWUlLZ01FQlFZSENBRUUKU25zaVlYUjBjbk1pT25zaWFHWXVRV1ptYVd4cFlYUnBiMjRpT2lJaUxDSm9aaTVGYm5KdmJHeHRaVzUwU1VRaQpPaUp3WldWeU1DSXNJbWhtTGxSNWNHVWlPaUp3WldWeUluMTlNQW9HQ0NxR1NNNDlCQU1DQTBjQU1FUUNJQmFRCjhoTmRXd2xYeUhxY2htQzdzVUpWaER6Mkg2enh3M1BQS1I5M3lCL3NBaUJKMnpnQlhzL1lsMGZubnJNUXVCQUQKcDFBS1RKTkpsMVYwWUVHMFhiNXFwZz09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0KEkcwRQIhAMyyvrcjHVc1oQmCNqZpH6nc0O+8wssXjwRcfmgxlhQAAiAqa0C8pSFNZNXiSVJHe948dJ0NU/y+7i5A55O0Frkz2Q==';

// Mocked fabric communication function
function mockCommunication(query: query_pb.Query) {
    console.log('Mock Communication');
    // Query object from requestor
    console.log('query', query.getRequestId());
    setTimeout(() => {
        console.log('Sending state');
        const meta = new state_pb.Meta();
        meta.setTimestamp(new Date().toISOString());
        meta.setProofType('Notarization');
        meta.setSerializationFormat('STRING');
        meta.setProtocol(state_pb.Meta.Protocol.FABRIC);
        const view = new state_pb.View();
        view.setMeta(meta);
        //@ts-ignore
        const viewDataBinary = fabricViewPb.FabricView.deserializeBinary(mockedB64Data).serializeBinary();
        console.log('viewData', viewDataBinary);
        view.setData(viewDataBinary);
        const viewPayload = new state_pb.ViewPayload();
        viewPayload.setView(view);
        viewPayload.setRequestId(query.getRequestId());
        if (!process.env.RELAY_ENDPOINT) {
            throw new Error('RELAY_ENDPOINT is not set.');
        }
        const client = new datatransfer_grpc_pb.DataTransferClient(
            process.env.RELAY_ENDPOINT,
            credentials.createInsecure(),
        );
        client.sendDriverState(viewPayload, relayCallback);
    }, 3000);
}

// Handles communication with fabric network and sends resulting data to the relay
const fabricCommunication = async (query: query_pb.Query, networkName: string) => {
    // Query object from requestor
    console.log('query', query.getRequestId());

    // Client created using the relay_endpoint in the env.
    // TODO: need credentials here to ensure the local relay is only communicating with local drivers
    if (!process.env.RELAY_ENDPOINT) {
        throw new Error('RELAY_ENDPOINT is not set.');
    }
    // Invokes the fabric network
    const [result, invokeError] = await handlePromise(
        invoke(
            query,
            networkName,
            'HandleExternalRequest'
        ),
    );
    const client = getRelayClientForQueryResponse();
    if (invokeError) {
        console.log('Invoke Error');
        const errorViewPayload = new state_pb.ViewPayload();
        errorViewPayload.setError(`Error: ${invokeError.toString()}`);
        errorViewPayload.setRequestId(query.getRequestId());
        // Send the error state to the relay
        client.sendDriverState(errorViewPayload, relayCallback);
    } else {
        // Process response from invoke to send to relay
        console.log('Result of fabric invoke', result);
        console.log('Sending state');
        const viewPayload: state_pb.ViewPayload = packageFabricView(query, result);

        console.log('Sending state');
        // Sending the fabric state to the relay.
        client.sendDriverState(viewPayload, relayCallback);
    }
};

const spawnSubscribeEventHelper = async (request: eventsPb.EventSubscription, newRequestId: string) => {
    const subscriptionOp: eventsPb.EventSubOperation = request.getOperation();
    const client = getRelayClientForEventSubscription()
    if (subscriptionOp == eventsPb.EventSubOperation.SUBSCRIBE) {
        subscribeEventHelper(request, client, process.env.NETWORK_NAME ? process.env.NETWORK_NAME : 'network1');
    } else if (subscriptionOp == eventsPb.EventSubOperation.UNSUBSCRIBE) {
        unsubscribeEventHelper(request, client, process.env.NETWORK_NAME ? process.env.NETWORK_NAME : 'network1');
    } else {
        const errorString: string = `Error: subscribe operation ${subscriptionOp.toString()} not supported`;
        console.error(errorString);
        const ack_send_error = new ack_pb.Ack();
        ack_send_error.setRequestId(newRequestId);
        ack_send_error.setMessage(errorString);
        ack_send_error.setStatus(ack_pb.Ack.STATUS.ERROR);
        // gRPC response.
        console.log(`Sending to the relay the eventSubscription error Ack: ${JSON.stringify(ack_send_error.toObject())}`);
        // Sending the fabric state to the relay.
        client.sendDriverSubscriptionStatus(ack_send_error, relayCallback);
    }
}

// Service for receiving communication from a relay. Will communicate with the network and respond with an ack to the relay while the fabric communication is being completed.
//@ts-ignore
server.addService(driver_pb_grpc.DriverCommunicationService, {
    requestDriverState: (call: { request: query_pb.Query }, callback: (_: any, object: ack_pb.Ack) => void) => {
        const ack_response = new ack_pb.Ack();
        try {
            if (process.env.MOCK === 'true') {
                mockCommunication(call.request);
            } else {
                fabricCommunication(call.request, process.env.NETWORK_NAME ? process.env.NETWORK_NAME : 'network1');
            }
            ack_response.setMessage('');
            ack_response.setStatus(ack_pb.Ack.STATUS.OK);
            ack_response.setRequestId(call.request.getRequestId());
            // gRPC response.
            console.log('Responding to caller');
            callback(null, ack_response);
        } catch (e) {
            console.log(e);
            ack_response.setMessage(`Error: ${e}`);
            ack_response.setStatus(ack_pb.Ack.STATUS.ERROR);
            ack_response.setRequestId(call.request.getRequestId());
            // gRPC response.
            console.log('Responding to caller');
            callback(null, ack_response);
        }
    },
    subscribeEvent: (call: { request: eventsPb.EventSubscription }, callback: (_: any, object: ack_pb.Ack) => void) => {
        const newRequestId: string = call.request.getQuery()!.getRequestId()
        console.log(`newRequestId: ${newRequestId}`);
        try {
            if (process.env.MOCK !== 'true') {
                spawnSubscribeEventHelper(call.request, newRequestId)
                const ack_response = new ack_pb.Ack();
                ack_response.setRequestId(newRequestId);
                ack_response.setMessage('Procesing addEventSubscription');
                ack_response.setStatus(ack_pb.Ack.STATUS.OK);
                // gRPC response.
                console.log(`Responding to caller with Ack: ${JSON.stringify(ack_response.toObject())}`);
                callback(null, ack_response);
            } else {
                dbConnectionTest().then((dbConnectTestStatus) => {
                    if (dbConnectTestStatus == true) {
                        eventSubscriptionTest(call.request).then((eventSubscribeTestStatus) => {
                            if (eventSubscribeTestStatus == false) {
                                console.error(`Failed eventSubscriptionTest()`);
                            }
                            // add code to support more functionalities here
                        });
                    } else {
                        console.error(`Failed dbConnectionTest()`);
                    }
                });
            }
        } catch (e) {
            const errorString: string = e.toString();
            console.log(`error: ${errorString}`);
            const ack_error_response = new ack_pb.Ack();
            ack_error_response.setRequestId(newRequestId);
            ack_error_response.setMessage(`Error: ${errorString}`);
            ack_error_response.setStatus(ack_pb.Ack.STATUS.ERROR);
            // gRPC response.
            console.error(`Responding to caller with Ack: ${JSON.stringify(ack_error_response.toObject())}`);
            callback(null, ack_error_response);
        }
    },
    requestSignedEventSubscriptionQuery: (call: { request: eventsPb.EventSubscription }, callback: (_: any, object: query_pb.Query) => void) => {
        const ack_response = new ack_pb.Ack();

        signEventSubscriptionQuery(call.request.getQuery()!).then((signedQuery) => {
            // gRPC response.
            console.log(`Responding to caller with signedQuery: ${JSON.stringify(signedQuery.toObject())}`);
            callback(null, signedQuery);   
        }).catch((error) => {
            const errorString: string = error.toString();
            console.log(`error: ${errorString}`);
            var emptyQuery: query_pb.Query = new query_pb.Query();
            emptyQuery.setRequestorSignature(errorString);
            // gRPC response.
            console.error(`Responding to caller with emptyQuery: ${JSON.stringify(emptyQuery.toObject())}`);
            callback(null, emptyQuery);
        });
    },
    writeExternalState: (call: { request: driverPb.WriteExternalStateMessage }, callback: (_: any, object: ack_pb.Ack) => void) => {
        const viewPayload: state_pb.ViewPayload = call.request.getViewPayload();
        const requestId: string = viewPayload.getRequestId();

        writeExternalStateHelper(call.request, process.env.NETWORK_NAME ? process.env.NETWORK_NAME : 'network1').then(() => {
            const ack_response = new ack_pb.Ack();
            ack_response.setRequestId(requestId);
            ack_response.setMessage('Successfully written to the ledger');
            ack_response.setStatus(ack_pb.Ack.STATUS.OK);
            // gRPC response.
            console.log(`Responding to caller with Ack: ${JSON.stringify(ack_response.toObject())}`);
            callback(null, ack_response);
        }).catch((error) => {
            const ack_err_response = new ack_pb.Ack();
            ack_err_response.setRequestId(requestId);
            ack_err_response.setMessage(error.toString());
            ack_err_response.setStatus(ack_pb.Ack.STATUS.ERROR);
            // gRPC response.
            console.log(`Responding to caller with error Ack: ${JSON.stringify(ack_err_response.toObject())}`);
            callback(null, ack_err_response);
        });
    },
});

// Prepares required crypto material for communication with the fabric network
const configSetup = async () => {
    // uses the network name to create a unique wallet path
    const walletPath = process.env.WALLET_PATH ? process.env.WALLET_PATH : path.join(process.cwd(), `wallet-${process.env.NETWORK_NAME ? process.env.NETWORK_NAME : 'network1'}`);
    if (process.env.CONNECTION_PROFILE) {
        await walletSetup(
            walletPath,
            process.env.CONNECTION_PROFILE,
            process.env.NETWORK_NAME ? process.env.NETWORK_NAME : 'network1',
        );
    } else {
        console.error('No CONNECTION_PROFILE provided in the .env');
    }
    // Register all listeners again
    const status = await loadEventSubscriptionsFromStorage(process.env.NETWORK_NAME ? process.env.NETWORK_NAME : 'network1');
    console.debug('Load Event Subscriptions Status: ', status);
};

// SERVER: Start the server with the provided url.
// TODO: We should have credentials locally to ensure that the driver can only communicate with the local relay.
if (process.env.DRIVER_TLS === 'true') {
    if (!(process.env.DRIVER_TLS_CERT_PATH && fs.existsSync(process.env.DRIVER_TLS_CERT_PATH) &&
         (process.env.DRIVER_TLS_KEY_PATH && fs.existsSync(process.env.DRIVER_TLS_KEY_PATH)))) {
        throw new Error("Missing or invalid Driver TLS credentials");
    }
    const keyCertPair = {
        cert_chain: fs.readFileSync(process.env.DRIVER_TLS_CERT_PATH),
        private_key: fs.readFileSync(process.env.DRIVER_TLS_KEY_PATH)
    };
    server.bindAsync(`${process.env.DRIVER_ENDPOINT}`, ServerCredentials.createSsl(null, [ keyCertPair ], false), (cb) => {
        configSetup().then(() => {
            console.log('Starting server with TLS');
            server.start();
        });
    });
} else {
    server.bindAsync(`${process.env.DRIVER_ENDPOINT}`, ServerCredentials.createInsecure(), (cb) => {
        configSetup().then(() => {
            console.log('Starting server without TLS');
            server.start();
        });
    });
}
