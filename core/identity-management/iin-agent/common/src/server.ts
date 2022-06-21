/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import { Server, ServerCredentials, credentials } from '@grpc/grpc-js';
import ack_pb from '@hyperledger-labs/weaver-protos-js/common/ack_pb';
import iin_agent_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_pb';
import iin_agent_pb_grpc from '@hyperledger-labs/weaver-protos-js/identity/agent_grpc_pb';
import 'dotenv/config';
import { Certificate } from '@fidm/x509';
import * as path from 'path';

const iinAgentServer = new Server();
console.log('iin agent def', JSON.stringify(iin_agent_pb_grpc));


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

// Handles communication with foreign IIN agents
const syncExternalStateFromIINAgent = async (networkUnit: iin_agent_pb.NetworkUnitIdentity) => {
    console.log('syncExternalStateFromIINAgent:', networkUnit.getNetworkId(), '-', networkUnit.getParticipantId());
};

// Runs flows through local IIN agents
const flowAndRecordAttestationsOnLedger = async (networkUnit: iin_agent_pb.NetworkUnitIdentity) => {
    console.log('flowAndRecordAttestationsOnLedger:', networkUnit.getNetworkId(), '-', networkUnit.getParticipantId());
};

// Generates attestations on a foreign network unit's state
const requestAttestation = async (networkUnit: iin_agent_pb.NetworkUnitIdentity) => {
    console.log('requestAttestation:', networkUnit.getNetworkId(), '-', networkUnit.getParticipantId());
};

// Processes attestations on a foreign network unit's state received from a local IIN agent
const sendAttestation = async (networkUnit: iin_agent_pb.NetworkUnitIdentity) => {
    console.log('sendAttestation:', networkUnit.getNetworkId(), '-', networkUnit.getParticipantId());
};

//@ts-ignore
iinAgentServer.addService(iin_agent_pb_grpc.IINAgentService, {
    // Service for syncing foreign network unit's state from its IIN agent. Will communicate with the user/agent triggering this process and respond with an ack to the caller while the sync is occurring.
    syncExternalState: (call: { request: iin_agent_pb.NetworkUnitIdentity }, callback: (_: any, object: ack_pb.Ack) => void) => {
        const ack_response = new ack_pb.Ack();
        try {
            syncExternalStateFromIINAgent(call.request);
            ack_response.setMessage('');
            ack_response.setStatus(ack_pb.Ack.STATUS.OK);
            ack_response.setRequestId('');
            // gRPC response.
            console.log('Responding to caller');
            callback(null, ack_response);
        } catch (e) {
            console.log(e);
            ack_response.setMessage(`Error: ${e}`);
            ack_response.setStatus(ack_pb.Ack.STATUS.ERROR);
            ack_response.setRequestId('');
            // gRPC response.
            console.log('Responding to caller');
            callback(null, ack_response);
        }
    },
    // Service for starting a flow among local IIN agents to collect attestations on a foreign network unit's state. Will communicate with the user/agent triggering this process and respond with an ack to the caller while the flow is occurring.
    flowAndRecordAttestations: (call: { request: iin_agent_pb.NetworkUnitIdentity }, callback: (_: any, object: ack_pb.Ack) => void) => {
        const ack_response = new ack_pb.Ack();
        try {
            flowAndRecordAttestationsOnLedger(call.request);
            ack_response.setMessage('');
            ack_response.setStatus(ack_pb.Ack.STATUS.OK);
            ack_response.setRequestId('');
            // gRPC response.
            console.log('Responding to caller');
            callback(null, ack_response);
        } catch (e) {
            console.log(e);
            ack_response.setMessage(`Error: ${e}`);
            ack_response.setStatus(ack_pb.Ack.STATUS.ERROR);
            ack_response.setRequestId('');
            // gRPC response.
            console.log('Responding to caller');
            callback(null, ack_response);
        }
    },
    // Service for receiving requests for attestations on foreign network unit states from local IIN agents. Will communicate with the IIN agent caller and respond with an ack while the attestation is being generated.
    requestAttestation: (call: { request: iin_agent_pb.NetworkUnitIdentity }, callback: (_: any, object: ack_pb.Ack) => void) => {
        const ack_response = new ack_pb.Ack();
        try {
            requestAttestation(call.request);
            ack_response.setMessage('');
            ack_response.setStatus(ack_pb.Ack.STATUS.OK);
            ack_response.setRequestId('');
            // gRPC response.
            console.log('Responding to caller');
            callback(null, ack_response);
        } catch (e) {
            console.log(e);
            ack_response.setMessage(`Error: ${e}`);
            ack_response.setStatus(ack_pb.Ack.STATUS.ERROR);
            ack_response.setRequestId('');
            // gRPC response.
            console.log('Responding to caller');
            callback(null, ack_response);
        }
    },
    // Service for receiving attestations on foreign network unit states from local IIN agents. Will communicate with the IIN agent caller and respond with an ack while the attestation is being processed.
    sendAttestation: (call: { request: iin_agent_pb.NetworkUnitIdentity }, callback: (_: any, object: ack_pb.Ack) => void) => {
        const ack_response = new ack_pb.Ack();
        try {
            sendAttestation(call.request);
            ack_response.setMessage('');
            ack_response.setStatus(ack_pb.Ack.STATUS.OK);
            ack_response.setRequestId('');
            // gRPC response.
            console.log('Responding to caller');
            callback(null, ack_response);
        } catch (e) {
            console.log(e);
            ack_response.setMessage(`Error: ${e}`);
            ack_response.setStatus(ack_pb.Ack.STATUS.ERROR);
            ack_response.setRequestId('');
            // gRPC response.
            console.log('Responding to caller');
            callback(null, ack_response);
        }
    },
});

// Bootstrapping
const configSetup = async () => {
    // TODO
};

// SERVER: Start the IIN agent server with the provided url.
if (process.env.IIN_AGENT_TLS === 'true') {
    if (!(process.env.IIN_AGENT_TLS_CERT_PATH && fs.existsSync(process.env.IIN_AGENT_TLS_CERT_PATH) &&
         (process.env.IIN_AGENT_TLS_KEY_PATH && fs.existsSync(process.env.IIN_AGENT_TLS_KEY_PATH)))) {
        throw new Error("Missing or invalid IIN agent TLS credentials");
    }
    const keyCertPair = {
        cert_chain: fs.readFileSync(process.env.IIN_AGENT_TLS_CERT_PATH),
        private_key: fs.readFileSync(process.env.IIN_AGENT_TLS_KEY_PATH)
    };
    iinAgentServer.bindAsync(`${process.env.IIN_AGENT_ENDPOINT}`, ServerCredentials.createSsl(null, [ keyCertPair ], false), (cb) => {
        configSetup().then(() => {
            console.log('Starting IIN agent server with TLS');
            iinAgentServer.start();
        });
    });
} else {
    iinAgentServer.bindAsync(`${process.env.IIN_AGENT_ENDPOINT}`, ServerCredentials.createInsecure(), (cb) => {
        configSetup().then(() => {
            console.log('Starting IIN agent server without TLS');
            iinAgentServer.start();
        });
    });
}
