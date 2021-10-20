/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import { Server, ServerCredentials, credentials } from '@grpc/grpc-js';
import ack_pb from '@hyperledger-labs/weaver-protos-js/common/ack_pb';
import fabricView from '@hyperledger-labs/weaver-protos-js/fabric/view_data_pb';
import query_pb from '@hyperledger-labs/weaver-protos-js/common/query_pb';
import driver_pb_grpc from '@hyperledger-labs/weaver-protos-js/driver/driver_grpc_pb';
import datatransfer_grpc_pb from '@hyperledger-labs/weaver-protos-js/relay/datatransfer_grpc_pb';
import state_pb from '@hyperledger-labs/weaver-protos-js/common/state_pb';
import invoke from './fabric-code';
import 'dotenv/config';
import { walletSetup } from './walletSetup';
import { Certificate } from '@fidm/x509';
import * as path from 'path';
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
        const viewDataBinary = fabricView.FabricView.deserializeBinary(mockedB64Data).serializeBinary();
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
        client.sendDriverState(viewPayload, function (err: any, response: any) {
            console.log('Response:', response);
        });
    }, 3000);
}

// A better way to handle errors for promises
function handlePromise<T>(promise: Promise<T>): Promise<[T?, Error?]> {
    const result: Promise<[T?, Error?]> = promise
        .then((data) => {
            const response: [T?, Error?] = [data, undefined];
            return response;
        })
        .catch((error) => Promise.resolve([undefined, error]));
    return result;
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
    let client;
    if (process.env.RELAY_TLS === 'true') {
        if (!(process.env.RELAY_TLSCA_CERT_PATH && fs.existsSync(process.env.RELAY_TLSCA_CERT_PATH))) {
            throw new Error("Missing or invalid RELAY_TLSCA_CERT_PATH: " + process.env.RELAY_TLSCA_CERT_PATH);
        }
        const rootCert = fs.readFileSync(process.env.RELAY_TLSCA_CERT_PATH);
        client = new datatransfer_grpc_pb.DataTransferClient(
            process.env.RELAY_ENDPOINT,
            credentials.createSsl(rootCert)
        );
    } else {
        client = new datatransfer_grpc_pb.DataTransferClient(
            process.env.RELAY_ENDPOINT,
            credentials.createInsecure()
        );
    }
    const cert = Certificate.fromPEM(Buffer.from(query.getCertificate()));
    const orgName = cert.issuer.organizationName;
    // Invokes the fabric network
    const [result, invokeError] = await handlePromise(
        invoke(
            query,
            networkName,
            query.getRequestingNetwork(),
            query.getRequestingOrg() ? query.getRequestingOrg() : orgName,
        ),
    );
    if (invokeError) {
        console.log('Invoke Error');
        const errorViewPayload = new state_pb.ViewPayload();
        errorViewPayload.setError(`Error: ${JSON.stringify(invokeError)}`);
        errorViewPayload.setRequestId(query.getRequestId());
        // Send the error state to the relay
        client.sendDriverState(errorViewPayload, function (err: any, response: any) {
            console.log('Response:', response, 'Error: ', err);
        });
    } else {
        // Process response from invoke to send to relay
        console.log('Result of fabric invoke', result);
        console.log('Sending state');
        const meta = new state_pb.Meta();
        meta.setTimestamp(new Date().toISOString());
        meta.setProofType('Notarization');
        meta.setSerializationFormat('STRING');
        meta.setProtocol(state_pb.Meta.Protocol.FABRIC);
        const view = new state_pb.View();
        view.setMeta(meta);
        view.setData(result ? result.serializeBinary() : Buffer.from(''));
        const viewPayload = new state_pb.ViewPayload();
        viewPayload.setView(view);
        viewPayload.setRequestId(query.getRequestId());

        console.log('Sending state');
        // Sending the fabric state to the relay.
        client.sendDriverState(viewPayload, function (err: any, response: any) {
            console.log('Response:', response, 'Error: ', err);
        });
    }
};

// Service for recieving communication from a relay. Will communicate with the network and respond with an ack to the relay while the fabric communication is being completed
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
});

// Prepares required crypto material for communication with the fabric network
const configSetup = async () => {
    // uses the network name to create a unique wallet path
    const walletPath = path.join(process.cwd(), `wallet-${process.env.NETWORK_NAME}`);
    if (process.env.CONNECTION_PROFILE) {
        walletSetup(
            walletPath,
            process.env.CONNECTION_PROFILE,
            process.env.NETWORK_NAME ? process.env.NETWORK_NAME : 'network1',
        );
    } else {
        console.error('No CONNECTION_PROFILE provided in the .env');
    }
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
