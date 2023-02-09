/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import iin_agent_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_pb';
import * as utils from '../common/utils';
import { localAgentResponseCount, counterAttestationsMap, getSecurityDomainMapKey, securityDomainMap,  foreignAgentResponseCount} from './externalOperations';
// import { handlePromise, getLedgerBase, getIINAgentClient, getSecurityDomainDNS, defaultCallback, delay } from '../common/utils';
import { LedgerBase } from '../common/ledgerBase';
import { v4 as uuidv4 } from "uuid";


// Generates attestations on a foreign security domain unit's state
export const requestAttestation = async (counterAttestedMembership: iin_agent_pb.CounterAttestedMembership, localSecurityDomain: string, localMemberId: string, refreshTime: number) => {

  // create local security domain
  const localSecurityDomainUnit = new iin_agent_pb.SecurityDomainMemberIdentity();
  localSecurityDomainUnit.setSecurityDomain(localSecurityDomain);
  localSecurityDomainUnit.setMemberId(localMemberId);

  // get counterattestations from requester
  const counterAttestations = counterAttestedMembership.getAttestationsList();
  const nonce = counterAttestations[0].getNonce();
  const attestedMembershipSet = utils.deserializeAttestedMembershipSet64(counterAttestedMembership.getAttestedMembershipSet());
  const membership = attestedMembershipSet.getMembership();
  const attestations = attestedMembershipSet.getAttestationsList();


  let counter = 0;
  let errorMsg = "";
  for(const attestation of attestations){
    // validate foreign attestation
    if(!(utils.validateAttestedMembership(membership, nonce, attestation))){
      errorMsg = "Invalid attestation by foreign member on the membership";
      break;
    }

    // get membership info of foreign IIN agent
    const remoteSecurityDomainUnit = attestation.getUnitIdentity();
    const remoteSecurityDomain = remoteSecurityDomainUnit.getSecurityDomain();
    const remoteMemberID = remoteSecurityDomainUnit.getMemberId();
    const remoteSecurityDomainDNS = utils.getSecurityDomainDNS(remoteSecurityDomain);

    // fetch cached membership info of foreign IIN agent from local cache
    let key = getSecurityDomainMapKey(remoteSecurityDomain, remoteMemberID);
    const attestedMembershipOrError = securityDomainMap.get(key);
    // if membership info is not in cache
    if (!attestedMembershipOrError || typeof attestedMembershipOrError === "string"){
      // fetch fresh membership info (move to a separate function)
      // create a request
      const request = new iin_agent_pb.SecurityDomainMemberIdentityRequest();
      request.setSourceNetwork(remoteSecurityDomainUnit);
      request.setRequestingNetwork(localSecurityDomainUnit);
      request.setNonce(nonce);
      // get remote iinagentclient
      const remoteIINAgentClient = utils.getIINAgentClient(remoteSecurityDomain, remoteMemberID, remoteSecurityDomainDNS);
      // request identity configuration from remote iinagentclient
      remoteIINAgentClient.requestIdentityConfiguration(request, utils.defaultCallback);
      counter++;
    }
    else{
      // get timestamp corresponding to cached membership info
      const attestationCached = attestedMembershipOrError.getAttestation();
      const timeStampCached = attestationCached.getTimestamp();
      const timeStampCurrent = Date.now();
      // if cached timestamp is outdated
      if (Math.floor((timeStampCurrent - timeStampCached)/1000) > refreshTime){
        // fetch fresh membership info (move to a separate function)
        // create a request
        const request = new iin_agent_pb.SecurityDomainMemberIdentityRequest();
        request.setSourceNetwork(remoteSecurityDomainUnit);
        request.setRequestingNetwork(localSecurityDomainUnit);
        request.setNonce(nonce);
        // get remote iinagentclient
        const remoteIINAgentClient = utils.getIINAgentClient(remoteSecurityDomain, remoteMemberID, remoteSecurityDomainDNS);
        // request identity configuration from remote iinagentclient
        remoteIINAgentClient.requestIdentityConfiguration(request, utils.defaultCallback);
        counter++;
      }
      else{
        // match membership
        if(membership != attestedMembershipOrError.getMembership()){
          errorMsg = "Membership mismatch";
          break;
        }
      }
    }
  }
  const requesterMemberID = counterAttestations[0].getUnitIdentity()!.getMemberId();
  if(counter > 0){
    foreignAgentResponseCount.set(nonce, { current:0, total: counter});
    const key = getSecurityDomainMapKey('LOCAL_COUNTER_ATTESTATION_REQUEST', '', nonce);
    counterAttestationsMap.set(key, counterAttestedMembership);
    console.log("Requested fresh membership from foreign agent");
    return;
  }
  // get iinagentclient for the requester
  const requesterSecurityDomain = counterAttestations[0].getUnitIdentity()!.getSecurityDomain();
  const requesterSecurityDomainDNS = utils.getSecurityDomainDNS(requesterSecurityDomain);
  const requesterIINAgentClient = utils.getIINAgentClient(requesterSecurityDomain, requesterMemberID, requesterSecurityDomainDNS);
  if(errorMsg != ""){
    // send the error back to the requester
    const errorCounterAttestedMembership = utils.generateErrorCounterAttestation(errorMsg, localSecurityDomain, localMemberId, nonce);
    requesterIINAgentClient.sendAttestation(errorCounterAttestedMembership, utils.defaultCallback);
  }
  else{
    // create new attestations on foreign security domain's state info sent by requester
    const localLedgerBase = utils.getLedgerBase(localSecurityDomain, localMemberId);
    const localCounterAttestedMembership = await localLedgerBase.counterAttestMembership(counterAttestedMembership.getAttestedMembershipSet(), localSecurityDomain, nonce);
    // send attestation back to requester
    requesterIINAgentClient.sendAttestation(localCounterAttestedMembership, utils.defaultCallback);
  }
};

