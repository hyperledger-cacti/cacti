import { PluginRegistry } from "@hyperledger/cactus-core";
import { IListenOptions, Servers } from "@hyperledger/cactus-common";
import { Constants, Configuration } from "@hyperledger/cactus-core-api";
import { ConfigUtil } from "@hyperledger/cactus-common-example-server";
import {
  PluginLedgerConnectorFabric,
  FabricApiClient,
  signProposal,
  FabricContractInvocationType,
  RunTransactionResponse,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import fs from "fs";
import http from "http";
import express from "express";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import { Identity, Wallets } from "fabric-network";
import { getLogger } from "log4js";
import { Server as SocketIoServer } from "socket.io";

const config: any = ConfigUtil.getConfig();
const moduleName = "fabric-connector";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const keychainId = uuidv4();

// Single Fabric connector instance
let fabricConnectorPlugin: PluginLedgerConnectorFabric | undefined = undefined;
let signerIdentity: FabricIdentity | undefined = undefined;
let fabricApiClient: FabricApiClient | undefined = undefined;

export type FabricIdentity = Identity & {
  credentials: {
    certificate: string;
    privateKey: string;
  };
};

// Prepare connection profile
// Fabric ledger should be running and it's config available in /etc/cactus/connector-fabric
const connectionProfile = {
  name: "test-network-org1",
  version: "1.0.0",
  client: {
    organization: "Org1",
    connection: { timeout: { peer: { endorser: "300" } } },
  },
  organizations: {
    Org1: {
      mspid: "Org1MSP",
      peers: ["peer0.org1.example.com"],
      certificateAuthorities: ["ca.org1.example.com"],
    },
  },
  peers: {
    "peer0.org1.example.com": {
      url: `grpcs://${config.assetTradeInfo.fabric.hostname}:7051`,
      tlsCACerts: {
        pem: fs.readFileSync(
          "/etc/cactus/connector-fabric/crypto-config/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem",
          "ascii",
        ),
      },
      grpcOptions: {
        "ssl-target-name-override": "peer0.org1.example.com",
        hostnameOverride: "peer0.org1.example.com",
      },
    },
  },
  certificateAuthorities: {
    "ca.org1.example.com": {
      url: `https://${config.assetTradeInfo.fabric.hostname}:7054`,
      caName: "ca-org1",
      tlsCACerts: {
        pem: fs.readFileSync(
          "/etc/cactus/connector-fabric/crypto-config/fabric-ca/org1/tls-cert.pem",
          "ascii",
        ),
      },
      httpOptions: { verify: false },
    },
  },
  orderers: {
    "orderer.example.com": {
      url: `grpcs://${config.assetTradeInfo.fabric.hostname}:7050`,
      grpcOptions: { "ssl-target-name-override": "orderer.example.com" },
      tlsCACerts: {
        pem: fs.readFileSync(
          "/etc/cactus/connector-fabric/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem",
          "ascii",
        ),
      },
    },
  },
  channels: {
    mychannel: {
      orderers: ["orderer.example.com"],
      peers: {
        "peer0.org1.example.com": {
          endorsingPeer: true,
          chaincodeQuery: true,
          ledgerQuery: true,
          eventSource: true,
          discover: true,
        },
      },
    },
  },
};
logger.debug("Use connection profile:", connectionProfile);

/**
 * Create signign token that will be verified in sign callback on connector side.
 * @param txId unique transaction data
 * @returns jwt token (string)
 */
export function createSigningToken(txId: string) {
  return jwt.sign(
    {
      data: txId,
    },
    config.assetTradeInfo.fabric.tokenSecret,
    { expiresIn: "1h" },
  );
}

/**
 * Verify if siging token is correct (i.e. was issued by this BLP).
 * To be used in fabric connector sign callback.
 *
 * @param token jwt signing token
 * @returns txId if correct, undefined otherwise.
 */
export function isValidSigningToken(token: string) {
  try {
    return jwt.verify(token, config.assetTradeInfo.fabric.tokenSecret);
  } catch (err) {
    logger.error("Invalid signing JWT token:", err);
    return undefined;
  }
}

/**
 * Read fabric Identity from wallet for specified user.
 *
 * @param user fabric user name
 * @returns `Identity`
 */
export async function getUserIdentity(user: string): Promise<FabricIdentity> {
  const wallet = await Wallets.newFileSystemWallet(
    config.assetTradeInfo.fabric.keystore,
  );

  const walletEntry = await wallet.get(user);
  if (walletEntry && walletEntry.type === "X.509") {
    return walletEntry as FabricIdentity;
  } else {
    throw new Error(
      `Could not add identiy for user ${user}. Wallet identity: ${walletEntry}`,
    );
  }
}

/**
 * Create new fabric connector instance
 */
async function createFabricConnector(signerIdentity: FabricIdentity) {
  if (fabricConnectorPlugin) {
    fabricConnectorPlugin.shutdown();
    fabricConnectorPlugin = undefined;
  }

  // Create empty Keychain Plugin
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId,
    logLevel: config.logLevel,
    backend: new Map(),
  });

  fabricConnectorPlugin = new PluginLedgerConnectorFabric({
    instanceId: `fabricAssetTrade-${uuidv4()}`,
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    sshConfig: {}, // Provide SSH config to deploy contracts through connector
    cliContainerEnv: {},
    peerBinary: "/fabric-samples/bin/peer",
    logLevel: config.logLevel,
    connectionProfile,
    discoveryOptions: {
      enabled: true,
      asLocalhost: true,
    },
    signCallback: async (payload, txData) => {
      // Will be called for each delegated sign endpoints to sign a request payload.
      const tokenData = isValidSigningToken(txData as string);
      if (tokenData) {
        logger.info("OK signing request for", tokenData);
        return signProposal(signerIdentity.credentials.privateKey, payload);
      } else {
        throw new Error("Invalid TX token!");
      }
    },
  });

  await fabricConnectorPlugin.onPluginInit();

  // Run http server
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const connectorServer = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 0,
    server: connectorServer,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const apiHost = `http://${addressInfo.address}:${addressInfo.port}`;

  // Run socketio server
  const socketioServer = new SocketIoServer(connectorServer, {
    path: Constants.SocketIoConnectionPathV1,
  });

  // Register services
  await fabricConnectorPlugin.getOrCreateWebServices();
  await fabricConnectorPlugin.registerWebServices(expressApp, socketioServer);

  // Create ApiClient
  const apiConfig = new Configuration({ basePath: apiHost });
  fabricApiClient = new FabricApiClient(apiConfig);
}

