import { Server } from "http";
import { Server as SecureServer } from "https";

import "multer";
import { Config as SshConfig } from "node-ssh";
import {
  DefaultEventHandlerOptions,
  DefaultEventHandlerStrategies,
  DiscoveryOptions,
  Gateway,
  GatewayOptions,
  InMemoryWallet,
  X509WalletMixin,
} from "fabric-network";

import { Optional } from "typescript-optional";

import {
  IPluginLedgerConnector,
  PluginAspect,
  IPluginWebService,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
  PluginRegistry,
} from "@hyperledger/cactus-core-api";

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

export interface IPluginLedgerConnectorFabricOptions
  extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  pluginRegistry: PluginRegistry;
  sshConfig: SshConfig;
  connectionProfile: ConnectionProfile;
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

  public get className() {
    return PluginLedgerConnectorFabric.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginLedgerConnectorFabricOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(opts.pluginRegistry, `${fnTag} options.pluginRegistry`);
    Checks.truthy(opts.connectionProfile, `${fnTag} options.connectionProfile`);

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = opts.instanceId;
  }

  public shutdown(): Promise<void> {
    throw new Error("Method not implemented.");
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

  /**
   * FIXME: Implement this feature of the connector.
   *
   * @param req The object containing all the necessary metadata and parameters
   * in order to have the contract deployed.
   */
  public async deployContract(
    req: DeployContractGoSourceV1Request
  ): Promise<DeployContractGoSourceV1Response> {
    const fnTag = "PluginLedgerConnectorFabric#deployContract()";
    throw new Error(`${fnTag} Not yet implemented!`);
  }

  public async installWebServices(
    expressApp: any
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

    const pkg = this.getPackageName();
    log.info(`Installed web services for plugin ${pkg} OK`, { endpoints });

    return endpoints;
  }

  public async transact(
    req: RunTransactionRequest
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transact()`;

    const { connectionProfile } = this.opts;
    const {
      keychainId,
      keychainRef,
      channelName,
      chainCodeId,
      invocationType,
      functionName: fnName,
      functionArgs,
    } = req;

    const gateway = new Gateway();
    const wallet = new InMemoryWallet(new X509WalletMixin());
    const keychain = this.opts.pluginRegistry.findOneByKeychainId(keychainId);
    this.log.debug("transact() obtained keychain by ID=%o OK", keychainId);

    const fabricX509IdentityJson = await keychain.get<string>(keychainRef);
    this.log.debug("transact() obtained keychain entry Key=%o OK", keychainRef);
    const identity = JSON.parse(fabricX509IdentityJson);

    try {
      await wallet.import(keychainRef, identity);
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
        identity: keychainRef,
        wallet,
      };

      await gateway.connect(connectionProfile as any, gatewayOptions);
      this.log.debug("transact() gateway connection established OK");

      const network = await gateway.getNetwork(channelName);
      const contract = network.getContract(chainCodeId);

      let out: Buffer;
      switch (invocationType) {
        case FabricContractInvocationType.CALL: {
          out = await contract.evaluateTransaction(fnName, ...functionArgs);
          break;
        }
        case FabricContractInvocationType.SEND: {
          out = await contract.submitTransaction(fnName, ...functionArgs);
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
      };
      this.log.debug(`transact() response: %o`, res);
      return res;
    } catch (ex) {
      this.log.error(`transact() crashed: `, ex);
      throw new Error(`${fnTag} Unable to run transaction: ${ex.message}`);
    }
  }
}