export function sendAttestation(counterAttestedMembership: iin_agent_pb.CounterAttestedMembership, securityDomain: string, memberId: string) {
    // Assuming only one counter attestation in the list
    const attestation = counterAttestedMembership.getAttestationsList()[0];
    if (!attestation.hasUnitIdentity()) {
        const errorMsg = 'attestation has no SecurityDomainMemberIdentity associated with it';
        console.error('Error: ' + errorMsg);
        throw new Error(errorMsg);
    }

    const securityDomainUnit = attestation.getUnitIdentity()!;
    const peerAgentMemberId = securityDomainUnit.getMemberId();
    if (securityDomain !== securityDomainUnit.getSecurityDomain()) {
        const errorMsg = `received counter attestation from different security domain's member '${peerAgentMemberId}'. Expected: ${securityDomain}, Received: ${securityDomainUnit.getSecurityDomain()}`;
        console.error('Error: ' + errorMsg);
        throw new Error(errorMsg);
    }

    const nonce = attestation.getNonce();
    const localKey = getSecurityDomainMapKey('LOCAL_COUNTER_ATTESTATION_RESPONSE', memberId, nonce);
    if (!(counterAttestationsMap.has(localKey) && localAgentResponseCount.has(nonce))) {
        const errorMsg = `not expecting any response with received nonce: ${nonce}`;
        console.error('Error: ' + errorMsg);
        throw new Error(errorMsg);
    }
    sendAttestationHelper(counterAttestedMembership, securityDomain, memberId, peerAgentMemberId, nonce).then().catch((error) => {
        console.error("SendAttestationHelper Error:", error);
    });
}

