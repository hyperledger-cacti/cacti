/**
 * Functions for handling credentials.
 */

import * as log from "loglevel";
import {
  CredentialState,
  CredentialRecordBinding,
  CredentialPreviewAttribute,
} from "@aries-framework/core";
import { AnoncredAgent } from "./agent-setup";

// Constants
const WAIT_FOR_ISSUE_ACCEPT_POLL_INTERVAL = 1000;
const WAIT_FOR_ISSUE_ACCEPT_TIMEOUT = 30 * 1000;

const JOB_CERTIFICATE_SCHEMA_NAME = "cactiJobCert";
const JOB_CERTIFICATE_SCHEMA_ATTRS = [
  "first_name",
  "last_name",
  "salary",
  "employee_status",
  "experience",
];

export type JobCertificateSchema = [
  { name: "first_name"; value: string },
  { name: "last_name"; value: string },
  { name: "salary"; value: string },
  { name: "employee_status"; value: string },
  { name: "experience"; value: string },
];

export type AgentCredentialSummary = {
  id: string;
  schemaId: string;
  credentialDefinitionId: string;
  connectionId: string | undefined;
  credentials: CredentialRecordBinding[];
  credentialAttributes: CredentialPreviewAttribute[] | undefined;
};

/**
 * Register employment credential schema using specified endorser DID and agent.
 *
 * @param agent Aries agent
 * @param did endorser DID
 *
 * @returns schema ID
 */
export async function registerCredentialSchema(
  agent: AnoncredAgent,
  did: string,
): Promise<string> {
  log.info(
    `Register employment certificate credential schema '${JOB_CERTIFICATE_SCHEMA_NAME}'...`,
  );

  const [createdSchema] = await agent.modules.anoncreds.getCreatedSchemas({
    schemaName: JOB_CERTIFICATE_SCHEMA_NAME,
  });
  if (createdSchema) {
    log.info("Schema was already registered");
    return createdSchema.schemaId;
  }

  const schemaResult = await agent.modules.anoncreds.registerSchema({
    schema: {
      attrNames: JOB_CERTIFICATE_SCHEMA_ATTRS,
      issuerId: did,
      name: JOB_CERTIFICATE_SCHEMA_NAME,
      version: "1.0.0",
    },
    options: {
      endorserMode: "internal",
      endorserDid: did,
    },
  });

  if (schemaResult.schemaState.state !== "finished") {
    throw new Error(
      `Error registering schema: ${
        schemaResult.schemaState.state === "failed"
          ? schemaResult.schemaState.reason
          : "Not Finished"
      }`,
    );
  }

  return schemaResult.schemaState.schemaId;
}

/**
 * Register employment credential definition using specified endorser DID and agent.
 *
 * @param agent Aries agent
 * @param schemaId job credential schema id
 * @param did endorser DID
 *
 * @returns credentialDefinitionId
 */
export async function registerCredentialDefinition(
  agent: AnoncredAgent,
  schemaId: string,
  did: string,
): Promise<string> {
  log.info(
    `Register job certificate credential definition (schemaId: '${schemaId}') ...`,
  );

  const [createdCredentialDefinition] =
    await agent.modules.anoncreds.getCreatedCredentialDefinitions({
      schemaId,
      issuerId: did,
    });
  if (createdCredentialDefinition) {
    log.info("Credential definition was already registered");
    return createdCredentialDefinition.credentialDefinitionId;
  }

  const credentialDefinitionResult =
    await agent.modules.anoncreds.registerCredentialDefinition({
      credentialDefinition: {
        tag: "default",
        issuerId: did,
        schemaId: schemaId,
      },
      options: {
        endorserMode: "internal",
        endorserDid: did,
        supportRevocation: false,
      },
    });

  if (
    credentialDefinitionResult.credentialDefinitionState.state !== "finished"
  ) {
    throw new Error(
      `Error registering credential definition: ${
        credentialDefinitionResult.credentialDefinitionState.state === "failed"
          ? credentialDefinitionResult.credentialDefinitionState.reason
          : "Not Finished"
      }}`,
    );
  }

  return credentialDefinitionResult.credentialDefinitionState
    .credentialDefinitionId;
}

