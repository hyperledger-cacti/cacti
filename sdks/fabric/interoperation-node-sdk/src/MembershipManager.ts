/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
 
import { Gateway, Network } from 'fabric-network';
import { Channel } from 'fabric-common';
import * as path from 'path';
import * as fs from 'fs';

import membershipPb from '@hyperledger-labs/weaver-protos-js/common/membership_pb';

import { handlePromise } from './helpers'

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

function getMembershipUnit(channel: Channel, mspId: string): membershipPb.Member {
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
    let member = new membershipPb.Member();
    member.setType("certificate");
    member.setValue("");
    member.setChainList(certs);
    
    return member;
}
 
function getMSPConfigurations(
    network: Network,
    memberMspIds: Array<string>
): membershipPb.Membership {
    try {
        const mspIds = network.getChannel().getMspids();
        const membership = new membershipPb.Membership();
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
): membershipPb.Membership {
    try {
        const mspIds = network.getChannel().getMspids();
        const membership = new membershipPb.Membership();
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

export {
    createLocalMembership,
    updateLocalMembership,
    deleteLocalMembership,
    getMembershipUnit,
    getAllMSPConfigurations
}
