import fs from "fs";
import path from "path";
import { Server } from "http";
import { Server as SecureServer } from "https";

import { Express } from "express";
import "multer";
import temp from "temp";
import {
  NodeSSH,
  Config as SshConfig,
  SSHExecCommandOptions,
  SSHExecCommandResponse,
} from "node-ssh";
import {
  DefaultEventHandlerOptions,
  DefaultEventHandlerStrategies,
  Gateway,
  GatewayOptions,
  InMemoryWallet,
  X509WalletMixin,
} from "fabric-network";

import { Optional } from "typescript-optional";

import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
  PluginAspect,
  IPluginWebService,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import {
  IRunTransactionEndpointV1Options,
  RunTransactionEndpointV1,
} from "./run-transaction/run-transaction-endpoint-v1";

import {
  IGetPrometheusExporterMetricsEndpointV1Options,
  GetPrometheusExporterMetricsEndpointV1,
} from "./get-prometheus-exporter-metrics/get-prometheus-exporter-metrics-endpoint-v1";

import {
  ConnectionProfile,
  GatewayDiscoveryOptions,
  GatewayEventHandlerOptions,
  DeployContractGoSourceV1Request,
  DeployContractGoSourceV1Response,
  FabricContractInvocationType,
  RunTransactionRequest,
  RunTransactionResponse,
} from "./generated/openapi/typescript-axios/index";

import {
  DeployContractGoSourceEndpointV1,
  IDeployContractGoSourceEndpointV1Options,
} from "./deploy-contract-go-source/deploy-contract-go-source-endpoint-v1";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";

/**
 * Constant value holding the default $GOPATH in the Fabric CLI container as
 * observed on fabric deployments that are produced by the official examples
 * found in the https://github.com/hyperledger/fabric-samples repository.
 */
export const K_DEFAULT_CLI_CONTAINER_GO_PATH = "/opt/gopath/";

/**
 * The command that will be used to issue docker commands while controlling
 * the Fabric CLI container and the peers.
 */
export const K_DEFAULT_DOCKER_BINARY = "docker";

export interface IPluginLedgerConnectorFabricOptions
  extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  dockerBinary?: string;
  cliContainerGoPath?: string;
  cliContainerEnv: NodeJS.ProcessEnv;
  pluginRegistry: PluginRegistry;
  sshConfig: SshConfig;
  connectionProfile: ConnectionProfile;
  prometheusExporter?: PrometheusExporter;
  discoveryOptions?: GatewayDiscoveryOptions;
  eventHandlerOptions?: GatewayEventHandlerOptions;
}

