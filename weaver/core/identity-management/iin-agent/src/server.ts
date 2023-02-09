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
import { syncExternalStateFromIINAgent, requestIdentityConfiguration, sendIdentityConfiguration } from './protocols/externalOperations';
import { requestAttestation, sendAttestation } from './protocols/localOperations';
import { getLedgerBase, delay, getAllRemoteSecurityDomainDNS } from './common/utils'


const iinAgentServer = new Server();
console.log('iin agent def', JSON.stringify(iin_agent_pb_grpc));

//@ts-ignore
iinAgentServer.addService(iin_agent_pb_grpc.IINAgentService, {
    // Service for syncing foreign security domain unit's state from its IIN agent. Will communicate with the user/agent triggering this process and respond with an ack to the caller while the sync is occurring.
    syncExternalState: (call: { request: iin_agent_pb.SecurityDomainMemberIdentity }, callback: (_: any, object: ack_pb.Ack) => void) => {
        const ack_response = new ack_pb.Ack();
        try {
            const securityDomain = process.env.SECURITY_DOMAIN ? process.env.SECURITY_DOMAIN : 'network1';
            const memberId = process.env.MEMBER_ID ? process.env.MEMBER_ID : 'Org1MSP';
            const nonce = syncExternalStateFromIINAgent(call.request, securityDomain, memberId);
            ack_response.setMessage('');
            ack_response.setStatus(ack_pb.Ack.STATUS.OK);
            ack_response.setRequestId(nonce);
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
    // Service for receiving requests for one's security domain unit's state from foreign IIN agents. Will communicate with the IIN agent caller and respond with an ack while the attestation is being generated.
    requestIdentityConfiguration: (call: { request: iin_agent_pb.SecurityDomainMemberIdentityRequest }, callback: (_: any, object: ack_pb.Ack) => void) => {
        const ack_response = new ack_pb.Ack();
        try {
            if (!call.request.hasSourceNetwork()) {
                throw new Error('request does not have source network');
            }
            if (!call.request.hasRequestingNetwork()) {
                throw new Error('request does not have requesting network');
            }
            if (call.request.getNonce().length == 0) {
                throw new Error('request has empty nonce');
            }
            requestIdentityConfiguration(call.request).then().catch((error) => {
                console.error("Error:", error);
            });
            ack_response.setMessage('');
            ack_response.setStatus(ack_pb.Ack.STATUS.OK);
            ack_response.setRequestId(call.request.getNonce());
            // gRPC response.
            console.log('Responding to caller');
            callback(null, ack_response);
        } catch (e) {
            console.log(e);
            ack_response.setMessage(`Error: ${e}`);
            ack_response.setStatus(ack_pb.Ack.STATUS.ERROR);
            ack_response.setRequestId(call.request.getNonce());
            // gRPC response.
            console.log('Responding to caller');
            callback(null, ack_response);
        }
    },
    // Service for receiving security domain unit states from foreign IIN agents. Will communicate with the IIN agent caller and respond with an ack while the attestation is being processed.
    sendIdentityConfiguration: (call: { request: iin_agent_pb.AttestedMembership }, callback: (_: any, object: ack_pb.Ack) => void) => {
        const ack_response = new ack_pb.Ack();
        let nonce = '';
        try {
            const securityDomain = process.env.SECURITY_DOMAIN ? process.env.SECURITY_DOMAIN : 'network1';
            const memberId = process.env.MEMBER_ID ? process.env.MEMBER_ID : 'Org1MSP';
            if (!call.request.hasAttestation()) {
                throw new Error('no attestation provided');
            }
            nonce = call.request.getAttestation().getNonce();
            sendIdentityConfiguration(call.request, securityDomain, memberId);
            ack_response.setMessage('');
            ack_response.setStatus(ack_pb.Ack.STATUS.OK);
            ack_response.setRequestId(nonce);
            // gRPC response.
            console.log('Responding to caller');
            callback(null, ack_response);
        } catch (e) {
            console.log(e);
            ack_response.setMessage(`Error: ${e}`);
            ack_response.setStatus(ack_pb.Ack.STATUS.ERROR);
            ack_response.setRequestId(nonce);
            // gRPC response.
            console.log('Responding to caller');
            callback(null, ack_response);
        }
    },
    // Service for receiving requests for attestations on foreign security domain unit states from local IIN agents. Will communicate with the IIN agent caller and respond with an ack while the attestation is being generated.
    requestAttestation: (call: { request: iin_agent_pb.CounterAttestedMembership }, callback: (_: any, object: ack_pb.Ack) => void) => {
        const ack_response = new ack_pb.Ack();
        try {
            const securityDomain = process.env.SECURITY_DOMAIN ? process.env.SECURITY_DOMAIN : 'network1';
            const memberId = process.env.MEMBER_ID ? process.env.MEMBER_ID : 'Org1MSP';
            const attestationValidityTime = process.env.ATTESTATION_VALIDITY_TIME ? parseInt(process.env.ATTESTATION_VALIDITY_TIME) : 3600;
            requestAttestation(call.request, securityDomain, memberId, attestationValidityTime);
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
    // Service for receiving attestations on foreign security domain unit states from local IIN agents. Will communicate with the IIN agent caller and respond with an ack while the attestation is being processed.
    sendAttestation: (call: { request: iin_agent_pb.CounterAttestedMembership }, callback: (_: any, object: ack_pb.Ack) => void) => {
        const ack_response = new ack_pb.Ack();
        let nonce = '';
        try {
            const securityDomain = process.env.SECURITY_DOMAIN ? process.env.SECURITY_DOMAIN : 'network1';
            const memberId = process.env.MEMBER_ID ? process.env.MEMBER_ID : 'Org1MSP';
            if (call.request.getAttestationsList().length === 0) {
                throw new Error('no counter attestation provided');
            }
            nonce = call.request.getAttestationsList()[0].getNonce();
            sendAttestation(call.request, securityDomain, memberId);
            ack_response.setMessage('');
            ack_response.setStatus(ack_pb.Ack.STATUS.OK);
            ack_response.setRequestId(nonce);
            // gRPC response.
            console.log('Responding to caller');
            callback(null, ack_response);
        } catch (e) {
            console.log(e);
            ack_response.setMessage(`Error: ${e}`);
            ack_response.setStatus(ack_pb.Ack.STATUS.ERROR);
            ack_response.setRequestId(nonce);
            // gRPC response.
            console.log('Responding to caller');
            callback(null, ack_response);
        }
    },
});

// Bootstrapping
const configSetup = async () => {
    // Initiate agent's ledger
    const securityDomain = process.env.SECURITY_DOMAIN ? process.env.SECURITY_DOMAIN : 'network1';
    const memberId = process.env.MEMBER_ID ? process.env.MEMBER_ID : 'Org1MSP';
    const ledgerBase = getLedgerBase(securityDomain, memberId);
    await ledgerBase.init();
    console.log("Setup compelete.");

    // TODO
};

const loopSyncExternalState = async () => {
    const delayTime: number = parseInt(process.env.SYNC_PERIOD ? process.env.SYNC_PERIOD : '3600');
    console.log("SYNC PERIOD: ", delayTime);
    const localSecurityDomain = process.env.SECURITY_DOMAIN ? process.env.SECURITY_DOMAIN : 'network1';
    const localMemberId = process.env.MEMBER_ID ? process.env.MEMBER_ID : 'Org1MSP';
    const flagSync = process.env.AUTO_SYNC === 'false' ? false : true;
    if (flagSync) {
      console.log("Starting auto sync...");
    } else {
      console.log("Auto sync off.");
    }
    while (flagSync) {
        const secDomDNS = getAllRemoteSecurityDomainDNS(localSecurityDomain);
        for (const securityDomain in secDomDNS) {
            const foreignSecurityDomain = new iin_agent_pb.SecurityDomainMemberIdentity();
            foreignSecurityDomain.setSecurityDomain(securityDomain);
            syncExternalStateFromIINAgent(foreignSecurityDomain, localSecurityDomain, localMemberId);
        }
        await delay(delayTime * 1000);
    }
}

// SERVER: Start the IIN agent server with the provided url.
if (process.env.IIN_AGENT_TLS === 'true') {
    if (!(process.env.IIN_AGENT_TLS_CERT_PATH && fs.existsSync(process.env.IIN_AGENT_TLS_CERT_PATH) &&
         (process.env.IIN_AGENT_TLS_KEY_PATH && fs.existsSync(process.env.IIN_AGENT_TLS_KEY_PATH)))) {
        throw new Error("Missing or invalid IIN agent TLS credentials on " + process.env.IIN_AGENT_ENDPOINT);
    }
    const keyCertPair = {
        cert_chain: fs.readFileSync(process.env.IIN_AGENT_TLS_CERT_PATH),
        private_key: fs.readFileSync(process.env.IIN_AGENT_TLS_KEY_PATH)
    };
    iinAgentServer.bindAsync(`${process.env.IIN_AGENT_ENDPOINT}`, ServerCredentials.createSsl(null, [ keyCertPair ], false), (cb) => {
        configSetup().then(() => {
            console.log('Starting IIN agent server with TLS on', process.env.IIN_AGENT_ENDPOINT);
            iinAgentServer.start();
            loopSyncExternalState();
        }).catch((error) => {
            console.error("Could not setup iin-agent due to error:", error);
        });
    });
} else {
    iinAgentServer.bindAsync(`${process.env.IIN_AGENT_ENDPOINT}`, ServerCredentials.createInsecure(), (cb) => {
        configSetup().then(() => {
            console.log('Starting IIN agent server without TLS on', process.env.IIN_AGENT_ENDPOINT);
            iinAgentServer.start();
            loopSyncExternalState();
        }).catch((error) => {
            console.error("Could not setup iin-agent due to error:", error);
        });
    });
}
