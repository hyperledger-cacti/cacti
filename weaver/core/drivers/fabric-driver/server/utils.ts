/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import { credentials } from '@grpc/grpc-js';
import datatransfer_grpc_pb from '@hyperledger-labs/weaver-protos-js/relay/datatransfer_grpc_pb';
import events_grpc_pb from '@hyperledger-labs/weaver-protos-js/relay/events_grpc_pb';

function checkIfArraysAreEqual(x: Array<any>, y: Array<any>): boolean {
    if (x == y) {
        return true;
    } else if (x == null || y == null || (x.length != y.length)) {
        return false;
    } else {
        // check if all elements of x are present in y 
        for (const element of x) {
            const index = y.indexOf(element);
            if (index == -1) {
                return false;
            } else {
                y.splice(index, 1);
            }
        }
        
        // return false if y has additional elements not in x
        if (y.length != 0) {
            return false;
        }
    }

    return true;
}

// handle callback
function relayCallback(err: any, response: any) {
    if (response) {
        console.log(`Relay Callback Response: ${JSON.stringify(response.toObject())}`);
    } else if (err) {
        console.error(`Relay Callback Error: ${err}`);
    }
}

// A better way to handle errors for promises
function handlePromise<T>(promise: Promise<T>): Promise<[T?, Error?]> {
    const result: Promise<[T?, Error?]> = promise
      .then(data => {
        const response: [T?, Error?] = [data, undefined]
        return response
      })
      .catch(error => Promise.resolve([undefined, error]))
    return result
}

function getRelayClientForQueryResponse() {
    let client: datatransfer_grpc_pb.DataTransferClient;
    if (process.env.RELAY_TLS === 'true') {
        if (!process.env.RELAY_TLSCA_CERT_PATH || process.env.RELAY_TLSCA_CERT_PATH == "") {
            client = new datatransfer_grpc_pb.DataTransferClient(
                process.env.RELAY_ENDPOINT,
                credentials.createSsl()
            );
        } else {
            if (!(process.env.RELAY_TLSCA_CERT_PATH && fs.existsSync(process.env.RELAY_TLSCA_CERT_PATH))) {
                throw new Error("Missing or invalid RELAY_TLSCA_CERT_PATH: " + process.env.RELAY_TLSCA_CERT_PATH);
            }
            const rootCert = fs.readFileSync(process.env.RELAY_TLSCA_CERT_PATH);
            client = new datatransfer_grpc_pb.DataTransferClient(
                process.env.RELAY_ENDPOINT,
                credentials.createSsl(rootCert)
            );
        }
    } else {
        client = new datatransfer_grpc_pb.DataTransferClient(
            process.env.RELAY_ENDPOINT,
            credentials.createInsecure()
        );
    }
    return client;
}


// If the events_grpc_pb.EventSubscribeClient() failes, then it throws an error which will be caught by the caller
function getRelayClientForEventSubscription() {
    let client: events_grpc_pb.EventSubscribeClient;

    if (process.env.RELAY_TLS === 'true') {
        if (!process.env.RELAY_TLSCA_CERT_PATH || process.env.RELAY_TLSCA_CERT_PATH == "") {
            client = new events_grpc_pb.EventSubscribeClient(
                process.env.RELAY_ENDPOINT,
                credentials.createSsl()
            );
        } else {
            if (!(process.env.RELAY_TLSCA_CERT_PATH && fs.existsSync(process.env.RELAY_TLSCA_CERT_PATH))) {
                throw new Error("Missing or invalid RELAY_TLSCA_CERT_PATH: " + process.env.RELAY_TLSCA_CERT_PATH);
            }
            const rootCert = fs.readFileSync(process.env.RELAY_TLSCA_CERT_PATH);
            client = new events_grpc_pb.EventSubscribeClient(
                process.env.RELAY_ENDPOINT,
                credentials.createSsl(rootCert)
            );
        }
    } else {
        client = new events_grpc_pb.EventSubscribeClient(
            process.env.RELAY_ENDPOINT,
            credentials.createInsecure()
        );
    }

    return client;
}

function getRelayClientForEventPublish() {
    let client: events_grpc_pb.EventPublishClient;
    if (process.env.RELAY_TLS === 'true') {
        if (!process.env.RELAY_TLSCA_CERT_PATH || process.env.RELAY_TLSCA_CERT_PATH == "") {
            client = new events_grpc_pb.EventPublishClient(
                process.env.RELAY_ENDPOINT,
                credentials.createSsl()
            );
        } else {
            if (!(process.env.RELAY_TLSCA_CERT_PATH && fs.existsSync(process.env.RELAY_TLSCA_CERT_PATH))) {
                throw new Error("Missing or invalid RELAY_TLSCA_CERT_PATH: " + process.env.RELAY_TLSCA_CERT_PATH);
            }
            const rootCert = fs.readFileSync(process.env.RELAY_TLSCA_CERT_PATH);
            client = new events_grpc_pb.EventPublishClient(
                process.env.RELAY_ENDPOINT,
                credentials.createSsl(rootCert)
            );
        }
    } else {
        client = new events_grpc_pb.EventPublishClient(
            process.env.RELAY_ENDPOINT,
            credentials.createInsecure()
        );
    }
    return client;
}

export {
    checkIfArraysAreEqual,
    handlePromise,
    relayCallback,
    getRelayClientForQueryResponse,
    getRelayClientForEventSubscription,
    getRelayClientForEventPublish
}
