/**
 * Functions for setting up test Aries agents.
 */

import * as log from "loglevel";
import * as path from "node:path";
import * as os from "node:os";
import { readFileSync } from "fs";

import { AskarModule } from "@aries-framework/askar";
import {
  Agent,
  InitConfig,
  HttpOutboundTransport,
  ConnectionsModule,
  DidsModule,
  TypedArrayEncoder,
  KeyType,
  CredentialsModule,
  V2CredentialProtocol,
  ProofsModule,
  AutoAcceptProof,
  V2ProofProtocol,
  AutoAcceptCredential,
} from "@aries-framework/core";
import { agentDependencies, HttpInboundTransport } from "@aries-framework/node";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import {
  IndyVdrAnonCredsRegistry,
  IndyVdrIndyDidRegistrar,
  IndyVdrIndyDidResolver,
  IndyVdrModule,
} from "@aries-framework/indy-vdr";
import { indyVdr } from "@hyperledger/indy-vdr-nodejs";
import {
  AnonCredsCredentialFormatService,
  AnonCredsModule,
  AnonCredsProofFormatService,
} from "@aries-framework/anoncreds";
import { AnonCredsRsModule } from "@aries-framework/anoncreds-rs";
import { anoncreds } from "@hyperledger/anoncreds-nodejs";

import {
  setupAcceptingCredentialListener,
  setupAcceptingProofListener,
} from "../public-api";

// Constants
const ALICE_AGENT_NAME = "aliceCactiAgent";
const ALICE_AGENT_PORT = 3003;
const ISSUER_AGENT_NAME = "issuerCactiAgent";
const ISSUER_AGENT_PORT = 3004;
const ISSUER_DID_SEED = "000000000000000000000000Steward1";
const DID_INDY_NAMESPACE = "cacti:test";

const WALLET_PATH = path.join(
  os.homedir(),
  ".cacti/cactus-example-discounted-asset-trade/wallet",
);

// Read Genesis transactions
const genesisTransactionsPath =
  "/etc/cactus/indy-all-in-one/pool_transactions_genesis";
log.info(
  "Reading Indy genesis transactions from file:",
  genesisTransactionsPath,
);
const genesisTransactions = readFileSync(genesisTransactionsPath).toString(
  "utf-8",
);

/**
 * Configuration for local indy-all-in-one ledger.
 */
export const localTestNetwork = {
  isProduction: false,
  genesisTransactions,
  indyNamespace: DID_INDY_NAMESPACE,
  connectOnStartup: true,
};

/**
 * Aries JS Agent with Anoncreds/Indy/Askar modules configured.
 * This is exact Agent type returned by factories used in this module.
 */
export type AnoncredAgent = Agent<{
  readonly connections: ConnectionsModule;
  readonly credentials: CredentialsModule<
    V2CredentialProtocol<AnonCredsCredentialFormatService[]>[]
  >;
  readonly proofs: ProofsModule<
    V2ProofProtocol<AnonCredsProofFormatService[]>[]
  >;
  readonly anoncreds: AnonCredsModule;
  readonly anoncredsRs: AnonCredsRsModule;
  readonly indyVdr: IndyVdrModule;
  readonly dids: DidsModule;
  readonly askar: AskarModule;
}>;

/**
 * Import endorser DID using it's seed.
 * @warn If there's any endorser DID already in a wallet then it will be returned. New one (`seed`) will be ignored!
 *
 * @param agent Aries agent
 * @param seed private DID seed
 *
 * @returns endorser fully-qualified DID
 */
export async function importExistingIndyDidFromPrivateKey(
  agent: AnoncredAgent,
  seed: string,
): Promise<string> {
  const [endorserDid] = await agent.dids.getCreatedDids({ method: "indy" });
  if (endorserDid) {
    log.info("Endorser DID already present in a wallet");
    return endorserDid.did;
  }

  const seedBuffer = TypedArrayEncoder.fromString(seed);
  const key = await agent.wallet.createKey({
    keyType: KeyType.Ed25519,
    privateKey: seedBuffer,
  });

  // did is first 16 bytes of public key encoded as base58
  const unqualifiedIndyDid = TypedArrayEncoder.toBase58(
    key.publicKey.slice(0, 16),
  );
  const did = `did:indy:${DID_INDY_NAMESPACE}:${unqualifiedIndyDid}`;

  await agent.dids.import({
    did,
  });

  return did;
}

/**
 * Generic function for setting up common Anoncreds/Indy/Askar agent.
 * Use only for test purposes!
 *
 * @param name name of the agent
 * @param port port to listen on
 *
 * @returns newly created Aries agent.
 */
export async function setupAgent(
  name: string,
  port: number,
): Promise<AnoncredAgent> {
  const walletPath = path.join(WALLET_PATH, `${name}.sqlite`);

  const config: InitConfig = {
    label: name,
    walletConfig: {
      id: name,
      key: name,
      storage: {
        type: "sqlite",
        path: walletPath,
      },
    },
    endpoints: [`http://localhost:${port}`],
  };

  const agent = new Agent({
    config,
    modules: getAskarAnonCredsIndyModules(),
    dependencies: agentDependencies,
  });

  agent.registerOutboundTransport(new HttpOutboundTransport());
  agent.registerInboundTransport(new HttpInboundTransport({ port }));
  await agent.initialize();

  return agent;
}

/**
 * Get Anoncreds/Indy/Askar agent modules.
 *
 * @returns agent modules
 */
function getAskarAnonCredsIndyModules() {
  return {
    connections: new ConnectionsModule({
      autoAcceptConnections: true,
    }),

    credentials: new CredentialsModule({
      autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
      credentialProtocols: [
        new V2CredentialProtocol({
          credentialFormats: [new AnonCredsCredentialFormatService()],
        }),
      ],
    }),

    proofs: new ProofsModule({
      autoAcceptProofs: AutoAcceptProof.ContentApproved,
      proofProtocols: [
        new V2ProofProtocol({
          proofFormats: [new AnonCredsProofFormatService()],
        }),
      ],
    }),

    anoncreds: new AnonCredsModule({
      registries: [new IndyVdrAnonCredsRegistry()],
    }),

    anoncredsRs: new AnonCredsRsModule({
      anoncreds,
    }),

    indyVdr: new IndyVdrModule({
      indyVdr,
      networks: [localTestNetwork],
    }),

    dids: new DidsModule({
      registrars: [new IndyVdrIndyDidRegistrar()],
      resolvers: [new IndyVdrIndyDidResolver()],
    }),

    askar: new AskarModule({ ariesAskar }),
  } as const;
}

/**
 * Setup Alice agent.
 * It will listen and accept new credentials and proof requests.
 *
 * @returns Alice agent
 */
export async function createAliceAgent(): Promise<AnoncredAgent> {
  const agent = await setupAgent(ALICE_AGENT_NAME, ALICE_AGENT_PORT);
  setupAcceptingCredentialListener(agent);
  setupAcceptingProofListener(agent);
  return agent;
}

/**
 * Setup Issuer agent.
 * It will import endorser DID into wallet to be able to send transactions to the ledger.
 *
 * @returns Issuer agent
 */
export async function createIssuerAgent(): Promise<{
  agent: AnoncredAgent;
  did: string;
}> {
  const agent = await setupAgent(ISSUER_AGENT_NAME, ISSUER_AGENT_PORT);
  const did = await importExistingIndyDidFromPrivateKey(agent, ISSUER_DID_SEED);
  return {
    agent,
    did,
  };
}