// Processes attestations on a foreign security domain unit's state received from a local IIN agent
const sendAttestationHelper = async (counterAttestedMembership: iin_agent_pb.CounterAttestedMembership, securityDomain: string, memberId: string, peerAgentMemberId: string, nonce: string) => {
    const attestation = counterAttestedMembership.getAttestationsList()[0];

    const localKey = getSecurityDomainMapKey('LOCAL_COUNTER_ATTESTATION_RESPONSE', memberId, nonce);
    const myCounterAttestedMembership = counterAttestationsMap.get(localKey) as iin_agent_pb.CounterAttestedMembership;
    const attestedMembershipSet64 = myCounterAttestedMembership.getAttestedMembershipSet();
    const attestedMembershipSet = iin_agent_pb.CounterAttestedMembership.AttestedMembershipSet.deserializeBinary(
        Buffer.from(attestedMembershipSet64, 'base64')
    );
    const remoteSecurityDomain = attestedMembershipSet.getAttestationsList()[0].getUnitIdentity()!.getSecurityDomain();

    const counterAttestationsMapKey = getSecurityDomainMapKey(remoteSecurityDomain, peerAgentMemberId, nonce);
    console.log('sendAttestation:', peerAgentMemberId, '-', nonce, 'for remote security domain', remoteSecurityDomain);
    try {
        if (counterAttestedMembership.hasError()) {
            throw new Error(counterAttestedMembership.getError());
        }
        if (attestation.getCertificate().length == 0) {
            throw new Error('attestation has no certificate');
        }
        if (attestation.getSignature().length == 0) {
            throw new Error('attestation has no signature');
        }
        counterAttestationsMap.set(counterAttestationsMapKey, counterAttestedMembership);
    } catch (e) {
        const errorMsg = `${e} from Local iin-agent with MemberId: ${peerAgentMemberId}, Nonce: ${nonce}`;
        console.error(errorMsg);
        counterAttestationsMap.set(counterAttestationsMapKey, errorMsg);
    }
    const currLocalAgentResponsesCount = localAgentResponseCount.get(nonce).current;
    const totalLocalAgentResponsesCount = localAgentResponseCount.get(nonce).total;
    localAgentResponseCount.set(nonce, { current: currLocalAgentResponsesCount + 1, total: totalLocalAgentResponsesCount });

    if (currLocalAgentResponsesCount + 1 < totalLocalAgentResponsesCount) {
        // Pending respones from other foreign iin-agents
        return;
    }
    if (currLocalAgentResponsesCount + 1 > totalLocalAgentResponsesCount) {
        console.warn('Warning: Received extra responses.');
    }

    // Group Counter Attestations
    let counterAttestations = myCounterAttestedMembership.getAttestationsList();
    const securityDomainDNS = utils.getSecurityDomainDNS(securityDomain);
    let errorMsg = '';
    for (const localAgent in securityDomainDNS) {
        if (localAgent === memberId) {
            continue;
        }
        const key = getSecurityDomainMapKey(remoteSecurityDomain, localAgent, nonce);
        if (!counterAttestationsMap.has(key)) {
            // count completed but still some foreign agents haven't responded.
            console.log(`Waiting for response from ${localAgent}`);
            return;
        }
        let counterAttestedMembershipOrError = counterAttestationsMap.get(key);
        if (typeof counterAttestedMembershipOrError === "string") {
            errorMsg = counterAttestedMembershipOrError as string;
        }
        counterAttestedMembershipOrError = counterAttestedMembershipOrError as iin_agent_pb.CounterAttestedMembership;
        const attestation = counterAttestedMembershipOrError.getAttestationsList()[0];
        if (nonce !== attestation.getNonce()) {
            errorMsg = `received different nonce value in attestation from ${localAgent}. Expected: ${nonce}, Received: ${attestation.getNonce()}`;
        }
        if (attestedMembershipSet64 !== counterAttestedMembershipOrError.getAttestedMembershipSet()) {
            errorMsg = `received different attested membership set from ${memberId}`;
        }
        counterAttestations.push(attestation);
    }

    if (errorMsg.length===0) {
        myCounterAttestedMembership.setAttestationsList(counterAttestations);
        console.log('Received Counter Attested Membership', JSON.stringify(counterAttestedMembership.toObject()));

        // Submit record membership tx to ledger
        const ledgerBase = utils.getLedgerBase(securityDomain, memberId);
        const [result, resultError] = await utils.handlePromise(
            ledgerBase.recordMembershipInLedger(myCounterAttestedMembership)
        );

        if (resultError) {
            console.error('Error submitting counter attested membership to ledger:', resultError);
        } else {
            console.log(`Succesfully recorded membership of ${remoteSecurityDomain} with result: ${result}`);
        }
    } else {
        console.error(`Sync Remote Membership Failed with error: ${errorMsg}`);
    }

    // End of protocol for iin-agents: Map cleanup
    counterAttestationsMap.delete(localKey);
    localAgentResponseCount.delete(nonce);
    for (const localAgent in securityDomainDNS) {
        if (localAgent === memberId) {
            continue;
        }
        const key = getSecurityDomainMapKey(remoteSecurityDomain, localAgent, nonce);
        counterAttestationsMap.delete(key);
    }
};
