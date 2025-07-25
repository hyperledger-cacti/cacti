import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { Certificate } from "@fidm/x509";
import { Express } from "express";
import createHttpError from "http-errors";
import { RuntimeError } from "run-time-error-cjs";
import "multer";
import temp from "temp";
import { Config as SshConfig } from "node-ssh";
import type {
  Server as SocketIoServer,
  Socket as SocketIoSocket,
} from "socket.io";
import {
  DefaultEventHandlerOptions,
  DefaultEventHandlerStrategies,
  Gateway,
  GatewayOptions as FabricGatewayOptions,
  Wallets,
  X509Identity,
  TransientMap,
  Wallet,
  ContractEvent,
  ContractListener,
} from "fabric-network";
import {
  BuildProposalRequest,
  Channel,
  Client,
  IdentityContext,
  User,
  Endorser,
  ICryptoKey,
} from "fabric-common";
// BlockDecoder is not exported in ts definition so we need to use legacy import.
const { BlockDecoder } = require("fabric-common");
import fabricProtos from "fabric-protos";

import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
  IPluginWebService,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  consensusHasTransactionFinality,
  PluginRegistry,
} from "@hyperledger/cactus-core";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import OAS from "../json/openapi.json";

import {
  IRunTransactionEndpointV1Options,
  RunTransactionEndpointV1,
} from "./run-transaction/run-transaction-endpoint-v1";

import {
  IRunDelegatedSignTransactionEndpointV1Options,
  RunDelegatedSignTransactionEndpointV1,
} from "./run-transaction/run-delegated-sign-transaction-endpoint-v1";

import {
  IGetPrometheusExporterMetricsEndpointV1Options,
  GetPrometheusExporterMetricsEndpointV1,
} from "./get-prometheus-exporter-metrics/get-prometheus-exporter-metrics-endpoint-v1";

import { WatchBlocksV1Endpoint } from "./watch-blocks/watch-blocks-v1-endpoint";

import {
  ConnectionProfile,
  GatewayDiscoveryOptions,
  GatewayEventHandlerOptions,
  DeployContractV1Request,
  DeployContractV1Response,
  FabricContractInvocationType,
  RunTransactionRequest,
  RunTransactionResponse,
  ChainCodeProgrammingLanguage,
  ChainCodeLifeCycleCommandResponses,
  FabricSigningCredential,
  DefaultEventHandlerStrategy,
  FabricSigningCredentialType,
  GetTransactionReceiptResponse,
  GatewayOptions,
  GetBlockRequestV1,
  WatchBlocksV1,
  WatchBlocksOptionsV1,
  RunDelegatedSignTransactionRequest,
  RunTransactionResponseType,
  WatchBlocksDelegatedSignOptionsV1,
  GetBlockResponseTypeV1,
  GetBlockResponseV1,
  GetChainInfoRequestV1,
  GetChainInfoResponseV1,
  GetDiscoveryResultsRequestV1,
  GetDiscoveryResultsResponseV1,
} from "./generated/openapi/typescript-axios/index";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import { IQueryInstalledResponse } from "./peer/i-query-installed-response";
import { IQueryCommittedResponse } from "./peer/i-query-committed-response";
import {
  DeployContractEndpointV1,
  IDeployContractEndpointV1Options,
} from "./deploy-contract/deploy-contract-endpoint-v1";
import { sourceLangToRuntimeLang } from "./peer/source-lang-to-runtime-lang";
import FabricCAServices, {
  IEnrollmentRequest,
  IRegisterRequest,
} from "fabric-ca-client";
import { createGateway } from "./common/create-gateway";

import {
  IVaultConfig,
  IWebSocketConfig,
  SecureIdentityProviders,
  IIdentity,
} from "./identity/identity-provider";
import {
  CertDatastore,
  IIdentityData,
} from "./identity/internal/cert-datastore";
import { GetTransactionReceiptByTxIDEndpointV1 } from "./get-transaction-receipt/get-transaction-receipt-by-txid-endpoint-v1";
import {
  getTransactionReceiptByTxID,
  IGetTransactionReceiptByTxIDOptions,
} from "./common/get-transaction-receipt-by-tx-id";
import {
  formatCactiFullBlockResponse,
  formatCactiTransactionsBlockResponse,
} from "./get-block/cacti-block-formatters";

import { GetBlockEndpointV1 } from "./get-block/get-block-endpoint-v1";
import { GetChainInfoEndpointV1 } from "./get-chain-info/get-chain-info-endpoint-v1";
import { GetDiscoveryResultsEndpointV1 } from "./get-discovery-results/get-discovery-results-endpoint-v1";
import { querySystemChainCode } from "./common/query-system-chain-code";
import { isSshExecOk } from "./common/is-ssh-exec-ok";
import {
  asBuffer,
  assertFabricFunctionIsAvailable,
  CreateListenerRequest,
  FabricLong,
  fabricLongToNumber,
} from "./common/utils";
import { findAndReplaceFabricLoggingSpecArray } from "./common/find-and-replace-fabric-logging-spec";
import { Observable, ReplaySubject } from "rxjs";
import { CompilerTools } from "./compiler-tools/compiler-tools";
import tar from "tar-fs";

const { loadFromConfig } = require("fabric-network/lib/impl/ccp/networkconfig");
assertFabricFunctionIsAvailable(loadFromConfig, "loadFromConfig");

export interface IRunTxReqWithTxId {
  request: RunTransactionRequest;
  transactionId: string;
  timestamp: Date;
}

export type SignPayloadCallback = (
  payload: Buffer,
  txData: unknown,
) => Promise<Buffer>;

export interface IPluginLedgerConnectorFabricOptions
  extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  pluginRegistry: PluginRegistry;
  readonly sshDebugOn?: boolean;
  connectionProfile?: ConnectionProfile;
  connectionProfileB64?: string;
  prometheusExporter?: PrometheusExporter;
  discoveryOptions?: GatewayDiscoveryOptions;
  eventHandlerOptions?: GatewayEventHandlerOptions;
  supportedIdentity?: FabricSigningCredentialType[];
  vaultConfig?: IVaultConfig;
  webSocketConfig?: IWebSocketConfig;
  signCallback?: SignPayloadCallback;
  /**
   * Docker network name used by the Fabric Connector CLI container to communicate with the ledger.
   * This is especially relevant when testing with the fabricAIO image.
   */
  dockerNetworkName?: string;
}

