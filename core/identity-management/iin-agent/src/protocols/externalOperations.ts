/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import iin_agent_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_pb';
import * as utils from '../common/utils';
import { LedgerBase } from '../common/ledgerBase';
import { v4 as uuidv4 } from "uuid";

// key: get using function "getSecurityDomainMapKey"
export let securityDomainMap = new Map<string, string | iin_agent_pb.AttestedMembership>();
export let counterAttestationsMap = new Map<string, string | iin_agent_pb.CounterAttestedMembership>();

// key: Nonce
export let foreignAgentResponseCount = new Map<string, { current: number, total: number }>();
export let localAgentResponseCount = new Map<string, { current: number, total: number }>();

export function getSecurityDomainMapKey(securityDomain: string, iinAgent: string, nonce?: string | undefined) {
    if (nonce) {
        return 'SEC_DOM_MAP:' + securityDomain + ':' + iinAgent + ':' + nonce;
    } else {
        return 'SEC_DOM_MAP:' + securityDomain + ':' + iinAgent;
    }
}

// Handles communication with foreign IIN agents
export const syncExternalStateFromIINAgent = async (remoteSecurityDomainUnit: iin_agent_pb.SecurityDomainMemberIdentity, securityDomain: string, memberId: string) => {
    const remoteSecurityDomain = remoteSecurityDomainUnit.getSecurityDomain();
    const nonce = uuidv4();
    console.log('syncExternalStateFromIINAgent:', remoteSecurityDomain, '-', remoteSecurityDomainUnit.getMemberId(), ' nonce:', nonce);
    
    // const sleepTime = 2000 // 2 seconds
    // const timeoutTime = 300 * 1000 // 5 minutes
    // const timeoutIterations = timeoutTime/sleepTime // 5 minutes
    
    const requestingSecurityDomain = new iin_agent_pb.SecurityDomainMemberIdentity();
    requestingSecurityDomain.setSecurityDomain(securityDomain);
    requestingSecurityDomain.setMemberId(memberId);
    
    const request = new iin_agent_pb.SecurityDomainMemberIdentityRequest();
    request.setSourceNetwork(remoteSecurityDomainUnit);
    request.setRequestingNetwork(requestingSecurityDomain);
    request.setNonce(nonce);
    
    // Request Attested Membership from all members of remote security_domain
    const remoteSecurityDomainDNS = utils.getSecurityDomainDNS(remoteSecurityDomain);
    let c = 0;
    for (const iinAgent in remoteSecurityDomainDNS) {
        const iinAgentClient = utils.getIINAgentClient(remoteSecurityDomain, iinAgent, remoteSecurityDomainDNS);
        console.log(`Requesting attested memberships from: ${remoteSecurityDomain} - ${iinAgent}`);
        iinAgentClient.requestIdentityConfiguration(request, utils.defaultCallback);
        // remoteSecDomMapKeys.push(getSecurityDomainMapKey(remoteSecurityDomain, iinAgent, nonce));
        c++;
    }
    foreignAgentResponseCount.set(nonce, { current:0, total: c});
};

// Generates network unit's state/configuration
export const requestIdentityConfiguration = async (request: iin_agent_pb.SecurityDomainMemberIdentityRequest) => {
    const sourceSecurityDomain = request.getSourceNetwork()!.getSecurityDomain();
    const sourceMemberId = request.getSourceNetwork()!.getMemberId();
    console.log('requestIdentityConfiguration:', sourceSecurityDomain, '-', sourceMemberId);
    
    const ledgerBase = utils.getLedgerBase(sourceSecurityDomain, sourceMemberId);
    const [attestedMembership, error] = await utils.handlePromise(ledgerBase.getAttestedMembership(sourceSecurityDomain, request.getNonce()));
    const iinAgentClient = utils.getIINAgentClient(request.getRequestingNetwork()!.getSecurityDomain(), request.getRequestingNetwork()!.getMemberId());
    if (error) {
        iinAgentClient.sendIdentityConfiguration(
            utils.generateErrorAttestation(
                error.toString(), 
                sourceSecurityDomain, 
                sourceMemberId, 
                request.getNonce()
            ),
            utils.defaultCallback
        );
    } else {
        iinAgentClient.sendIdentityConfiguration(attestedMembership, utils.defaultCallback);
    }
};

