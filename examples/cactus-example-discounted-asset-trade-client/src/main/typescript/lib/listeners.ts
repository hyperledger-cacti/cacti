/**
 * Functions used for listening for ledger events.
 */

import * as log from "loglevel";
import {
  CredentialStateChangedEvent,
  CredentialEventTypes,
  CredentialState,
  ProofEventTypes,
  ProofStateChangedEvent,
  ProofState,
  CredentialExchangeRecord,
  ProofExchangeRecord,
} from "@aries-framework/core";

import { AnoncredAgent } from "../public-api";

/**
 * Method to accept credential or decline it when error occurred.
 *
 * @param agent Aries agent
 * @param credentialRecord received credential
 */
async function acceptCredential(
  agent: AnoncredAgent,
  credentialRecord: CredentialExchangeRecord,
) {
  try {
    log.info(`Accepting credential ${credentialRecord.id}...`);

    await agent.credentials.acceptOffer({
      credentialRecordId: credentialRecord.id,
    });

    log.info("Credential accepted!");
  } catch (error) {
    log.error("Could not accept credential offer! Declining it...");
    agent.credentials.declineOffer(credentialRecord.id);
  }
}

/**
 * Method to accept proof requests or decline it when error occurred or matching credential is missing.
 *
 * @param agent Aries agent
 * @param proofRecord received proof
 */
async function acceptProof(
  agent: AnoncredAgent,
  proofRecord: ProofExchangeRecord,
) {
  try {
    log.info(`Accepting proof ${proofRecord.id}...`);

    const requestedCredentials = await agent.proofs.selectCredentialsForRequest(
      {
        proofRecordId: proofRecord.id,
      },
    );
    await agent.proofs.acceptRequest({
      proofRecordId: proofRecord.id,
      proofFormats: requestedCredentials.proofFormats,
    });

    log.info("Proof request accepted!");
  } catch (error) {
    log.error("Could not accept proof request! Declining it...");
    await agent.proofs.declineRequest({
      proofRecordId: proofRecord.id,
      sendProblemReport: true,
    });
  }
}

/**
 * Setup listener that will accept all credentials send to the agent.
 *
 * @param agent Aries agent
 */
export function setupAcceptingCredentialListener(agent: AnoncredAgent) {
  agent.events.on<CredentialStateChangedEvent>(
    CredentialEventTypes.CredentialStateChanged,
    async ({ payload }) => {
      log.debug("Received credentialRecord:", payload.credentialRecord);

      switch (payload.credentialRecord.state) {
        case CredentialState.OfferReceived:
          await acceptCredential(agent, payload.credentialRecord);
          break;
      }
    },
  );
}

/**
 * Setup listener that will accept all proof requests send to the agent.
 *
 * @param agent Aries agent
 */
export const setupAcceptingProofListener = (agent: AnoncredAgent) => {
  agent.events.on(
    ProofEventTypes.ProofStateChanged,
    async ({ payload }: ProofStateChangedEvent) => {
      log.debug("Received proofRecord:", payload.proofRecord);

      switch (payload.proofRecord.state) {
        case ProofState.RequestReceived:
          await acceptProof(agent, payload.proofRecord);
          break;
      }
    },
  );
};