/**
 * Register schema and credential definition (if not done already), and issue new credential to agent
 * with specified `connectionId`.
 * Will wait until credential is accepted by the peer.
 *
 * @param issuerAgent Aries agent
 * @param credential credential to be issued
 * @param connectionId peer agent connection ID
 * @param did endorser DID
 * @returns schemaId, credentialDefinitionId, credentialId
 */
export async function issueCredential(
  issuerAgent: AnoncredAgent,
  credential: JobCertificateSchema,
  connectionId: string,
  did: string,
): Promise<{
  schemaId: string;
  credentialDefinitionId: string;
  credentialId: string;
}> {
  log.info("Register Credential Schema...");
  const schemaId = await registerCredentialSchema(issuerAgent, did);
  log.info("Employment credential schemaId:", schemaId);

  log.info("Register Credential Definition...");
  const credentialDefinitionId = await registerCredentialDefinition(
    issuerAgent,
    schemaId,
    did,
  );
  log.info(
    "Employment credential credentialDefinitionId:",
    credentialDefinitionId,
  );

  log.info("Issue the credential...");
  const indyCredentialExchangeRecord =
    await issuerAgent.credentials.offerCredential({
      protocolVersion: "v2",
      connectionId,
      credentialFormats: {
        anoncreds: {
          credentialDefinitionId,
          attributes: credential,
        },
      },
    });
  log.info("Employment credential issued:", indyCredentialExchangeRecord.id);
  await waitForCredentialAcceptance(
    issuerAgent,
    indyCredentialExchangeRecord.id,
  );
  log.info("Credential was issued and accepted by a peer agent!");

  return {
    schemaId,
    credentialDefinitionId,
    credentialId: indyCredentialExchangeRecord.id,
  };
}

/**
 * Block until credential was accepted by peer agent.
 *
 * @param agent Aries agent
 * @param credentialId issued credential id
 * @param timeout operation timeout (will throw exception if timeout exceeded)
 */
export async function waitForCredentialAcceptance(
  agent: AnoncredAgent,
  credentialId: string,
  timeout = WAIT_FOR_ISSUE_ACCEPT_TIMEOUT,
): Promise<void> {
  let credentialState: CredentialState | undefined;
  let counter = Math.ceil(timeout / WAIT_FOR_ISSUE_ACCEPT_POLL_INTERVAL);

  do {
    counter--;
    await new Promise((resolve) =>
      setTimeout(resolve, WAIT_FOR_ISSUE_ACCEPT_POLL_INTERVAL),
    );

    const credential = await agent.credentials.findById(credentialId);
    credentialState = credential?.state;
  } while (
    counter > 0 &&
    (!credentialState || credentialState !== CredentialState.Done)
  );

  if (counter <= 0) {
    throw new Error("waitForCredentialAcceptance() timeout reached!");
  }
}

/**
 * Get summary of given agent credentials.
 *
 * @param agent Aries agent
 * @returns list of credentials
 */
export async function getAgentCredentials(
  agent: AnoncredAgent,
): Promise<AgentCredentialSummary[]> {
  const validCredentials = await agent.credentials.findAllByQuery({
    state: CredentialState.Done,
  });
  log.debug("Valid credentials count:", validCredentials.length);

  return validCredentials.map((c) => {
    return {
      id: c.id,
      schemaId: c.metadata.data["_anoncreds/credential"].schemaId,
      credentialDefinitionId:
        c.metadata.data["_anoncreds/credential"].credentialDefinitionId,
      connectionId: c.connectionId,
      credentials: c.credentials,
      credentialAttributes: c.credentialAttributes,
    };
  });
}