export class PluginLedgerConnectorFabric
  implements
    IPluginLedgerConnector<
      DeployContractGoSourceV1Request,
      DeployContractGoSourceV1Response,
      RunTransactionRequest,
      RunTransactionResponse
    >,
    ICactusPlugin,
    IPluginWebService {
  public static readonly CLASS_NAME = "PluginLedgerConnectorFabric";
  private readonly instanceId: string;
  private readonly log: Logger;
  private readonly dockerBinary: string;
  private readonly cliContainerGoPath: string;
  public prometheusExporter: PrometheusExporter;

  public get className(): string {
    return PluginLedgerConnectorFabric.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginLedgerConnectorFabricOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(opts.pluginRegistry, `${fnTag} options.pluginRegistry`);
    Checks.truthy(opts.connectionProfile, `${fnTag} options.connectionProfile`);
    this.prometheusExporter =
      opts.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );
    this.dockerBinary = opts.dockerBinary || K_DEFAULT_DOCKER_BINARY;
    Checks.truthy(this.dockerBinary != null, `${fnTag}:dockerBinary`);

    this.cliContainerGoPath =
      opts.cliContainerGoPath || K_DEFAULT_CLI_CONTAINER_GO_PATH;
    Checks.nonBlankString(
      this.cliContainerGoPath,
      `${fnTag}:cliContainerGoPath`,
    );

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = opts.instanceId;
    this.prometheusExporter.startMetricsCollection();
  }

  public shutdown(): Promise<void> {
    throw new Error("Method not implemented.");
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

  public getAspect(): PluginAspect {
    return PluginAspect.LEDGER_CONNECTOR;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.empty();
  }

  public async getConsensusAlgorithmFamily(): Promise<
    ConsensusAlgorithmFamily
  > {
    return ConsensusAlgorithmFamily.AUTHORITY;
  }

  private async sshExec(
    cmd: string,
    label: string,
    ssh: NodeSSH,
    sshCmdOptions: SSHExecCommandOptions,
  ): Promise<SSHExecCommandResponse> {
    this.log.debug(`${label} CMD: ${cmd}`);
    const cmdRes = await ssh.execCommand(cmd, sshCmdOptions);
    this.log.debug(`${label} CMD Response: %o`, cmdRes);
    Checks.truthy(cmdRes.code === null, `${label} cmdRes.code === null`);
    return cmdRes;
  }

  /**
   * @param req The object containing all the necessary metadata and parameters
   * in order to have the contract deployed.
   */
  public async deployContract(
    req: DeployContractGoSourceV1Request,
  ): Promise<DeployContractGoSourceV1Response> {
    const fnTag = `${this.className}#deployContract()`;

    const ssh = new NodeSSH();
    await ssh.connect(this.opts.sshConfig);
    this.log.debug(`SSH connection OK`);

    try {
      this.log.debug(`${fnTag} Deploying .go source: ${req.goSource.filename}`);

      Checks.truthy(req.goSource, `${fnTag}:req.goSource`);

      temp.track();
      const tmpDirPrefix = `hyperledger-cactus-${this.className}`;
      const tmpDirPath = temp.mkdirSync(tmpDirPrefix);

      // The module name of the chain-code, for example this will extract
      // ccName to be "hello-world" from a filename of "hello-world.go"
      const inferredModuleName = path.basename(req.goSource.filename, ".go");
      this.log.debug(`Inferred module name: ${inferredModuleName}`);
      const ccName = req.moduleName || inferredModuleName;
      this.log.debug(`Determined ChainCode name: ${ccName}`);

      const remoteDirPath = path.join(this.cliContainerGoPath, "src/", ccName);
      this.log.debug(`Remote dir path on CLI container: ${remoteDirPath}`);

      const localFilePath = path.join(tmpDirPath, req.goSource.filename);
      fs.writeFileSync(localFilePath, req.goSource.body, "base64");

      const remoteFilePath = path.join(remoteDirPath, req.goSource.filename);

      this.log.debug(`SCP from/to %o => %o`, localFilePath, remoteFilePath);
      await ssh.putFile(localFilePath, remoteFilePath);
      this.log.debug(`SCP OK %o`, remoteFilePath);

      const sshCmdOptions: SSHExecCommandOptions = {
        execOptions: {
          pty: true,
          env: {
            // just in case go modules would be otherwise disabled
            GO111MODULE: "on",
            FABRIC_LOGGING_SPEC: "DEBUG",
          },
        },
        cwd: remoteDirPath,
      };

      const dockerExecEnv = Object.entries(this.opts.cliContainerEnv)
        .map(([key, value]) => `--env ${key}=${value}`)
        .join(" ");

      const { dockerBinary } = this;
      const dockerBuildCmd =
        `${dockerBinary} exec ` +
        dockerExecEnv +
        ` --env GO111MODULE=on` +
        ` --workdir=${remoteDirPath}` +
        ` cli `;

      await this.sshExec(
        `${dockerBinary} exec cli mkdir -p ${remoteDirPath}/`,
        "Create ChainCode project (go module) directory",
        ssh,
        sshCmdOptions,
      );

      await this.sshExec(
        `${dockerBinary} exec cli go version`,
        "Print go version",
        ssh,
        sshCmdOptions,
      );

      const copyToCliCmd = `${dockerBinary} cp ${remoteFilePath} cli:${remoteFilePath}`;
      this.log.debug(`Copy to CLI Container CMD: ${copyToCliCmd}`);
      const copyToCliRes = await ssh.execCommand(copyToCliCmd, sshCmdOptions);
      this.log.debug(`Copy to CLI Container CMD Response: %o`, copyToCliRes);
      Checks.truthy(copyToCliRes.code === null, `copyToCliRes.code === null`);

      {
        const goModInitCmd = `${dockerBuildCmd} go mod init ${ccName}`;
        this.log.debug(`go mod init CMD: ${goModInitCmd}`);
        const goModInitRes = await ssh.execCommand(goModInitCmd, sshCmdOptions);
        this.log.debug(`go mod init CMD Response: %o`, goModInitRes);
        Checks.truthy(goModInitRes.code === null, `goModInitRes.code === null`);
      }

      const pinnedDeps = req.pinnedDeps || [];
      for (const dep of pinnedDeps) {
        const goGetCmd = `${dockerBuildCmd} go get ${dep}`;
        this.log.debug(`go get CMD: ${goGetCmd}`);
        const goGetRes = await ssh.execCommand(goGetCmd, sshCmdOptions);
        this.log.debug(`go get CMD Response: %o`, goGetRes);
        Checks.truthy(goGetRes.code === null, `goGetRes.code === null`);
      }

      {
        const goModTidyCmd = `${dockerBuildCmd} go mod tidy`;
        this.log.debug(`go mod tidy CMD: ${goModTidyCmd}`);
        const goModTidyRes = await ssh.execCommand(goModTidyCmd, sshCmdOptions);
        this.log.debug(`go mod tidy CMD Response: %o`, goModTidyRes);
        Checks.truthy(goModTidyRes.code === null, `goModTidyRes.code === null`);
      }

      {
        const goVendorCmd = `${dockerBuildCmd} go mod vendor`;
        this.log.debug(`go mod vendor CMD: ${goVendorCmd}`);
        const goVendorRes = await ssh.execCommand(goVendorCmd, sshCmdOptions);
        this.log.debug(`go mod vendor CMD Response: %o`, goVendorRes);
        Checks.truthy(goVendorRes.code === null, `goVendorRes.code === null`);
      }

      {
        const goBuildCmd = `${dockerBuildCmd} go build`;
        this.log.debug(`go build CMD: ${goBuildCmd}`);
        const goBuildRes = await ssh.execCommand(goBuildCmd, sshCmdOptions);
        this.log.debug(`go build CMD Response: %o`, goBuildRes);
        Checks.truthy(goBuildRes.code === null, `goBuildRes.code === null`);
      }

      // https://github.com/hyperledger/fabric-samples/blob/release-1.4/fabcar/startFabric.sh
      for (const org of req.targetOrganizations) {
        const env =
          ` --env CORE_PEER_LOCALMSPID=${org.CORE_PEER_LOCALMSPID}` +
          ` --env CORE_PEER_ADDRESS=${org.CORE_PEER_ADDRESS}` +
          ` --env CORE_PEER_MSPCONFIGPATH=${org.CORE_PEER_MSPCONFIGPATH}` +
          ` --env CORE_PEER_TLS_ROOTCERT_FILE=${org.CORE_PEER_TLS_ROOTCERT_FILE}`;

        await this.sshExec(
          dockerBinary +
            ` exec ${env} cli peer chaincode install` +
            ` --name ${ccName} ` +
            ` --path ${ccName} ` +
            ` --version ${req.chainCodeVersion} ` +
            ` --lang golang`,
          `Install ChainCode in ${org.CORE_PEER_LOCALMSPID}`,
          ssh,
          sshCmdOptions,
        );
      }

      let success = true;

      const ctorArgsJson = JSON.stringify(req.constructorArgs || {});
      const ordererCaFile =
        "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt";

      const instantiateCmd =
        `${dockerBuildCmd} peer chaincode instantiate ` +
        ` --name ${ccName} ` +
        ` --version ${req.chainCodeVersion} ` +
        ` --ctor '${ctorArgsJson}' ` +
        ` --channelID ${req.channelId} ` +
        ` --peerAddresses ${req.targetPeerAddresses[0]}` +
        ` --lang golang ` +
        ` --tlsRootCertFiles ${req.tlsRootCertFiles}` +
        ` --policy "${req.policyDslSource}"` +
        ` --tls --cafile ${ordererCaFile}`;

      this.log.debug(`Instantiate CMD: %o`, instantiateCmd);
      const instantiateCmdRes = await ssh.execCommand(
        instantiateCmd,
        sshCmdOptions,
      );

      this.log.debug(`Instantiate CMD Response: %o`, instantiateCmdRes);
      success = success && instantiateCmdRes.code === null;

      this.log.debug(`EXIT doDeploy()`);
      const res: DeployContractGoSourceV1Response = {
        success,
        installationCommandResponse: {} as any,
        instantiationCommandResponse: instantiateCmdRes,
      };
      return res;
    } finally {
      try {
        ssh.dispose();
      } finally {
        temp.cleanup();
      }
    }
  }

  public async installWebServices(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const { log } = this;

    log.info(`Installing web services for plugin ${this.getPackageName()}...`);

    const endpoints: IWebServiceEndpoint[] = [];

    {
      const opts: IDeployContractGoSourceEndpointV1Options = {
        connector: this,
        logLevel: this.opts.logLevel,
      };
      const endpoint = new DeployContractGoSourceEndpointV1(opts);
      endpoint.registerExpress(expressApp);
      endpoints.push(endpoint);
    }

    {
      const opts: IRunTransactionEndpointV1Options = {
        connector: this,
        logLevel: this.opts.logLevel,
      };
      const endpoint = new RunTransactionEndpointV1(opts);
      endpoint.registerExpress(expressApp);
      endpoints.push(endpoint);
    }

    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        connector: this,
        logLevel: this.opts.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoint.registerExpress(expressApp);
      endpoints.push(endpoint);
    }

    const pkg = this.getPackageName();
    log.info(`Installed web services for plugin ${pkg} OK`, { endpoints });

    return endpoints;
  }

  public async transact(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transact()`;

    const { connectionProfile } = this.opts;
    const {
      signingCredential,
      channelName,
      contractName,
      invocationType,
      methodName: fnName,
      params,
    } = req;

    const gateway = new Gateway();
    const wallet = new InMemoryWallet(new X509WalletMixin());
    const keychain = this.opts.pluginRegistry.findOneByKeychainId(
      signingCredential.keychainId,
    );
    this.log.debug(
      "transact() obtained keychain by ID=%o OK",
      signingCredential.keychainId,
    );

    const fabricX509IdentityJson = await keychain.get<string>(
      signingCredential.keychainRef,
    );
    this.log.debug(
      "transact() obtained keychain entry Key=%o OK",
      signingCredential.keychainRef,
    );
    const identity = JSON.parse(fabricX509IdentityJson);

    try {
      await wallet.import(signingCredential.keychainRef, identity);
      this.log.debug("transact() imported identity to in-memory wallet OK");

      const eventHandlerOptions: DefaultEventHandlerOptions = {
        commitTimeout: this.opts.eventHandlerOptions?.commitTimeout,
      };
      if (this.opts.eventHandlerOptions?.strategy) {
        eventHandlerOptions.strategy =
          DefaultEventHandlerStrategies[
            this.opts.eventHandlerOptions?.strategy
          ];
      }

      const gatewayOptions: GatewayOptions = {
        discovery: this.opts.discoveryOptions,
        eventHandlerOptions,
        identity: signingCredential.keychainRef,
        wallet,
      };

      await gateway.connect(connectionProfile as any, gatewayOptions);
      this.log.debug("transact() gateway connection established OK");

      const network = await gateway.getNetwork(channelName);
      const contract = network.getContract(contractName);

      let out: Buffer;
      let success: boolean;
      switch (invocationType) {
        case FabricContractInvocationType.CALL: {
          out = await contract.evaluateTransaction(fnName, ...params);
          success = true;
          break;
        }
        case FabricContractInvocationType.SEND: {
          out = await contract.submitTransaction(fnName, ...params);
          success = true;
          break;
        }
        default: {
          const message = `FabricContractInvocationType: ${invocationType}`;
          throw new Error(`${fnTag} unknown ${message}`);
        }
      }
      const outUtf8 = out.toString("utf-8");
      const res: RunTransactionResponse = {
        functionOutput: outUtf8,
        success,
      };
      this.log.debug(`transact() response: %o`, res);
      this.prometheusExporter.addCurrentTransaction();

      return res;
    } catch (ex) {
      this.log.error(`transact() crashed: `, ex);
      throw new Error(`${fnTag} Unable to run transaction: ${ex.message}`);
    }
  }
}