export class PluginLedgerConnectorFabric
  implements
    IPluginLedgerConnector<
      DeployContractV1Request,
      DeployContractV1Response,
      RunTransactionRequest,
      RunTransactionResponse
    >,
    ICactusPlugin,
    IPluginWebService
{
  public static readonly CLASS_NAME = "PluginLedgerConnectorFabric";
  private readonly instanceId: string;
  private readonly log: Logger;
  private readonly connectionProfile: ConnectionProfile;
  public prometheusExporter: PrometheusExporter;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private readonly secureIdentity: SecureIdentityProviders;
  private readonly certStore: CertDatastore;
  private runningWatchBlocksMonitors = new Set<WatchBlocksV1Endpoint>();
  private txSubject: ReplaySubject<IRunTxReqWithTxId> = new ReplaySubject();

  private dockerNetworkName: string = "bridge";

  public get className(): string {
    return PluginLedgerConnectorFabric.CLASS_NAME;
  }

  /**
   * Callback used to sign fabric requests in methods that use delegated sign.
   */
  public signCallback: SignPayloadCallback | undefined;

  constructor(public readonly opts: IPluginLedgerConnectorFabricOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(opts.pluginRegistry, `${fnTag} options.pluginRegistry`);
    this.prometheusExporter =
      opts.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = opts.instanceId;
    this.prometheusExporter.startMetricsCollection();
    // default is supported if supportedIdentity is empty
    this.secureIdentity = new SecureIdentityProviders({
      activatedProviders: opts.supportedIdentity || [
        FabricSigningCredentialType.X509,
      ],
      logLevel: opts.logLevel || "INFO",
      vaultConfig: opts.vaultConfig,
      webSocketConfig: opts.webSocketConfig,
    });
    this.certStore = new CertDatastore(opts.pluginRegistry);

    if (this.opts.connectionProfile) {
      this.connectionProfile = this.opts.connectionProfile;
    } else if (this.opts.connectionProfileB64) {
      const connectionProfileBuffer = Buffer.from(
        this.opts.connectionProfileB64,
        "base64",
      );
      const connectionProfileString = connectionProfileBuffer.toString("utf-8");
      this.connectionProfile = JSON.parse(connectionProfileString);
    } else {
      throw new Error(
        "Cannot instantiate Fabric connector without connection profile.",
      );
    }
    if (opts.dockerNetworkName) {
      this.dockerNetworkName = opts.dockerNetworkName;
    }
    this.signCallback = opts.signCallback;
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public async shutdown(): Promise<void> {
    this.runningWatchBlocksMonitors.forEach((m) => m.close());
    this.runningWatchBlocksMonitors.clear();
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-fabric`;
  }

  public getTxSubjectObservable(): Observable<IRunTxReqWithTxId> {
    return this.txSubject.asObservable();
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public async getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    return ConsensusAlgorithmFamily.Authority;
  }
  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily =
      await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }

  private enableSshDebugLogs(cfg: SshConfig): SshConfig {
    const fnTag = `${this.className}#decorateSshConfigWithLogger()`;
    Checks.truthy(cfg, `${fnTag} cfg must be truthy.`);
    return {
      ...cfg,
      debug: (msg: unknown) => this.log.debug(`[NodeSSH] %o`, msg),
    };
  }

  /**
   * @param req The object containing all the necessary metadata and parameters
   * in order to have the contract deployed.
   */
  public async deployContract(
    req: DeployContractV1Request,
  ): Promise<DeployContractV1Response> {
    const fnTag = `${this.className}#deployContract()`;
    const { log } = this;

    const ccCompiler = new CompilerTools({
      logLevel: this.opts.logLevel,
      emitContainerLogs: true,
      dockerNetworkName: this.dockerNetworkName,
    });
    this.log.debug(`${fnTag} Starting CC Compiler container...`);
    await ccCompiler.start();
    this.log.debug(`${fnTag} CC Compiler container started OK.`);

    this.log.debug(`${fnTag} SSH connection to the peer OK.`);

    if (req.collectionsConfigFile) {
      log.debug(`Has private data collection definition`);
    }
    try {
      const {
        sourceFiles,
        ccName,
        ccLabel,
        ccVersion,
        ccLang,
        targetOrganizations,
        caFile,
        ccSequence,
        channelId,
        orderer,
        ordererTLSHostnameOverride,
        collectionsConfigFile,
        connTimeout,
        constructorArgs,
        signaturePolicy,
      } = req;

      Checks.truthy(sourceFiles, `${fnTag}:sourceFiles`);
      Checks.truthy(Array.isArray(sourceFiles), `${fnTag}:sourceFiles array`);

      let signaturePolicyCliArg = " ";
      if (signaturePolicy) {
        signaturePolicyCliArg = ` --signature-policy=${signaturePolicy} `;
      }

      let connTimeoutCliArg = " ";
      if (connTimeout) {
        connTimeoutCliArg = ` --connTimeout=${connTimeout}s `;
      }

      let initRequiredCliArg = " ";
      if (constructorArgs) {
        initRequiredCliArg = ` --init-required `;
      }

      if (targetOrganizations.length === 0) {
        throw new Error(
          `${fnTag}: No target organizations provided for chaincode deployment.`,
        );
      }

      temp.track();
      const certsPath = "hyperledger-cacti-certs";
      const tmpDirCertsPath = temp.mkdirSync(certsPath);
      this.log.debug(
        `${fnTag}: Creating temporary directory for certificates: ${tmpDirCertsPath}`,
      );

      fs.writeFileSync(path.join(tmpDirCertsPath, "ca.crt"), caFile);
      const targetPeersCmd: string[] = [];
      const targetOrganizationsWithPaths: {
        CORE_PEER_LOCALMSPID: string;
        CORE_PEER_ADDRESS: string;
        CORE_PEER_MSPCONFIGPATH: string;
        CORE_PEER_TLS_ROOTCERT_FILE: string;
        ORDERER_TLS_ROOTCERT_FILE: string;
      }[] = [];
      for (const targetOrg of targetOrganizations) {
        const {
          CORE_PEER_LOCALMSPID,
          CORE_PEER_ADDRESS,
          CORE_PEER_MSPCONFIG,
          CORE_PEER_TLS_ROOTCERT,
          ORDERER_TLS_ROOTCERT,
        } = targetOrg;
        fs.mkdirSync(path.join(tmpDirCertsPath, CORE_PEER_LOCALMSPID), {
          recursive: true,
        });
        fs.mkdirSync(
          path.join(tmpDirCertsPath, CORE_PEER_LOCALMSPID, CORE_PEER_ADDRESS),
          {
            recursive: true,
          },
        );

        for (const msConfigFile of CORE_PEER_MSPCONFIG) {
          const { filename, filepath, body } = msConfigFile;
          const relativePath = filepath || "./";
          const subDirPath = path.join(
            tmpDirCertsPath,
            CORE_PEER_LOCALMSPID,
            CORE_PEER_ADDRESS,
            "/msp",
            relativePath,
          );
          fs.mkdirSync(subDirPath, { recursive: true });
          const localFilePath = path.join(subDirPath, filename);
          fs.writeFileSync(localFilePath, body, "base64");
        }

        const corePeerTLSRootCertPath = path.join(
          tmpDirCertsPath,
          CORE_PEER_LOCALMSPID,
          CORE_PEER_ADDRESS,
          `${CORE_PEER_ADDRESS}.crt`,
        );

        fs.writeFileSync(corePeerTLSRootCertPath, CORE_PEER_TLS_ROOTCERT);
        fs.writeFileSync(
          path.join(tmpDirCertsPath, CORE_PEER_LOCALMSPID, "orderer.crt"),
          ORDERER_TLS_ROOTCERT,
        );
        targetPeersCmd.push("--peerAddresses");
        targetPeersCmd.push(CORE_PEER_ADDRESS);
        targetPeersCmd.push("--tlsRootCertFiles");
        targetPeersCmd.push(
          path.join(
            "./../",
            CORE_PEER_LOCALMSPID,
            CORE_PEER_ADDRESS,
            `${CORE_PEER_ADDRESS}.crt`,
          ),
        );
        targetOrganizationsWithPaths.push({
          CORE_PEER_LOCALMSPID,
          CORE_PEER_ADDRESS,
          CORE_PEER_MSPCONFIGPATH: path.join(
            "./",
            CORE_PEER_LOCALMSPID,
            CORE_PEER_ADDRESS,
            "/msp",
          ),
          CORE_PEER_TLS_ROOTCERT_FILE: path.join(
            "./",
            CORE_PEER_LOCALMSPID,
            CORE_PEER_ADDRESS,
            `${CORE_PEER_ADDRESS}.crt`,
          ),
          ORDERER_TLS_ROOTCERT_FILE: path.join(
            "./",
            CORE_PEER_LOCALMSPID,
            "orderer.crt",
          ),
        });
      }

      const certsTarStream = tar.pack(tmpDirCertsPath);
      await ccCompiler.getContainer().putArchive(certsTarStream, {
        path: "./",
      });

      log.debug(`${fnTag}: Copying core.yaml file to CLI container...`);
      const tmpDirCoreFile = `hyperledger-cacti-core-yaml`;
      const tmpDirCorePath = temp.mkdirSync(tmpDirCoreFile);
      const { body } = req.coreYamlFile;
      fs.writeFileSync(path.join(tmpDirCorePath, "core.yaml"), body, "base64");

      const pack = tar.pack(tmpDirCorePath);

      await ccCompiler.getContainer().putArchive(pack, {
        path: "./",
      });
      const tmpDirPrefix = `hyperledger-cacti-${this.className}`;
      const tmpDirPath = temp.mkdirSync(tmpDirPrefix);

      let collectionsConfigFileCliArg = " ";
      if (collectionsConfigFile) {
        this.log.debug(`Collections config: ${collectionsConfigFile}`);
        collectionsConfigFileCliArg = `--collections-config ${collectionsConfigFile} `;
      }

      for (const sourceFile of sourceFiles) {
        const { filename, filepath, body } = sourceFile;
        const relativePath = filepath || "./";
        const subDirPath = path.join(tmpDirPath, relativePath);
        fs.mkdirSync(subDirPath, { recursive: true });
        const localFilePath = path.join(subDirPath, filename);
        fs.writeFileSync(localFilePath, body, "base64");
      }

      const tarStream = tar.pack(tmpDirPath);
      await ccCompiler.getContainer().putArchive(tarStream, {
        path: "./chaincode",
      });

      if (ccLang === ChainCodeProgrammingLanguage.Golang) {
        this.log.debug(`${fnTag}: Compiling GO Chaincode...`);
        await ccCompiler.executeCommand({
          command: ["go", "mod", "vendor"],
          label: "Compiling GO Chain Code",
          env: ["GO111MODULE=on"],
        });
        this.log.debug(`${fnTag}: GO Chaincode compiled OK.`);
      } else if (ccLang === ChainCodeProgrammingLanguage.Typescript) {
        this.log.debug(`${fnTag}: Compiling Typescript Chaincode...`);

        this.log.debug(`${fnTag}:ChainCode: Typescript install dependencies`);
        await ccCompiler.executeCommand({
          command: ["npm", "install"],
          label: "NPM Install Chain Code",
        });

        this.log.debug(`${fnTag}:ChainCode: Typescript build`);
        await ccCompiler.executeCommand({
          command: ["npm", "run", "build"],
          label: "NPM Build Chain Code",
        });

        this.log.debug(`${fnTag}: Typescript Chaincode compiled OK.`);
      } else if (ccLang === ChainCodeProgrammingLanguage.Javascript) {
        this.log.debug(`${fnTag}: Compiling Javascript Chaincode...`);
        this.log.debug(
          `${fnTag}:ChainCode: Javascript does not need compilation`,
        );
      }
      //TODO: Implement JAVA cc support
      else {
        throw new Error(`${fnTag}: Unsupported chain code language: ${ccLang}`);
      }

      const lifecycle: ChainCodeLifeCycleCommandResponses = {
        approveForMyOrgList: [],
        installList: [],
        queryInstalledList: [],
      };
      const packageIds: string[] = [];

      // Commands executed here are based on the deployCC.sh script in the fabric-samples
      // repository
      // https://github.com/hyperledger/fabric-samples/blob/14dc7e13160ef1b7332bafb01f8ffa865116f9e7/test-network/scripts/deployCC.sh
      {
        const runtimeLang = sourceLangToRuntimeLang(ccLang);

        const execCmd = [
          "peer",
          "lifecycle",
          "chaincode",
          "package",
          `${ccName}.tar.gz`,
          "--path",
          "./",
          "--label",
          ccLabel,
          "--lang",
          runtimeLang,
        ];

        const res = await ccCompiler.executeCommand({
          command: execCmd,
          label: "Peer Package ChainCode",
          env: ["FABRIC_CFG_PATH=./.."], // Ensure the peer command can find the core.yaml
        });
        lifecycle.packaging = res;
      }

      // https://github.com/hyperledger/fabric-samples/blob/release-1.4/fabcar/startFabric.sh
      for (const org of targetOrganizationsWithPaths) {
        const dockerExecEnv = Object.entries(org).map(
          ([key, val]) => `${key}=${val}`,
        );

        const cmd = [
          "peer",
          "lifecycle",
          "chaincode",
          "install",
          `${ccName}.tar.gz`,
          connTimeoutCliArg,
        ];

        const label = `Install ChainCode in ${org.CORE_PEER_LOCALMSPID}`;
        const res = await ccCompiler.executeCommand({
          command: cmd,
          label,
          env: [
            "FABRIC_CFG_PATH=./..",
            "GO111MODULE=on",
            ...dockerExecEnv,
            "CORE_PEER_TLS_ENABLED=true", //TODO check if this is needs to be configurable
          ], // Ensure the peer command can find the core.yaml
        });
        lifecycle.installList.push(res);

        let packageId: string;
        {
          const cmd = [
            "peer",
            "lifecycle",
            "chaincode",
            "queryinstalled",
            "--output",
            "json",
          ];

          const label = `query installed contracts CMD`;
          const res = await ccCompiler.executeCommand({
            command: cmd,
            label: label,
            env: [
              "FABRIC_CFG_PATH=./..",
              // Need to make sure that the logging is turned off otherwise it
              // mangles the JSON syntax and makes the output invalid...
              ...findAndReplaceFabricLoggingSpecArray(dockerExecEnv, "ERROR"),
              "CORE_PEER_TLS_ENABLED=true",
            ], // Ensure the peer command can find the core.yaml
          });
          lifecycle.queryInstalledList.push(res);

          Checks.truthy(res.stdout.includes(ccLabel));
          const json = res.stdout;
          const qir = JSON.parse(json) as IQueryInstalledResponse;
          const icc = qir.installed_chaincodes.find(
            (chainCode) => chainCode.label === ccLabel,
          );
          this.log.debug(`Parsed list of installed contracts: %o`, qir);
          Checks.truthy(icc, "No installed chaincode with label: %o", ccLabel);
          if (!icc?.package_id) {
            throw new Error(`${fnTag}: package ID falsy. Something's wrong.`);
          }
          packageId = icc?.package_id;
          this.log.debug(`Found package ID: ${packageId}`);
          packageIds.push(packageId);
        }
        {
          const cmd = [
            "peer",
            "lifecycle",
            "chaincode",
            "approveformyorg",
            "--orderer",
            orderer,
            "--ordererTLSHostnameOverride",
            ordererTLSHostnameOverride,
            "--tls",
            "--cafile",
            "./ca.crt", // This is the CA cert we copied to the CLI container earlier
            "--channelID",
            channelId,
            "--name",
            ccName,
            "--version",
            ccVersion,
            "--package-id",
            packageId,
            "--sequence",
            ccSequence.toString(),
            signaturePolicyCliArg.trim(),
            ...collectionsConfigFileCliArg.split(" "),
            initRequiredCliArg.trim(),
            connTimeoutCliArg.trim(),
          ];

          const cmdLabel = `Install ChainCode in ${org.CORE_PEER_LOCALMSPID}`;

          const res = await ccCompiler.executeCommand({
            command: cmd,
            label: cmdLabel,
            env: [
              "FABRIC_CFG_PATH=./..",
              ...dockerExecEnv,
              "CORE_PEER_TLS_ENABLED=true",
            ], // Ensure the peer command can find the core.yaml
          });
          lifecycle.approveForMyOrgList.push(res);
        }
      }

      let success = true;
      const dockerExecEnv = Object.entries(targetOrganizationsWithPaths[0]).map(
        //TODO: check a better way to do this, to use the targetOrg things
        ([key, val]) => `${key}=${val}`,
      );

      const commitCmd = [
        "peer",
        "lifecycle",
        "chaincode",
        "commit",
        "--name",
        ccName,
        "--version",
        ccVersion,
        "--channelID",
        channelId,
        "--orderer",
        orderer,
        "--ordererTLSHostnameOverride",
        ordererTLSHostnameOverride,
        "--tls",
        "--cafile",
        "./ca.crt", // This is the CA cert we copied to the CLI container earlier
        ...targetPeersCmd,
        `--sequence=${ccSequence}`,
        initRequiredCliArg.trim(),
        connTimeoutCliArg.trim(),
        ...collectionsConfigFileCliArg.split(" "),
        signaturePolicyCliArg.trim(),
      ];

      {
        const res = await ccCompiler.executeCommand({
          command: commitCmd,
          env: [
            "FABRIC_CFG_PATH=./..",
            ...dockerExecEnv,
            "CORE_PEER_TLS_ENABLED=true",
          ], // Ensure the peer command can find the core.yaml
          label: "Commit",
        });
        lifecycle.commit = res;
        success = success && isSshExecOk(res);
      }

      {
        const cmd = [
          "peer",
          "lifecycle",
          "chaincode",
          "querycommitted",
          "--channelID",
          channelId,
          "--output",
          "json",
        ];
        const label = `query committed contracts`;
        const res = await ccCompiler.executeCommand({
          command: cmd,
          env: [
            "FABRIC_CFG_PATH=./..",
            ...findAndReplaceFabricLoggingSpecArray(dockerExecEnv, "ERROR"),
            "CORE_PEER_TLS_ENABLED=true",
          ], // Ensure the peer command can find the core.yaml
          label: label,
        });
        lifecycle.queryCommitted = res;

        Checks.truthy(res.stdout.includes(ccName), "stdout has contract name");
        const json = res.stdout;
        const qcr = JSON.parse(json) as IQueryCommittedResponse;
        const ccd = qcr.chaincode_definitions.find(
          (ccd) => ccd.name === ccName && ccd.version === ccVersion,
        );

        this.log.debug(`Parsed list of installed contracts: %o`, qcr);
        Checks.truthy(ccd, "No installed chaincode with label: %o", ccLabel);
      }

      log.debug(`EXIT doDeploy()`);
      const res: DeployContractV1Response = {
        success,
        packageIds,
        lifecycle,
      };
      return res;
    } finally {
      try {
      } finally {
        await ccCompiler.stop();
        temp.cleanup();
      }
    }
  }

  /**
   * Register WatchBlocksV1 endpoint, will be triggered in response to
   * dedicated socketio request.
   *
   * Adds and removes monitors from `this.runningWatchBlocksMonitors`.
   *
   * @param socket connected client socket.
   * @returns socket from argument.
   */
  private registerWatchBlocksSocketIOEndpoint(
    socket: SocketIoSocket,
  ): SocketIoSocket {
    this.log.debug("Register WatchBlocks.Subscribe handler.");

    socket.on(
      WatchBlocksV1.Subscribe,
      async (options: WatchBlocksOptionsV1) => {
        // Start monitoring
        const monitor = new WatchBlocksV1Endpoint({
          socket,
          logLevel: this.opts.logLevel,
        });
        this.runningWatchBlocksMonitors.add(monitor);
        await monitor.subscribe(
          options,
          await this.createGatewayWithOptions(options.gatewayOptions),
        );
        this.log.debug(
          "Running monitors count:",
          this.runningWatchBlocksMonitors.size,
        );

        socket.on("disconnect", () => {
          this.runningWatchBlocksMonitors.delete(monitor);
          this.log.debug(
            "Running monitors count:",
            this.runningWatchBlocksMonitors.size,
          );
        });
      },
    );

    socket.on(
      WatchBlocksV1.SubscribeDelegatedSign,
      async (options: WatchBlocksDelegatedSignOptionsV1) => {
        if (!this.signCallback) {
          socket.emit(WatchBlocksV1.Error, {
            code: 500,
            errorMessage:
              "WatchBlocksDelegatedSignOptionsV1 called but signCallback is missing!",
          });
          return;
        }

        // Start monitoring
        const monitor = new WatchBlocksV1Endpoint({
          socket,
          logLevel: this.opts.logLevel,
        });
        this.runningWatchBlocksMonitors.add(monitor);

        const { channel, userIdCtx } = await this.getFabricClientWithoutSigner(
          options.channelName,
          options.signerCertificate,
          options.signerMspID,
          options.uniqueTransactionData,
        );

        await monitor.SubscribeDelegatedSign(
          options,
          channel,
          userIdCtx,
          this.signCallback.bind(this),
        );
        this.log.debug(
          "Running monitors count:",
          this.runningWatchBlocksMonitors.size,
        );

        socket.on("disconnect", () => {
          this.runningWatchBlocksMonitors.delete(monitor);
          this.log.debug(
            "Running monitors count:",
            this.runningWatchBlocksMonitors.size,
          );
        });
      },
    );

    return socket;
  }

  /**
   * Register HTTP and SocketIO service endpoints.
   *
   * @param app express server.
   * @param wsApi socketio server.
   * @returns list of http endpoints.
   */
  async registerWebServices(
    app: Express,
    wsApi?: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));

    if (wsApi) {
      wsApi.on("connection", (socket: SocketIoSocket) => {
        this.log.debug(`New Socket connected. ID=${socket.id}`);
        this.registerWatchBlocksSocketIOEndpoint(socket);
      });
    }

    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const { log } = this;

    log.info(`Installing web services for plugin ${this.getPackageName()}...`);

    const endpoints: IWebServiceEndpoint[] = [];

    {
      const opts: IDeployContractEndpointV1Options = {
        connector: this,
        logLevel: this.opts.logLevel,
      };
      const endpoint = new DeployContractEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IRunTransactionEndpointV1Options = {
        connector: this,
        logLevel: this.opts.logLevel,
      };
      const endpoint = new RunTransactionEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IRunDelegatedSignTransactionEndpointV1Options = {
        connector: this,
        logLevel: this.opts.logLevel,
      };
      const endpoint = new RunDelegatedSignTransactionEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IRunTransactionEndpointV1Options = {
        connector: this,
        logLevel: this.opts.logLevel,
      };
      const endpoint = new GetTransactionReceiptByTxIDEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const endpoint = new GetBlockEndpointV1({
        connector: this,
        logLevel: this.opts.logLevel,
      });
      endpoints.push(endpoint);
    }

    {
      const endpoint = new GetChainInfoEndpointV1({
        connector: this,
        logLevel: this.opts.logLevel,
      });
      endpoints.push(endpoint);
    }

    {
      const endpoint = new GetDiscoveryResultsEndpointV1({
        connector: this,
        logLevel: this.opts.logLevel,
      });
      endpoints.push(endpoint);
    }

    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        connector: this,
        logLevel: this.opts.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoints.push(endpoint);
    }

    const pkg = this.getPackageName();
    log.info(`Installed web services for plugin ${pkg} OK`, { endpoints });

    return endpoints;
  }

  /**
   * Create gateway from request (will choose logic based on request)
   *
   * @node It seems that Gateway is not supposed to be created and destroyed rapidly, but
   * rather kept around for longer. Possible issues:
   *  - Disconnect is async and takes a while until all internal services are closed.
   *  - Possible memory and connection pool leak (see https://github.com/hyperledger/fabric-sdk-node/issues/529).
   *  - Performance: there's a setup overhead that might be significant after scaling up. Hence...
   * @todo Cache and reuse gateways (destroy only ones not used for a while).
   * Or maybe add separate methods "start/stopSession" that would leave session management to the client?
   *
   * @param req must contain either gatewayOptions or signingCredential.
   * @returns Fabric SDK Gateway
   */
  protected async createGateway(req: {
    gatewayOptions?: GatewayOptions;
    signingCredential?: FabricSigningCredential;
  }): Promise<Gateway> {
    if (req.gatewayOptions) {
      return this.createGatewayWithOptions(req.gatewayOptions);
    } else if (req.signingCredential) {
      return this.createGatewayLegacy(req.signingCredential);
    } else {
      throw new Error("Missing either gatewayOptions or signingCredential");
    }
  }

  /**
   * Create Gateway from dedicated gateway options.
   *
   * @param options gateway options
   * @returns Fabric SDK Gateway
   */
  protected async createGatewayWithOptions(
    options: GatewayOptions,
  ): Promise<Gateway> {
    return createGateway({
      logLevel: this.opts.logLevel,
      pluginRegistry: this.opts.pluginRegistry,
      defaultConnectionProfile: this.connectionProfile,
      defaultDiscoveryOptions: this.opts.discoveryOptions || {
        enabled: true,
        asLocalhost: true,
      },
      defaultEventHandlerOptions: this.opts.eventHandlerOptions || {
        endorseTimeout: 300,
        commitTimeout: 300,
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
      },
      gatewayOptions: options,
      secureIdentity: this.secureIdentity,
      certStore: this.certStore,
    });
  }

  /**
   * Create Gateway from signing credential (legacy, can be done with gateway options)
   *
   * @param signingCredential sign data.
   * @returns Fabric SDK Gateway
   */
  protected async createGatewayLegacy(
    signingCredential: FabricSigningCredential,
  ): Promise<Gateway> {
    const { eventHandlerOptions: eho } = this.opts;
    const connectionProfile = this.connectionProfile;

    const iType = signingCredential.type || FabricSigningCredentialType.X509;

    const certData = await this.certStore.get(
      signingCredential.keychainId,
      signingCredential.keychainRef,
    );
    if (iType !== certData.type) {
      throw new Error(
        `identity type mismatch, sorted of type = ${certData.type} but provided = ${iType}`,
      );
    }
    let key: ICryptoKey;
    switch (iType) {
      case FabricSigningCredentialType.VaultX509:
        if (!signingCredential.vaultTransitKey) {
          throw new Error(`require signingCredential.vaultTransitKey`);
        }
        key = this.secureIdentity.getVaultKey({
          token: signingCredential.vaultTransitKey.token,
          keyName: signingCredential.vaultTransitKey.keyName,
        });
        break;
      case FabricSigningCredentialType.WsX509:
        if (!signingCredential.webSocketKey) {
          throw new Error(`require signingCredential.webSocketKey`);
        }
        key = this.secureIdentity.getWebSocketKey({
          sessionId: signingCredential.webSocketKey.sessionId,
          signature: signingCredential.webSocketKey.signature,
        });
        break;
      case FabricSigningCredentialType.X509:
        key = this.secureIdentity.getDefaultKey({
          private: certData.credentials.privateKey as string,
        });
        break;
      default:
        throw new Error(`UNRECOGNIZED_IDENTITY_TYPE type = ${iType}`);
    }
    const identity: IIdentity = {
      type: iType,
      mspId: certData.mspId,
      credentials: {
        certificate: certData.credentials.certificate,
        key: key,
      },
    };

    const eventHandlerOptions: DefaultEventHandlerOptions = {
      commitTimeout: this.opts.eventHandlerOptions?.commitTimeout || 300,
      endorseTimeout: 300,
    };
    if (eho?.strategy) {
      eventHandlerOptions.strategy =
        DefaultEventHandlerStrategies[eho.strategy];
    }

    const gatewayOptions: FabricGatewayOptions = {
      discovery: this.opts.discoveryOptions,
      eventHandlerOptions,
      identity: identity,
      identityProvider: this.secureIdentity,
    };

    this.log.debug(`discovery=%o`, gatewayOptions.discovery);
    this.log.debug(`eventHandlerOptions=%o`, eventHandlerOptions);

    const gateway = new Gateway();

    await gateway.connect(
      connectionProfile as ConnectionProfile,
      gatewayOptions,
    );

    this.log.debug("transact() gateway connection established OK");

    return gateway;
  }

  /**
   * Common method for converting `Buffer` response from running transaction
   * into type specified in input `RunTransactionResponseType` field.
   *
   * @param data transaction response
   * @param responseType target type format
   * @returns converted data (string)
   */
  private convertToTransactionResponseType(
    data: Buffer,
    responseType?: RunTransactionResponseType,
  ): string {
    switch (responseType) {
      case RunTransactionResponseType.JSON:
        return JSON.stringify(data);
      case RunTransactionResponseType.UTF8:
      default:
        return data.toString("utf-8");
    }
  }

  /**
   * Filter endorsers by peers
   *
   * @param endorsingPeers list of endorsers to use (name or url).
   * @param allEndorsers list of all endorsing peers detected.
   * @returns filtered list of endorser objects.
   */
  private filterEndorsingPeers(
    endorsingPeers: string[],
    allEndorsers: Endorser[],
  ) {
    return allEndorsers.filter((e) => {
      const looseEndpoint = e.endpoint as any;
      return (
        endorsingPeers.includes(e.name) ||
        endorsingPeers.includes(looseEndpoint.url) ||
        endorsingPeers.includes(looseEndpoint.addr)
      );
    });
  }

  /**
   * Filter endorsers by organization.
   *
   * @param endorsingOrgs list of endorser organizations to use (mspid or org name on certificate).
   * @param allEndorsers list of all endorsing peers detected.
   * @returns filtered list of endorser objects.
   */
  private filterEndorsingOrgs(
    endorsingOrgs: string[],
    allEndorsers: Endorser[],
  ) {
    const allEndorsersLoose = allEndorsers as unknown as Array<
      Endorser & { options: { pem: string } }
    >;

    return allEndorsersLoose
      .map((endorser) => {
        const certificate = Certificate.fromPEM(
          endorser.options.pem as unknown as Buffer,
        );
        return { certificate, endorser };
      })
      .filter(
        ({ endorser, certificate }) =>
          endorsingOrgs.includes(endorser.mspid) ||
          endorsingOrgs.includes(certificate.issuer.organizationName),
      )
      .map((it) => it.endorser);
  }

  /**
   * Filter endorsers by both peers and organizations
   * @param allEndorsers list of all endorsing peers detected.
   * @param endorsingPeers list of endorsers to use (name or url).
   * @param endorsingOrgs list of endorser organizations to use (mspid or org name on certificate).
   * @returns filtered list of endorser objects.
   */
  private filterEndorsers(
    allEndorsers: Endorser[],
    endorsingPeers?: string[],
    endorsingOrgs?: string[],
  ) {
    const toEndorserNames = (e: Endorser[]) => e.map((v) => v.name);
    this.log.debug("Endorsing targets:", toEndorserNames(allEndorsers));

    if (endorsingPeers) {
      allEndorsers = this.filterEndorsingPeers(endorsingPeers, allEndorsers);
      this.log.debug(
        "Endorsing targets after peer filtering:",
        toEndorserNames(allEndorsers),
      );
    }

    if (endorsingOrgs) {
      allEndorsers = this.filterEndorsingOrgs(endorsingOrgs, allEndorsers);
      this.log.debug(
        "Endorsing targets after org filtering:",
        toEndorserNames(allEndorsers),
      );
    }

    return allEndorsers;
  }

  /**
   * Convert transient data from input into transient map (used in private transactions)
   *
   * @param transientData transient data from request
   * @returns correct TransientMap
   */
  private toTransientMap(transientData?: unknown): TransientMap {
    const transientMap = transientData as TransientMap;

    try {
      //Obtains and parses each component of transient data
      for (const key in transientMap) {
        transientMap[key] = Buffer.from(JSON.stringify(transientMap[key]));
      }
    } catch (ex) {
      this.log.error(`Building transient map crashed: `, ex);
      throw new Error(`Unable to build the transient map: ${ex.message}`);
    }

    return transientMap;
  }

  public async transact(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transact()`;
    this.log.debug("%s ENTER", fnTag);

    const {
      channelName,
      contractName,
      invocationType,
      methodName: fnName,
      params,
      transientData,
      responseType: responseType,
    } = req;

    try {
      this.log.debug("%s Creating Fabric Gateway instance...", fnTag);
      const gateway = await this.createGateway(req);
      this.log.debug("%s Obtaining Fabric gateway network instance...", fnTag);
      const network = await gateway.getNetwork(channelName);
      this.log.debug("%s Obtaining Fabric contract instance...", fnTag);
      const contract = network.getContract(contractName);
      const channel = network.getChannel();
      const endorsingTargets = this.filterEndorsers(
        channel.getEndorsers(),
        req.endorsingPeers,
        req.endorsingOrgs,
      );

      const endorsers = channel.getEndorsers();

      const endorsersMetadata = endorsers.map((x) => ({
        mspid: x.mspid,
        discovered: x.discovered,
        endpoint: x.endpoint,
        name: x.name,
        hasChaincode: x.hasChaincode(contractName),
        isTLS: x.isTLS(),
      }));
      this.log.debug("%s Endorsers metadata: %o", fnTag, endorsersMetadata);

      let out: Buffer;
      let transactionId = "";
      switch (invocationType) {
        case FabricContractInvocationType.Call: {
          out = await contract
            .createTransaction(fnName)
            .setEndorsingPeers(endorsingTargets)
            .evaluate(...params);
          break;
        }
        case FabricContractInvocationType.Send: {
          this.log.debug("%s Creating tx instance on %s", fnTag, contractName);
          this.log.debug("%s Endorsing peers: %o", fnTag, req.endorsingPeers);
          const tx = contract.createTransaction(fnName);
          tx.setEndorsingPeers(endorsingTargets);
          this.log.debug("%s Submitting TX... (%o)", fnTag, params);
          out = await tx.submit(...params);
          this.log.debug("%s Submitted TX OK (%o)", fnTag, params);
          transactionId = tx.getTransactionId();
          this.log.debug("%s Obtained TX ID OK (%s)", fnTag, transactionId);
          break;
        }
        case FabricContractInvocationType.Sendprivate: {
          if (!transientData) {
            const message =
              "Set transaction to send Transient Data but it was not provided";
            throw new Error(`${fnTag} ${message}`);
          }

          const transientMap = this.toTransientMap(req.transientData);
          const transactionProposal = await contract.createTransaction(fnName);
          transactionProposal.setEndorsingPeers(endorsingTargets);
          out = await transactionProposal.setTransient(transientMap).submit();
          transactionId = transactionProposal.getTransactionId();
          break;
        }
        default: {
          const message = `FabricContractInvocationType: ${invocationType}`;
          throw new Error(`${fnTag} unknown ${message}`);
        }
      }

      // create IRunTxReqWithTxId for transaction monitoring
      const receiptData: IRunTxReqWithTxId = {
        request: req,
        transactionId: transactionId == "" ? uuidv4() : transactionId,
        timestamp: new Date(),
      };
      this.log.debug(
        `IRunTxReqWithTxId created with ID: ${receiptData.transactionId}`,
      );
      this.txSubject.next(receiptData);

      const res: RunTransactionResponse = {
        functionOutput: this.convertToTransactionResponseType(
          out,
          responseType,
        ),
        transactionId: transactionId,
      };
      gateway.disconnect();
      this.log.debug(`transact() response: %o`, res);
      this.prometheusExporter.addCurrentTransaction();

      return res;
    } catch (ex) {
      this.log.error(`transact() crashed: `, ex);
      throw new Error(`${fnTag} Unable to run transaction: ${ex.message}`);
    }
  }

  public async getTransactionReceiptByTxID(
    req: RunTransactionRequest,
  ): Promise<GetTransactionReceiptResponse> {
    const gateway = await this.createGateway(req);
    const options: IGetTransactionReceiptByTxIDOptions = {
      channelName: req.channelName,
      params: req.params,
      gateway: gateway,
    };
    return await getTransactionReceiptByTxID(options);
  }

  /**
   * @param caId The key of the CA in the Fabric connection profile's
   * `certificateAuthorities` attribute.
   * @returns The instantiated `FabricCAServices` object.
   */
  public async createCaClient(caId: string): Promise<FabricCAServices> {
    const fnTag = `${this.className}#createCaClient()`;
    try {
      const ccp = this.connectionProfile;
      if (!ccp.certificateAuthorities) {
        throw new Error(`${fnTag} conn. profile certificateAuthorities falsy.`);
      }
      const caInfo = ccp.certificateAuthorities[caId] as Record<string, any>;
      const { tlsCACerts, url: caUrl, caName } = caInfo;
      const { pem: caTLSCACertPem } = tlsCACerts;
      const tlsOptions = { trustedRoots: caTLSCACertPem, verify: false };
      this.log.debug(`createCaClient() caName=%o caUrl=%o`, caName, caUrl);
      this.log.debug(`createCaClient() tlsOptions=%o`, tlsOptions);
      return new FabricCAServices(caUrl, tlsOptions, caName);
    } catch (ex) {
      this.log.error(`createCaClient() Failure:`, ex);
      throw new Error(`${fnTag} Inner Exception: ${ex?.message}`);
    }
  }

  public async enrollAdmin(
    caId: string,
    identityId: string,
    mspId: string,
    enrollmentID: string,
    enrollmentSecret: string,
  ): Promise<[X509Identity, Wallet]> {
    const fnTag = `${this.className}#enrollAdmin()`;
    try {
      const ca = await this.createCaClient(caId);
      const wallet = await Wallets.newInMemoryWallet();

      // Enroll the admin user, and import the new identity into the wallet.
      const request = { enrollmentID, enrollmentSecret };
      const enrollment = await ca.enroll(request);

      const { certificate, key } = enrollment;
      const keyBytes = key.toBytes();

      const x509Identity: X509Identity = {
        credentials: {
          certificate,
          privateKey: keyBytes,
        },
        mspId,
        type: "X.509",
      };
      await wallet.put(identityId, x509Identity);

      return [x509Identity, wallet];
    } catch (ex) {
      this.log.error(`enrollAdmin() Failure:`, ex);
      throw new Error(`${fnTag} Exception: ${ex?.message}`);
    }
  }
  /**
   * @description enroll a client and store the enrolled certificate inside keychain
   * @param identity details about client's key
   * @param request , enroll request for fabric-ca-server
   */
  public async enroll(
    identity: FabricSigningCredential,
    request: {
      enrollmentID: string;
      enrollmentSecret: string;
      caId: string;
      mspId: string;
    },
  ): Promise<void> {
    const fnTag = `${this.className}#enroll`;
    const iType = identity.type || FabricSigningCredentialType.X509;
    this.log.debug(
      `${fnTag} enroll identity of type = ${iType} with ca = ${request.caId}`,
    );
    Checks.nonBlankString(identity.keychainId, `${fnTag} identity.keychainId`);
    Checks.nonBlankString(
      identity.keychainRef,
      `${fnTag} identity.keychainRef`,
    );
    Checks.nonBlankString(request.mspId, `${fnTag} request.mspId`);
    const ca = await this.createCaClient(request.caId);
    const enrollmentRequest: IEnrollmentRequest = {
      enrollmentID: request.enrollmentID,
      enrollmentSecret: request.enrollmentSecret,
    };
    let key;
    switch (iType) {
      case FabricSigningCredentialType.VaultX509:
        if (!identity.vaultTransitKey) {
          throw new Error(`${fnTag} require identity.vaultTransitKey`);
        }
        key = this.secureIdentity.getVaultKey({
          token: identity.vaultTransitKey.token,
          keyName: identity.vaultTransitKey.keyName,
        });
        enrollmentRequest.csr = await key.generateCSR(request.enrollmentID);
        break;
      case FabricSigningCredentialType.WsX509:
        if (!identity.webSocketKey) {
          throw new Error(`${fnTag} require identity.webSocketKey`);
        }
        key = this.secureIdentity.getWebSocketKey({
          sessionId: identity.webSocketKey.sessionId,
          signature: identity.webSocketKey.signature,
        });
        enrollmentRequest.csr = await key.generateCSR(request.enrollmentID);
        break;
    }
    const resp = await ca.enroll(enrollmentRequest);
    const certData: IIdentityData = {
      type: iType,
      mspId: request.mspId,
      credentials: {
        certificate: resp.certificate,
      },
    };
    if (resp.key) {
      certData.credentials.privateKey = resp.key.toBytes();
    }
    await this.certStore.put(
      identity.keychainId,
      identity.keychainRef,
      certData,
    );
  }

  public async register(
    registrar: FabricSigningCredential,
    request: IRegisterRequest,
    caId: string,
  ): Promise<string> {
    const fnTag = `${this.className}#register`;
    const iType = registrar.type || FabricSigningCredentialType.X509;
    this.log.debug(
      `${fnTag} register client using registrar identity of type = ${iType}`,
    );
    Checks.nonBlankString(
      registrar.keychainId,
      `${fnTag} registrar.keychainId`,
    );
    Checks.nonBlankString(
      registrar.keychainRef,
      `${fnTag} registrar.keychainRef`,
    );
    const certData = await this.certStore.get(
      registrar.keychainId,
      registrar.keychainRef,
    );
    if (certData.type != iType) {
      throw new Error(
        `${fnTag} identity type mismatch, stored ${certData.type} but provided ${iType}`,
      );
    }
    let key: ICryptoKey;
    switch (iType) {
      case FabricSigningCredentialType.X509:
        key = this.secureIdentity.getDefaultKey({
          private: certData.credentials.privateKey as string,
        });
        break;
      case FabricSigningCredentialType.VaultX509:
        if (!registrar.vaultTransitKey) {
          throw new Error(`${fnTag} require registrar.vaultTransitKey`);
        }
        key = this.secureIdentity.getVaultKey({
          token: registrar.vaultTransitKey.token,
          keyName: registrar.vaultTransitKey.keyName,
        });
        break;
      case FabricSigningCredentialType.WsX509:
        if (!registrar.webSocketKey) {
          throw new Error(`${fnTag} require registrar.webSocketKey`);
        }
        key = this.secureIdentity.getWebSocketKey({
          sessionId: registrar.webSocketKey.sessionId,
          signature: registrar.webSocketKey.signature,
        });
        break;
      default:
        throw new Error(`${fnTag} UNRECOGNIZED_IDENTITY_TYPE type = ${iType}`);
    }
    const user = await this.secureIdentity.getUserContext(
      {
        type: iType,
        credentials: {
          certificate: certData.credentials.certificate,
          key: key,
        },
        mspId: certData.mspId,
      },
      "registrar",
    );

    const ca = await this.createCaClient(caId);
    return await ca.register(request, user);
  }

  /**
   * @description re-enroll a client with new private key
   * @param identity
   */
  public async rotateKey(
    identity: FabricSigningCredential,
    request: {
      enrollmentID: string;
      enrollmentSecret: string;
      caId: string;
    },
  ): Promise<void> {
    const fnTag = `${this.className}#rotateKey`;
    const iType = identity.type || FabricSigningCredentialType.X509;
    this.log.debug(
      `${fnTag} identity of type = ${iType} with ca = ${request.caId}`,
    );
    this.log.debug(
      `${fnTag} enroll identity of type = ${iType} with ca = ${request.caId}`,
    );
    Checks.nonBlankString(identity.keychainId, `${fnTag} identity.keychainId`);
    Checks.nonBlankString(
      identity.keychainRef,
      `${fnTag} identity.keychainRef`,
    );
    const certData = await this.certStore.get(
      identity.keychainId,
      identity.keychainRef,
    );
    switch (iType) {
      case FabricSigningCredentialType.VaultX509:
        if (!identity.vaultTransitKey) {
          throw new Error(`${fnTag} require identity.vaultTransitKey)`);
        }
        const key = this.secureIdentity.getVaultKey({
          keyName: identity.vaultTransitKey.keyName,
          token: identity.vaultTransitKey.token,
        });
        await key.rotate();
        break;
      case FabricSigningCredentialType.WsX509:
        throw new Error(
          `${fnTag} web socket is not setup to rotate keys. Client should enroll with a new key)`,
        );
        break;
    }
    identity.type = iType;
    await this.enroll(identity, {
      enrollmentID: request.enrollmentID,
      enrollmentSecret: request.enrollmentSecret,
      caId: request.caId,
      mspId: certData.mspId,
    });
  }

  /**
   * Get fabric block from a channel, using one of selectors.
   *
   * @param req input parameters
   * @returns Entire block object or encoded buffer (if req.skipDecode is true)
   */
  public async getBlock(req: GetBlockRequestV1): Promise<GetBlockResponseV1> {
    const fnTag = `${this.className}:getBlock(req: GetBlockRequestV1)`;
    this.log.debug(
      "getBlock() called, channelName:",
      req.channelName,
      "query:",
      JSON.stringify(req.query),
    );

    const gateway = await this.createGatewayWithOptions(req.gatewayOptions);
    const { channelName, responseType } = req;
    const connectionChannelName = req.connectionChannelName ?? channelName;
    const queryConfig = {
      gateway,
      connectionChannelName,
    };

    let responseData: Buffer;
    if (req.query.blockNumber) {
      this.log.debug("getBlock by it's blockNumber:", req.query.blockNumber);
      responseData = await querySystemChainCode(
        queryConfig,
        "GetBlockByNumber",
        channelName,
        req.query.blockNumber,
      );
    } else if (req.query.blockHash) {
      const { buffer, encoding } = req.query.blockHash;
      this.log.debug("getBlock by it's hash:", buffer);

      if (encoding && !Buffer.isEncoding(encoding)) {
        throw new Error(`Unknown buffer encoding provided: ${encoding}`);
      }

      responseData = await querySystemChainCode(
        queryConfig,
        "GetBlockByHash",
        channelName,
        Buffer.from(buffer, encoding as BufferEncoding),
      );
    } else if (req.query.transactionId) {
      this.log.debug(
        "getBlock by transactionId it contains:",
        req.query.transactionId,
      );
      responseData = await querySystemChainCode(
        queryConfig,
        "GetBlockByTxID",
        channelName,
        req.query.transactionId,
      );
    } else {
      throw new Error(
        "Unsupported block query type - you must provide either number, hash or txId",
      );
    }

    if (!responseData) {
      const eMsg = `${fnTag} - expected string as GetBlockByTxID response from Fabric system chaincode but received a falsy value instead...`;
      throw new RuntimeError(eMsg);
    }

    if (responseType === GetBlockResponseTypeV1.Encoded) {
      const encodedBlockB64 = responseData.toString("base64");
      return {
        encodedBlock: encodedBlockB64,
      };
    }

    const decodedBlock = BlockDecoder.decode(responseData);
    switch (responseType) {
      case GetBlockResponseTypeV1.CactiTransactions:
        return formatCactiTransactionsBlockResponse(decodedBlock);
      case GetBlockResponseTypeV1.CactiFullBlock:
        return formatCactiFullBlockResponse(decodedBlock);
      case GetBlockResponseTypeV1.Full:
      default:
        return {
          decodedBlock,
        };
    }
  }

  /**
   * Get fabric chain info from the system chaincode (qscc.GetChainInfo())
   *
   * @param req input parameters
   * @returns {height, currentBlockHash, previousBlockHash}
   */
  public async getChainInfo(
    req: GetChainInfoRequestV1,
  ): Promise<GetChainInfoResponseV1> {
    const { channelName } = req;
    this.log.debug("getChainInfo() called, channelName:", channelName);

    const gateway = await this.createGatewayWithOptions(req.gatewayOptions);
    const connectionChannelName = req.connectionChannelName ?? channelName;
    const queryConfig = {
      gateway,
      connectionChannelName,
    };

    const responseData = await querySystemChainCode(
      queryConfig,
      "GetChainInfo",
      channelName,
    );

    const decodedResponse =
      fabricProtos.common.BlockchainInfo.decode(responseData);
    if (!decodedResponse) {
      throw new RuntimeError("Could not decode BlockchainInfo");
    }

    return {
      height: fabricLongToNumber(
        decodedResponse.height as unknown as FabricLong,
      ),
      currentBlockHash:
        "0x" + Buffer.from(decodedResponse.currentBlockHash).toString("hex"),
      previousBlockHash:
        "0x" + Buffer.from(decodedResponse.previousBlockHash).toString("hex"),
    };
  }

  /**
   * Get plain Fabric Client, Channel and IdentityContext without a signer attached (like in gateway).
   * These low-level entities can be used to manually sign and send requests.
   * Node discovery will be done if configured in connector, so signCallback may be used in the process.
   *
   * @param channelName channel name to connect to
   * @param signerCertificate signing user certificate
   * @param signerMspID signing user mspid
   * @param uniqueTransactionData unique transaction data to be passed to sign callback (on discovery).
   * @returns `Client`, `Channel` and `IdentityContext`
   */
  private async getFabricClientWithoutSigner(
    channelName: string,
    signerCertificate: string,
    signerMspID: string,
    uniqueTransactionData?: unknown,
  ): Promise<{
    client: Client;
    channel: Channel;
    userIdCtx: IdentityContext;
  }> {
    this.log.debug(`getFabricChannelWithoutSigner() channel ${channelName}`);
    // Setup a client without a signer
    const clientId = `fcClient-${uuidv4()}`;
    this.log.debug("Create Fabric Client without a signer with ID", clientId);
    const client = new Client(clientId);
    // Use fabric SDK methods for parsing connection profile into Client structure
    await loadFromConfig(client, this.connectionProfile);

    // Create user
    const user = User.createUser("", "", signerMspID, signerCertificate);
    const userIdCtx = client.newIdentityContext(user);

    const channel = client.getChannel(channelName);

    // Discover fabric nodes
    if ((this.opts.discoveryOptions?.enabled ?? true) && this.signCallback) {
      const discoverers = [];
      for (const peer of client.getEndorsers()) {
        const discoverer = channel.client.newDiscoverer(peer.name, peer.mspid);
        discoverer.setEndpoint(peer.endpoint);
        discoverers.push(discoverer);
      }

      const discoveryService = channel.newDiscoveryService(channel.name);
      const discoveryRequest = discoveryService.build(userIdCtx);
      const signature = await this.signCallback(
        discoveryRequest,
        uniqueTransactionData,
      );
      await discoveryService.sign(signature);
      await discoveryService.send({
        asLocalhost: this.opts.discoveryOptions?.asLocalhost ?? true,
        targets: discoverers,
      });
    }

    this.log.info(
      `Created channel for ${channelName} with ${
        channel.getMspids().length
      } Mspids, ${channel.getCommitters().length} commiters, ${
        channel.getEndorsers().length
      } endorsers`,
    );

    return {
      client,
      channel,
      userIdCtx,
    };
  }

  /**
   * Send fabric query or transaction request using delegated sign with  `signCallback`.
   * Interface is mostly compatible with regular transact() method.
   *
   * @param req request specification
   * @returns query / transaction response
   */
  public async transactDelegatedSign(
    req: RunDelegatedSignTransactionRequest,
  ): Promise<RunTransactionResponse> {
    this.log.info(
      `transactDelegatedSign() ${req.methodName}@${req.contractName} on channel ${req.channelName}`,
    );
    if (!this.signCallback) {
      throw new Error(
        "No signing callback was set for this connector - abort!",
      );
    }

    // Connect Client and Channel, discover nodes
    const { channel, userIdCtx } = await this.getFabricClientWithoutSigner(
      req.channelName,
      req.signerCertificate,
      req.signerMspID,
      req.uniqueTransactionData,
    );

    const endorsingTargets = this.filterEndorsers(
      channel.getEndorsers(),
      req.endorsingPeers,
      req.endorsingOrgs,
    );

    switch (req.invocationType) {
      case FabricContractInvocationType.Call: {
        const query = channel.newQuery(req.contractName);
        const queryRequest = query.build(userIdCtx, {
          fcn: req.methodName,
          args: req.params,
        });
        const signature = await this.signCallback(
          queryRequest,
          req.uniqueTransactionData,
        );
        query.sign(signature);
        const queryResponse = await query.send({
          targets: endorsingTargets,
        });

        // Parse query results
        // Strategy: first endorsed response is returned
        for (const res of queryResponse.responses) {
          if (res.response.status === 200 && res.endorsement) {
            return {
              functionOutput: this.convertToTransactionResponseType(
                asBuffer(res.response.payload),
              ),
              transactionId: "",
            };
          }
        }

        throw new Error(
          `Query failed, errors: ${JSON.stringify(
            queryResponse.errors,
          )}, responses: ${JSON.stringify(
            queryResponse.responses.map((r) => {
              return {
                status: r.response.status,
                message: r.response.message,
              };
            }),
          )}`,
        );
      }
      case FabricContractInvocationType.Send:
      case FabricContractInvocationType.Sendprivate: {
        // Private transactions needs transient data set
        if (
          req.invocationType === FabricContractInvocationType.Sendprivate &&
          !req.transientData
        ) {
          throw new Error(
            "Missing transient data in a private transaction mode",
          );
        }

        const endorsement = channel.newEndorsement(req.contractName);

        const buildOptions: BuildProposalRequest = {
          fcn: req.methodName,
          args: req.params,
        };
        if (req.transientData) {
          buildOptions.transientMap = this.toTransientMap(req.transientData);
        }

        const endorsementRequest = endorsement.build(userIdCtx, buildOptions);
        const endorsementSignature = await this.signCallback(
          endorsementRequest,
          req.uniqueTransactionData,
        );
        await endorsement.sign(endorsementSignature);
        const endorsementResponse = await endorsement.send({
          targets: endorsingTargets,
        });

        if (
          !endorsementResponse.responses ||
          endorsementResponse.responses.length === 0
        ) {
          throw new Error("No endorsement responses from peers! Abort");
        }

        // We will try to commit if at least one endorsement passed
        let endorsedMethodResponse: Buffer | undefined;

        for (const response of endorsementResponse.responses) {
          const endorsementStatus = `${response.connection.name}: ${
            response.response.status
          } message ${response.response.message}, endorsement: ${Boolean(
            response.endorsement,
          )}`;

          if (response.response.status !== 200 || !response.endorsement) {
            this.log.warn(`Endorsement from peer ERROR: ${endorsementStatus}`);
          } else {
            this.log.debug(`Endorsement from peer OK: ${endorsementStatus}`);
            endorsedMethodResponse = asBuffer(response.payload);
          }
        }

        if (!endorsedMethodResponse) {
          throw new Error("No valid endorsements received!");
        }

        const commit = endorsement.newCommit();
        const commitRequest = commit.build(userIdCtx);
        const commitSignature = await this.signCallback(
          commitRequest,
          req.uniqueTransactionData,
        );
        await commit.sign(commitSignature);
        const commitResponse = await commit.send({
          targets: channel.getCommitters(),
        });
        this.log.debug("Commit response:", commitResponse);

        if (commitResponse.status !== "SUCCESS") {
          throw new Error("Transaction commit request failed!");
        }

        this.prometheusExporter.addCurrentTransaction();

        return {
          functionOutput: this.convertToTransactionResponseType(
            endorsedMethodResponse,
          ),
          transactionId: userIdCtx.transactionId,
        };
      }
      default: {
        throw new Error(
          `transactDelegatedSign() Unknown invocation type: ${req.invocationType}`,
        );
      }
    }
  }

  /**
   * Use fabric discovery service to find all the nodes that are part of specified channel.
   *
   * @param req request specification
   * @returns fabric discovery request results
   */
  public async getDiscoveryResults(
    req: GetDiscoveryResultsRequestV1,
  ): Promise<GetDiscoveryResultsResponseV1> {
    // Validate input parameters
    if (!req.channelName) {
      throw createHttpError[400]("req.channelName must be provided");
    }
    if (!req.gatewayOptions) {
      throw createHttpError[400]("req.gatewayOptions must be provided");
    }
    if (!(req.gatewayOptions.discovery?.enabled ?? true)) {
      throw createHttpError[400](
        "req.gatewayOptions discovery must be enabled",
      );
    }

    const gateway = await this.createGatewayWithOptions(req.gatewayOptions);

    // We use `discoveryService` member of `Network`, which isn't private according to the sources (as of 2025),
    // but is not listed in exported TS types for some reason.
    // Since it's public in the sources, and because this API is deprecated anyways,
    // I don't think we're at risk of this being changed anyway, so I use it
    // to prevent unnecessary code duplication (which would be more risky in the end).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const looseNetwork: any = await gateway.getNetwork(req.channelName);
    const discoveryResultsResponse =
      await looseNetwork.discoveryService.getDiscoveryResults(true);

    // Rename the response fields
    const discoveryResults = {
      msps: discoveryResultsResponse.msps,
      orderers: discoveryResultsResponse.orderers,
      peersByMSP: discoveryResultsResponse.peers_by_org,
      timestamp: discoveryResultsResponse.timestamp,
    };

    // Convert peer.ledgerHeight from Long to number
    Object.keys(discoveryResults.peersByMSP).forEach((peerOrg) => {
      discoveryResults.peersByMSP[peerOrg].peers = discoveryResults.peersByMSP[
        peerOrg
      ].peers.map((peer: any) => {
        return {
          ...peer,
          ledgerHeight: fabricLongToNumber(peer.ledgerHeight),
        };
      });
    });

    return discoveryResults;
  }

  /**
   * Creates a new Fabric event listener.
   *
   * @param req The request object containing the channel name and contract name.
   * @param callback The callback function to be called when an event is received.
   * @returns A promise that resolves to an object containing the listener and a
   * function to remove it.
   */
  public async createFabricListener(
    req: CreateListenerRequest,
    callback: (event: ContractEvent) => Promise<void>,
  ): Promise<{
    removeListener: () => void;
    listener: Promise<ContractListener>;
  }> {
    const fnTag = `${this.className}#createFabricListener()`;

    const listener = async (contractEvent: ContractEvent) =>
      callback(contractEvent);

    try {
      const gateway = await this.createGateway(req);
      const network = await gateway.getNetwork(req.channelName);
      const contract = network.getContract(req.contractName);

      this.log.debug(
        `Subscribing to events emitted in contract ${req.contractName} in channel ${req.channelName}...`,
      );

      return {
        listener: contract.addContractListener(listener),
        removeListener: () => {
          contract.removeContractListener(listener);
          gateway.disconnect();
        },
      };
    } catch (error) {
      throw new Error(
        `${fnTag} Failed to create fabric listener. ` +
          `Error: ${error.message}`,
      );
    }
  }
}
