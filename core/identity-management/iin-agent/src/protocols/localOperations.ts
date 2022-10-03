/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import iin_agent_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_pb';
import * as utils from '../common/utils';
import { localAgentRequestMap } from './externalOperations.ts'


// Generates attestations on a foreign security domain unit's state
export const requestAttestation = async (counterAttestedMembership: iin_agent_pb.CounterAttestedMembership) => {
    console.log('requestAttestation:');
};

// Processes attestations on a foreign security domain unit's state received from a local IIN agent
export const sendAttestation = async (counterAttestedMembership: iin_agent_pb.CounterAttestedMembership, securityDomain: string) => {
    // Assuming only one counter attestation in the list
    const attestation = counterAttestedMembership.getAttestationsList()[0];
    if (!attestation.hasUnitIdentity()) {
        console.error('Error: attestation has no SecurityDomainMemberIdentity associated with it')
        return
    }
    
    const securityDomainUnit = attestation.getUnitIdentity()!;
    const localMemberId = securityDomainUnit.getMemberId()
    if (securityDomain !== securityDomainUnit.getSecurityDomain()) {
        console.error(`Error: received counter attestation from different security domain's member '${localMemberId}'. Expected: ${securityDomain}, Received: ${securityDomainUnit.getSecurityDomain()}`)
        return
    }
    
    const nonce = attestation.getNonce()
    if (!(localAgentResponseCount.has(nonce)) {
        console.error(`Error: Not expecting any response with received nonce: ${nonce}`)
        return
    }
    
    const secDomMapKey = getSecurityDomainMapKey('local', localMemberId, nonce)
    console.log('sendAttestation:', localMemberId, '-', nonce);
    try {
        if (counterAttestedMembership.hasError()) {
            throw new Error(attestedMembership.getError())
        }
        const attestedMembershipSet = utils.deserializeAttestedMembershipSet64(counterAttestedMembership.getAttestedMembershipSet())
        const remoteSecurityDomain = attestedMembershipSet.getAttestationsList()[0].getUnitIdentity()!.getSecurityDomain()
        
        if (attestation.getCertificate().length == 0) {
            throw new Error('attestation has no certificate')
        }
        if (attestation.getSignature().length == 0) {
            throw new Error('attestation has no signature')
        }
        securityDomainMap.set(secDomMapKey, counterAttestedMembership)
    } catch (e) {
        console.log(e);
        if (secDomMapKey.length > 0) {
            securityDomainMap.set(secDomMapKey, `${e} from SecurityDomain: ${securityDomain}, Member: ${localMemberId}, Nonce: ${nonce}`)
        }
    }
    const currForeignAgentResponsesCount = foreignAgentResponseCount.get(nonce).current
    const totalForeignAgentResponsesCount = foreignAgentResponseCount.get(nonce).total
    foreignAgentResponseCount.set(nonce, { current: currForeignAgentResponsesCount + 1, total: totalForeignAgentResponsesCount})
    
    if (currForeignAgentResponsesCount + 1 < totalForeignAgentResponsesCount) {
        // Pending respones from other foreign iin-agents
        return
    }
    if (currForeignAgentResponsesCount + 1 > totalForeignAgentResponsesCount) {
        console.warn('Warning: Received extra response.')
    }
    
    // Group Counter Attestations
    let counterAttestations = counterAttestedMembership.getAttestationsList()
    for (const key of secDomMapKeys) {
        let counterAttestedMembershipOrError = securityDomainMap.get(key)
        if (typeof counterAttestedMembershipOrError === "string") {
            throw new Error(counterAttestedMembershipOrError as string)
        }
        counterAttestedMembershipOrError = counterAttestedMembershipOrError as iin_agent_pb.CounterAttestedMembership
        const attestation = counterAttestedMembershipOrError.getAttestationsList()[0]
        const memberId = attestation.getUnitIdentity()!.getMemberId()
        if (nonce !== attestation.getNonce()) {
            throw new Error(`received different nonce value in attestation from ${memberId}. Expected: ${nonce}, Received: ${attestation.getNonce()}`)
        }
        if (attestedMembershipSet !== counterAttestedMembershipOrError.getAttestedMembershipSet()) {
            throw new Error(`received different attested membership set from ${memberId}`)
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
        throw resultError
    }
    console.log(`Succesfully recorded membership of ${remoteSecurityDomain}`)
    return result
};