// Processes foreign security domain unit's state/configuration received from a foreign IIN agent
export const sendIdentityConfiguration = async (attestedMembership: iin_agent_pb.AttestedMembership, securityDomain: string, memberId: string) => {
    const attestation = attestedMembership.getAttestation()!;
    if (!attestation.hasUnitIdentity()) {
        console.error('Error: attestation has no SecurityDomainMemberIdentity associated with it');
        return;
    }
    const securityDomainUnit = attestation.getUnitIdentity()!;
    const remoteSecurityDomain = securityDomainUnit.getSecurityDomain();
    const remoteMemberId = securityDomainUnit.getMemberId();
    const nonce = attestation.getNonce();
    if (!foreignAgentResponseCount.has(nonce)) {
        console.error(`Error: Not expecting any response with received nonce: ${nonce}`);
        return;
    }
    const secDomMapKey = getSecurityDomainMapKey(remoteSecurityDomain, remoteMemberId, nonce);
    console.log('sendIdentityConfiguration:', remoteSecurityDomain, '-', remoteMemberId, '-', nonce);
    try {
        if (attestedMembership.hasError()) {
            throw new Error(attestedMembership.getError());
        }
        if (attestation.getCertificate().length == 0) {
            throw new Error('attestation has no certificate');
        }
        if (attestation.getSignature().length == 0) {
            throw new Error('attestation has no signature');
        }
        securityDomainMap.set(secDomMapKey, attestedMembership);
    } catch (e) {
        const errorMsg = `${e} from SecurityDomain: ${remoteSecurityDomain}, Member: ${remoteMemberId}, Nonce: ${nonce}`;
        console.error(errorMsg);
        securityDomainMap.set(secDomMapKey, errorMsg);
    }
    const currForeignAgentResponsesCount = foreignAgentResponseCount.get(nonce).current;
    const totalForeignAgentResponsesCount = foreignAgentResponseCount.get(nonce).total;
    foreignAgentResponseCount.set(nonce, { current: currForeignAgentResponsesCount + 1, total: totalForeignAgentResponsesCount});
    
    if (currForeignAgentResponsesCount + 1 < totalForeignAgentResponsesCount) {
        // Pending respones from other foreign iin-agents;
        return;
    }
    if (currForeignAgentResponsesCount + 1 > totalForeignAgentResponsesCount) {
        console.warn('Warning: Received extra response.');
    }
    
    // All attesations received, Group Attestations;
    let attestations = [];
    let membership = "";
    let errorMsg = "";
    const remoteSecurityDomainDNS = utils.getSecurityDomainDNS(remoteSecurityDomain);
    for (const remoteAgent in remoteSecurityDomainDNS) {
        const key = getSecurityDomainMapKey(remoteSecurityDomain, remoteAgent, nonce);
        if (!securityDomainMap.has(key)) {
            // count completed but still some foreign agents haven't responded.
            console.log(`Waiting for response from ${remoteAgent}`);
            return;
        }
        let attestedMembershipOrError = securityDomainMap.get(key);
        if (typeof attestedMembershipOrError === "string") {
            errorMsg = attestedMembershipOrError as string;
        }
        attestedMembershipOrError = attestedMembershipOrError as iin_agent_pb.AttestedMembership;
        const attestation = attestedMembershipOrError.getAttestation()!;
        if (membership === "") {
            membership = attestedMembershipOrError.getMembership();
        } else if (membership !== attestedMembershipOrError.getMembership()) {
            errorMsg = `received different membership from ${remoteAgent}`;
        }
        if (!utils.validateAttestedMembership(membership, nonce, attestation)) {
            errorMsg = `attested membership from ${remoteAgent} invalid.`;
        }
        attestations.push(attestation);
        securityDomainMap.set(getSecurityDomainMapKey(remoteSecurityDomain, remoteAgent), attestedMembershipOrError);
    }
    
    const ledgerBase = utils.getLedgerBase(securityDomain, memberId);
    
    const localResponderKey = getSecurityDomainMapKey('LOCAL_COUNTER_ATTESTATION_REQUEST', '', nonce);
    if (counterAttestationsMap.has(localResponderKey)) {
        const requestingMemberCounterAttestation = counterAttestationsMap.get(localResponderKey) as iin_agent_pb.CounterAttestedMembership;
        const requestingMember = requestingMemberCounterAttestation.getAttestationsList()[0].getUnitIdentity()!;
        const attestedMembershipSetSerialized64 = requestingMemberCounterAttestation.getAttestedMembershipSet();
        
        let counterAttestedMembership;
        if (errorMsg.length > 0) {
            counterAttestedMembership = await ledgerBase.counterAttestMembership(attestedMembershipSetSerialized64, securityDomain, nonce);
        } else {
            counterAttestedMembership = utils.generateErrorCounterAttestation(errorMsg, securityDomain, memberId, nonce);
        }
        
        const iinAgentClient = utils.getIINAgentClient(requestingMember.getSecurityDomain(), requestingMember.getMemberId());
        iinAgentClient.sendAttestation(counterAttestedMembership, utils.defaultCallback);
        counterAttestationsMap.delete(localResponderKey);
    } else {
        // Else if Initiator, request counter attestation from other local iin-agents
        
        if (errorMsg.length > 0) {
            const attestedMembershipSet = new iin_agent_pb.CounterAttestedMembership.AttestedMembershipSet();
            attestedMembershipSet.setMembership(membership);
            attestedMembershipSet.setAttestationsList(attestations);
            const attestedMembershipSetSerialized64 = Buffer.from(attestedMembershipSet.serializeBinary()).toString('base64');
            
            console.log('Received Attested Membership Set', JSON.stringify(attestedMembershipSet.toObject()));
            
            const counterAttestedMembership = await ledgerBase.counterAttestMembership(attestedMembershipSetSerialized64, securityDomain, nonce);
            
            let c = 0;
            const securityDomainDNS = utils.getSecurityDomainDNS(securityDomain);
            for (const iinAgent in securityDomainDNS) {
                const iinAgentClient = utils.getIINAgentClient(securityDomain, iinAgent);
                console.log(`Requesting counter attested memberships from: ${securityDomain} - ${iinAgent}`);
                iinAgentClient.requestAttestation(counterAttestedMembership, utils.defaultCallback);
                c++;
            }
            localAgentResponseCount.set(nonce, { current:0, total: c});
            counterAttestationsMap.set(getSecurityDomainMapKey('LOCAL_COUNTER_ATTESTATION_RESPONSE', memberId, nonce), counterAttestedMembership);
        } else {
            console.error('Error while fetching attested membership from foreign network:', errorMsg);
            return;
        }
    }
    
    // Cleanup maps
    foreignAgentResponseCount.delete(nonce);
    for (const remoteAgent in remoteSecurityDomainDNS) {
        const key = getSecurityDomainMapKey(remoteSecurityDomain, remoteAgent, nonce);
        securityDomainMap.delete(key);
    }
};