/**
 * Get first block data (number 0). Can be used to test fabric connection.
 */
async function getFirstBlock(): Promise<RunTransactionResponse> {
  if (!fabricConnectorPlugin) {
    throw new Error("getFirstBlock() called before initFabricConnector()!");
  }

  const queryResponse = await fabricConnectorPlugin.transactDelegatedSign({
    signerCertificate: getSignerIdentity().credentials.certificate,
    signerMspID: getSignerIdentity().mspId,
    channelName: config.assetTradeInfo.fabric.channelName,
    invocationType: FabricContractInvocationType.Call,
    contractName: "qscc",
    methodName: "GetBlockByNumber",
    params: [config.assetTradeInfo.fabric.channelName, "1"],
    uniqueTransactionData: createSigningToken("getFirstBlock"),
    endorsingPeers: ["peer0.org1.example.com"],
  });

  return queryResponse;
}

/**
 * Create fabric connector and check if connection can be established
 */
export async function initFabricConnector(): Promise<void> {
  if (!fabricConnectorPlugin) {
    const user = config.assetTradeInfo.fabric.submitter.name;
    signerIdentity = await getUserIdentity(user);
    logger.info(
      "Using signing identity for",
      user,
      "MspID",
      signerIdentity.mspId,
    );
    await createFabricConnector(signerIdentity);

    const firstBlockResponse = await getFirstBlock();
    if (!firstBlockResponse.functionOutput) {
      throw new Error(`Invalid getFirstBlock response: ${firstBlockResponse}`);
    }

    logger.info("initFabricConnector() done.");
  } else {
    logger.info("initFabricConnector() Fabric connector already initialized");
  }
}

/**
 * Get instance of fabric connector, initialize it if not done yet.
 */
export async function getFabricConnector(): Promise<PluginLedgerConnectorFabric> {
  if (!fabricConnectorPlugin) {
    await initFabricConnector();
  }

  if (fabricConnectorPlugin) {
    return fabricConnectorPlugin;
  } else {
    throw new Error("Could not initialize new fabric connector!");
  }
}

/**
 * Get instance of fabric api client.
 */
export function getFabricApiClient(): FabricApiClient {
  if (fabricApiClient) {
    return fabricApiClient;
  } else {
    throw new Error("Fabric connector not initialized yet!");
  }
}

/**
 * Get signer identity
 */
export function getSignerIdentity(): FabricIdentity {
  if (signerIdentity) {
    return signerIdentity;
  } else {
    throw new Error("Fabric connector not initialized yet!");
  }
}
