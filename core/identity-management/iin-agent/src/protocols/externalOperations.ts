/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import iin_agent_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_pb';
import { handlePromise, getLedgerBase, getIINAgentClient, getSecurityDomainDNS, defaultCallback, delay } from '../common/utils';
import { LedgerBase } from '../common/ledgerBase';
import { v4 as uuidv4 } from "uuid";

export let securityDomainMap = new Map<string, string | iin_agent_pb.AttestedMembership>();

export function getSecurityDomainMapKey(securityDomain: string, iinAgent: string, nonce: string) {
    return 'SEC_DOM_MAP:' + securityDomain ':' + iinAgent + ':' + nonce;
}

// Handles communication with foreign IIN agents
export const syncExternalStateFromIINAgent = async (remoteSecurityDomainUnit: iin_agent_pb.SecurityDomainMemberIdentity, securityDomain: string, memberId: string) => {
    const remoteSecurityDomain = remoteSecurityDomainUnit.getSecurityDomain()
    console.log('syncExternalStateFromIINAgent:', remoteSecurityDomain, '-', remoteSecurityDomainUnit.getMemberId(), ' nonce:', nonce);
    
    const nonce = uuidv4();
    const sleepTime = 2000 // 2 seconds
    const timeoutTime = 300 * 1000 // 5 minutes
    const timeoutIterations = timeoutTime/sleepTime // 5 minutes
    
    const requestingSecurityDomain = new iin_agent_pb.SecurityDomainMemberIdentity()
    requestingSecurityDomain.setSecurityDomain(securityDomain)
    requestingSecurityDomain.setMemberId(memberId)
    
    const request = new iin_agent_pb.SecurityDomainMemberIdentityRequest()
    request.setSourceNetwork(remoteSecurityDomainUnit)
    request.setRequestingNetwork(requestingSecurityDomain)
    request.setNonce(nonce)
    
    // Request Attested Membership from all members of remote security_domain
    const remoteSecurityDomainDNS = getSecurityDomainDNS(remoteSecurityDomain)
    const remoteSecDomMapKeys = []
    for (iinAgent in remoteSecurityDomainDNS) {
        const iinAgentClient = getIINAgentClient(remoteSecurityDomain, iinAgent, remoteSecurityDomainDNS)
        console.log(`Requesting attested memberships from: ${remoteSecurityDomain} - ${iinAgent}`)
        iinAgentClient.requestIdentityConfiguration(request, defaultCallback)
        remoteSecDomMapKeys.push(getSecurityDomainMapKey(remoteSecurityDomain, iinAgent, nonce))
    }
    
    // Wait till all remote iin-agents have responded
    let c = 0
    for (let i = 0; i < timeoutIterations; i++) {
        await delay(sleepTime)
        for (key of remoteSecDomMapKeys) {
            if (securityDomainMap.has(key)) {
                console.log(`Received response from remote member: ${key.substring(12)}`)
                c += 1
            }
        }
        if (c >= remoteSecDomMapKeys.length) {
            break
        }
    }
    
    // Group Attestations
    let attestations = []
    let membership = ""
    for (key of remoteSecDomMapKeys) {
        const attestedMembershipOrError = securityDomainMap.get(key)
        if (typeof attestedMembershipOrError === "string") {
            throw new Error(attestedMembershipOrError)
        }
        const memberId = attestation.getUnitIdentity()!.getMemberId()
        if (membership === "") {
            membership = attestedMembershipOrError.getMembership()
        } else if (membership != attestedMembershipOrError.getMembership()) {
            throw new Error(`received different membership from ${memberId}`)
        }
        const attestation = attestedMembershipOrError.getAttestation()!
        if (nonce != attestation.getNonce()) {
            throw new Error(`received different nonce value in attestation from ${memberId}. Expected: ${nonce}, Received: ${attestation.getNonce()}`)
        }
        attestations.push(attestation)
    }
    
    const attestedMembershipSet = new iin_agent_pb.CounterAttestedMembership.AttestedMembershipSet()
    attestedMembershipSet.setMembership(membership)
    attestedMembershipSet.setAttestationsList(attestations)
    
    console.log('Received Attested Membership Set', JSON.stringify(attestedMembershipSet.toObject()))
    
    // Start Counter Attestation
    const ledgerBase = getLedgerBase(securityDomain, memberId)
    const counterAttestedMembership = ledgerBase.counterAttestMembership(attestedMembershipSet, securityDomain, nonce)
    
    const securityDomainDNS = getSecurityDomainDNS(securityDomain)
    const secDomMapKeys = []
    for (iinAgent in securityDomainDNS) {
        const iinAgentClient = getIINAgentClient(securityDomain, iinAgent, securityDomainDNS)
        console.log(`Requesting counter attested memberships from: ${securityDomain} - ${iinAgent}`)
        iinAgentClient.requestIdentityConfiguration(request, defaultCallback)
        secDomMapKeys.push(getSecurityDomainMapKey(remoteSecurityDomain, iinAgent, nonce))
    }
    
    // Wait till all local iin-agents have responded
    let c = 0
    for (let i = 0; i < timeoutIterations; i++) {
        await delay(sleepTime)
        for (key of secDomMapKeys) {
            if (securityDomainMap.has(key)) {
                console.log(`Received response from local member: ${key.substring(12)}`)
                c += 1
            }
        }
        if (c >= secDomMapKeys.length) {
            break
        }
    }
    
    // Group Counter Attestations
    let counterAttestations = counterAttestedMembership.getAttestationsList()
    let attestedMembershipSet = counterAttestedMembership.getAttestedMembershipSet()
    for (key of secDomMapKeys) {
        const counterAttestedMembershipOrError = securityDomainMap.get(key)
        if (typeof counterAttestedMembershipOrError === "string") {
            throw new Error(counterAttestedMembershipOrError)
        }
        const memberId = attestation.getUnitIdentity()!.getMemberId()
        if (attestedMembershipSet != counterAttestedMembershipOrError.getAttestedMembershipSet()) {
            throw new Error(`received different attested membership set from ${memberId}`)
        }
        const attestation = counterAttestedMembershipOrError.getAttestationsList()[0]
        if (nonce != attestation.getNonce()) {
            throw new Error(`received different nonce value in attestation from ${memberId}. Expected: ${nonce}, Received: ${attestation.getNonce()}`)
        }
        counterAttestations.push(attestation)
    }
    
    counterAttestedMembership.setAttestationsList(counterAttestations)
    console.log('Received Counter Attested Membership', JSON.stringify(counterAttestedMembership.toObject()))
    
    // Submit record membership tx to ledger
    const [result, resultError] = await utils.handlePromise(
        ledgerBase.recordMembershipInLedger(counterAttestedMembership)
    )
    
    if (resultError) {
        throw new Error(resultError)
    }
    console.log(`Succesfully recorded membership of ${remoteSecurityDomain}`)
    return result
};

