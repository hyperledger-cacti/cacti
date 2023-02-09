/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
 
import { Gateway, Network } from 'fabric-network';
import { Channel } from 'fabric-common';
import * as path from 'path';
import * as fs from 'fs';
import { credentials } from '@grpc/grpc-js';


import membership_pb from '@hyperledger-labs/weaver-protos-js/common/membership_pb';
import agent_grpc_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_grpc_pb';
import agent_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_pb';
import common_ack_pb from "@hyperledger-labs/weaver-protos-js/common/ack_pb";

import { handlePromise, promisifyAll } from './helpers'

// Only Admin can create, update and delete local memberships
async function createLocalMembership(
    gateway: Gateway,
    memberMspIds: Array<string>,
    securityDomain: string,
    channelName: string,
    weaverCCId: string
): Promise<any> {
    const network = await gateway.getNetwork(channelName)
    const membership = getMSPConfigurations(network, memberMspIds)
    membership.setSecuritydomain(securityDomain)
    const membership64 = Buffer.from(membership.serializeBinary()).toString('base64')
    const contract = network.getContract(weaverCCId)
    return await contract.submitTransaction("CreateLocalMembership", membership64);
}

async function updateLocalMembership(
    gateway: Gateway,
    memberMspIds: Array<string>,
    securityDomain: string,
    channelName: string,
    weaverCCId: string
): Promise<any> {
    const network = await gateway.getNetwork(channelName)
    const membership = getMSPConfigurations(network, memberMspIds)
    membership.setSecuritydomain(securityDomain)
    const membership64 = Buffer.from(membership.serializeBinary()).toString('base64')
    const contract = network.getContract(weaverCCId)
    return await contract.submitTransaction("UpdateLocalMembership", membership64);
}

async function deleteLocalMembership(
    gateway: Gateway,
    securityDomain: string,
    channelName: string,
    weaverCCId: string
): Promise<any> {
    const network = await gateway.getNetwork(channelName)
    const contract = network.getContract(weaverCCId)
    return await contract.submitTransaction("DeleteLocalMembership", securityDomain);
}

async function readLocalMembership(
    gateway: Gateway,
    securityDomain: string,
    channelName: string,
    weaverCCId: string
): Promise<any> {
    const network = await gateway.getNetwork(channelName)
    const contract = network.getContract(weaverCCId)
    return await contract.submitTransaction("DeleteLocalMembership", securityDomain);
}

function getMembershipUnit(channel: Channel, mspId: string): membership_pb.Member {
    const mspConfig = channel.getMsp(mspId);
    let certs = [];
    if (Array.isArray(mspConfig.rootCerts)) {
        for (let i = 0; i < mspConfig.rootCerts.length; i++) {
            certs.push(mspConfig.rootCerts[i]);
        }
    } else if (mspConfig.rootCerts.length !== 0) {
        certs.push(mspConfig.rootCerts);
    }
    if (Array.isArray(mspConfig.intermediateCerts)) {
        for (let i = 0; i < mspConfig.intermediateCerts.length; i++) {
            certs.push(mspConfig.intermediateCerts[i]);
        }
    } else if (mspConfig.intermediateCerts.length !== 0) {
        certs.push(mspConfig.intermediateCerts);
    }
    let member = new membership_pb.Member();
    member.setType("certificate");
    member.setValue("");
    member.setChainList(certs);
    
    return member;
}
 
function getMSPConfigurations(
    network: Network,
    memberMspIds: Array<string>
): membership_pb.Membership {
    try {
        const mspIds = network.getChannel().getMspids();
        const membership = new membership_pb.Membership();
        for (let i = 0 ; i < mspIds.length ; i++) {
            if (memberMspIds.includes(mspIds[i])) {
                const member = getMembershipUnit(network.getChannel(), mspIds[i]);
                membership.getMembersMap().set(mspIds[i], member);
            }
        }
        return membership;
    } catch (error) {
        console.error(`Failed to get msp details: ${error}`);
        throw error;
    }
}

function getAllMSPConfigurations(
    network: Network,
    ordererMspIds: Array<string>
): membership_pb.Membership {
    try {
        const mspIds = network.getChannel().getMspids();
        const membership = new membership_pb.Membership();
        for (let i = 0 ; i < mspIds.length ; i++) {
            if (!ordererMspIds.includes(mspIds[i])) {
                const member = getMembershipUnit(network.getChannel(), mspIds[i]);
                membership.getMembersMap().set(mspIds[i], member);
            }
        }
        return membership;
    } catch (error) {
        console.error(`Failed to get msp details: ${error}`);
        throw error;
    }
}

async function syncMembershipFromIINAgent(
    securityDomain: string,
    iinAgentEndpoint: string,
    useTls: boolean = false,
    tlsCACertPath?: string,
) {
    try {
        const foreignSecurityDomain = new agent_pb.SecurityDomainMemberIdentity();
        foreignSecurityDomain.setSecurityDomain(securityDomain);
        
        const iinAgentClient = getIINAgentClient(iinAgentEndpoint, useTls, tlsCACertPath)
        const {
            syncExternalState,
        }: {
            syncExternalState: (request: agent_pb.SecurityDomainMemberIdentity) => Promise<common_ack_pb.Ack>;
        } = promisifyAll(iinAgentClient);
        
        if (typeof syncExternalState === "function") {
            const [resp, error] = await handlePromise(syncExternalState(foreignSecurityDomain));
            if (error) {
                throw new Error(`Membership Sync error: ${error}`);
            }
            if (resp.getStatus() === common_ack_pb.Ack.STATUS.ERROR) {
                throw new Error(`Membership Sync request received negative Ack error: ${resp.getMessage()}`);
            }
            return resp.toObject();
        }
        throw new Error("Error with Membership Sync in NetworkClient");
    } catch (e) {
        throw new Error(`Error with IIN Agent Client: ${e}`);
    }
}

export function getIINAgentClient(
    endpoint: string,
    tls: boolean = false,
    tlsCACertPath?: string
): agent_grpc_pb.IINAgentClient {
    let client: agent_grpc_pb.IINAgentClient;
    if (tls) {
        if (!tlsCACertPath || tlsCACertPath == "") {
            client = new agent_grpc_pb.IINAgentClient(
                endpoint,
                credentials.createSsl()
            );
        } else {
            if (!(tlsCACertPath && fs.existsSync(tlsCACertPath))) {
                throw new Error("Missing or invalid IIN Agent's tlsCACertPaths: " + tlsCACertPath);
            }
            const rootCert = fs.readFileSync(tlsCACertPath);
            client = new agent_grpc_pb.IINAgentClient(
                endpoint,
                credentials.createSsl(rootCert)
            );
        }
    } else {
        client = new agent_grpc_pb.IINAgentClient(
            endpoint,
            credentials.createInsecure()
        );
    }
    return client;
}

export {
    createLocalMembership,
    updateLocalMembership,
    deleteLocalMembership,
    getMembershipUnit,
    getAllMSPConfigurations,
    syncMembershipFromIINAgent
}
