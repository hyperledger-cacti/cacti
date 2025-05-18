#!/usr/bin/env node

/**
 * Simple script for setting up employment credential on the ledger and issuing one to Alice.
 * Alice can later use it when interacting with discounted asset trade app.
 * Script can also be used to verify whether test indy ledger is operational.
 */

import * as log from "loglevel";
import {
  createAliceAgent,
  createIssuerAgent,
  connectAgents,
  issueCredential,
  checkCredentialProof,
} from "../public-api";

// Logger setup
const logLevel = process.env.LOG_LEVEL ?? "INFO";
log.setDefaultLevel(logLevel as log.LogLevelDesc);
console.log("Running with log level", logLevel);

/**
 * Main setup script logic.
 * Creates agents for Alice and Issuer, connects them, registers credentials, issues it to Alice, and verify the proof.
 */
async function run() {
  const aliceAgent = await createAliceAgent();
  log.debug("Alice agent created");

  const { agent: issuerAgent, did: issuerDid } = await createIssuerAgent();
  log.debug("Issuer agent created.");
  log.debug("Issuer endorsing DID:", issuerDid);

  try {
    log.info("Connecting Alice with Issuer...");
    const [aliceAgentConRecord, issuerAgentConRecord] = await connectAgents(
      aliceAgent,
      issuerAgent,
    );
    log.debug("Alice connection ID:", aliceAgentConRecord.id);
    log.debug("Issuer connection ID:", issuerAgentConRecord.id);

    log.info("Register and issue the employment credential...");
    const { credentialDefinitionId } = await issueCredential(
      issuerAgent,
      [
        { name: "first_name", value: "Alice" },
        { name: "last_name", value: "Garcia" },
        { name: "salary", value: "2400" },
        { name: "employee_status", value: "Permanent" },
        { name: "experience", value: "10" },
      ],
      issuerAgentConRecord.id,
      issuerDid,
    );

    log.info("Verify employment status proof...");
    await checkCredentialProof(
      issuerAgent,
      credentialDefinitionId,
      issuerAgentConRecord.id,
    );
  } catch (error) {
    log.error("Error when running setup scenario:", error);
  } finally {
    log.info("Finishing - cleaning up the agents...");
    await aliceAgent.shutdown();
    await issuerAgent.shutdown();
  }

  log.info("All done.");
}

// Run the script logic
run();