// Generates network unit's state/configuration
export const requestIdentityConfiguration = async (request: iin_agent_pb.SecurityDomainMemberIdentityRequest) => {
    const sourceSecurityDomain = request.getSourceNetwork()!.getSecurityDomain()
    const sourceMemberId = request.getSourceNetwork()!.getMemberId()
    console.log('requestIdentityConfiguration:', sourceSecurityDomain, '-', sourceMemberId);
    
    const ledgerBase = getLedgerBase(sourceSecurityDomain, sourceMemberId)
    const [attestedMembership, error] = await utils.handlePromise(ledgerBase.getAttestedMembership(sourceSecurityDomain, request.getNonce()));
    const iinAgentClient = getIINAgentClient(request.getRequestingNetwork()!.getSecurityDomain(), request.getRequestingNetwork()!.getMemberId())
    if (error) {
        // TODO: what to send in case of error
        iinAgentClient.sendIdentityConfiguration(null, defaultCallback)
    } else {
        iinAgentClient.sendIdentityConfiguration(attestedMembership, defaultCallback)
    }
};

// Processes foreign security domain unit's state/configuration received from a foreign IIN agent
export const sendIdentityConfiguration = async (attestedMembership: iin_agent_pb.AttestedMembership) => {
    const attestation = attestedMembership.getAttestation()!;
    const securityDomainUnit = attestation.getUnitIdentity()!;
    const secDomMapKey = getSecurityDomainMapKey(securityDomainUnit.getSecurityDomain(), securityDomainUnit.getMemberId(), securityDomainUnit.getNonce() || "")
    console.log('sendIdentityConfiguration:', securityDomainUnit.getSecurityDomain(), '-', securityDomainUnit.getMemberId());
    try {
        if (attestation.certificate.length == 0) {
            throw new Error('attestation has no certificate')
        }
        if (attestation.signature.length == 0) {
            throw new Error('attestation has no signature')
        }
        // TODO? Verify attestation or leave it to inteorp Dapp?
        securityDomainMap.set(secDomMapKey, attestedMembership)
    } catch (e) {
        console.log(e);
        securityDomainMap.set(secDomMapKey, `${e} from SecurityDomain: ${securityDomainUnit.getSecurityDomain()}, Member: ${securityDomainUnit.getMemberId(), Nonce: securityDomainUnit.getNonce()}`)
    }
};
