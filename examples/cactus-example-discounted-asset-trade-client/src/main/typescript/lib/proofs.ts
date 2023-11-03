/**
 * Functions for handling proofs.
 */

import * as log from "loglevel";
import {
  ProofEventTypes,
  ProofStateChangedEvent,
  ProofState,
  ProofExchangeRecord,
} from "@aries-framework/core";
import { AnoncredAgent } from "./agent-setup";

// Constants
const WAIT_FOR_PROOF_TIMEOUT = 60 * 1000;

/**
 * Sends employment proof request to the peer agent (under connectionId), waits for proof to be accepted.
 * Function will timout after prederermined amount of time.
 * @note it returns if any proof was accepted, not necessarily one we've sent.
 *
 * @param agent Aries agent
 * @param credentialDefinitionId employment credential definition id
 * @param connectionId peer agent connection id
 *
 * @returns accepted ProofExchangeRecord id
 */
export async function checkCredentialProof(
  agent: AnoncredAgent,
  credentialDefinitionId: string,
  connectionId: string,
): Promise<ProofExchangeRecord> {
  // Create proof accepted listener
  const isProofOK = new Promise<ProofExchangeRecord>((resolve, reject) => {
    const timeoutId = setTimeout(
      () =>
        reject(
          new Error(
            "Timeout reached - could not receive proof confirmation from peer",
          ),
        ),
      WAIT_FOR_PROOF_TIMEOUT,
    );

    // Start listener
    agent.events.on(
      ProofEventTypes.ProofStateChanged,
      async ({ payload }: ProofStateChangedEvent) => {
        log.debug("Received proofRecord:", payload.proofRecord);

        const { state } = payload.proofRecord;
        if (
          state === ProofState.Done ||
          state === ProofState.Abandoned ||
          state === ProofState.Declined
        ) {
          clearTimeout(timeoutId);
          log.info("Requested proof status:", state);
          resolve(payload.proofRecord);
        }
      },
    );
  });

  // Send proof request
  const proofAttributes = {
    employee_status: {
      name: "employee_status",
      restrictions: [
        {
          "attr::employee_status::value": "Permanent",
          cred_def_id: credentialDefinitionId,
        },
      ],
    },
  };

  await agent.proofs.requestProof({
    protocolVersion: "v2",
    connectionId,
    proofFormats: {
      anoncreds: {
        name: "proof-request",
        version: "1.0",
        requested_attributes: proofAttributes,
      },
    },
  });
  log.info("Proof request was sent");

  return isProofOK;
}
