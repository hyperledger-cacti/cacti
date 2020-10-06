import { Server } from "http";
import { Server as SecureServer } from "https";

import express, { Express } from "express";
import multer from "multer";
import bodyParser from "body-parser";
import { Config as SshConfig } from "node-ssh";
import { Optional } from "typescript-optional";

import {
  IPluginLedgerConnector,
  PluginAspect,
  IPluginWebService,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  DeployContractGoBinEndpointV1,
  IDeployContractGoBinEndpointV1Options,
} from "./deploy-contract-go-bin-endpoint-v1";
import { ISigningIdentity } from "./i-fabric-signing-identity";

export interface IPluginLedgerConnectorFabricOptions {
  opsApiHttpHost: string;
  logLevel?: LogLevelDesc;
  webAppOptions?: any;
  sshConfig: SshConfig;
  connectionProfile: any;
  adminSigningIdentity: ISigningIdentity;
}

export interface ITransactionOptions {
  privateKey?: string;
}

export class PluginLedgerConnectorFabric
  implements IPluginLedgerConnector<any, any>, IPluginWebService {
  private readonly log: Logger;

  private httpServer: Server | SecureServer | undefined;

  constructor(public readonly options: IPluginLedgerConnectorFabricOptions) {
    const fnTag = "PluginLedgerConnectorFabric#constructor()";

    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = "plugin-ledger-connector-fabric";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public shutdown(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public getId(): string {
    return `@hyperledger/cactus-plugin-ledger-connectur-fabric`;
  }

  public getAspect(): PluginAspect {
    return PluginAspect.LEDGER_CONNECTOR;
  }

  public async sendTransaction(options: ITransactionOptions): Promise<any> {
    const fnTag = "PluginLedgerConnectorFabric#sendTransaction()";
    throw new Error(`${fnTag} Method not yet implemented.`);
  }

  public instantiateContract(contractJsonArtifact: any, address?: string): any {
    const fnTag = "PluginLedgerConnectorFabric#instantiateContract()";
    throw new Error(`${fnTag} Method not yet implemented.`);
  }

  public async deployContract(options: any): Promise<void> {
    const fnTag = "PluginLedgerConnectorFabric#deployContract()";
    throw new Error(`${fnTag} Method not yet implemented.`);
  }

  public async addPublicKey(publicKeyHex: string): Promise<void> {
    const fnTag = "PluginLedgerConnectorFabric#addPublicKey()";
    throw new Error(`${fnTag} Method not yet implemented.`);
  }

  public async installWebServices(
    expressApp: any
  ): Promise<IWebServiceEndpoint[]> {
    const { log } = this;

    log.info(`Installing web services for plugin ${this.getId()}...`);
    const webApp: Express = this.options.webAppOptions ? express() : expressApp;

    // FIXME refactor this
    // presence of webAppOptions implies that caller wants the plugin to configure it's own express instance on a custom
    // host/port to listen on
    if (this.options.webAppOptions) {
      this.log.info(`Creating dedicated HTTP server...`);
      const { port, hostname } = this.options.webAppOptions;

      webApp.use(bodyParser.json({ limit: "50mb" }));

      const address = await new Promise((resolve, reject) => {
        const httpServer = webApp.listen(port, hostname, (err: any) => {
          if (err) {
            reject(err);
            this.log.error(`Failed to create dedicated HTTP server`, err);
          } else {
            this.httpServer = httpServer;
            const theAddress = this.httpServer.address();
            resolve(theAddress);
          }
        });
      });
      this.log.info(`Creation of HTTP server OK`, { address });
    }

    const { sshConfig, connectionProfile, adminSigningIdentity } = this.options;
    const pluginId = this.getId();

    const storage = multer.memoryStorage();
    const upload = multer({ storage });

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const path = `/api/v1/plugins/${pluginId}/deploy-contract-go-bin`;
      const opts: IDeployContractGoBinEndpointV1Options = {
        path,
        sshConfig,
        connectionProfile,
        adminSigningIdentity,
        logLevel: "TRACE",
      };
      const endpoint = new DeployContractGoBinEndpointV1(opts);
      webApp.post(
        endpoint.getPath(),
        upload.array("files", 1024),
        endpoint.getExpressRequestHandler()
      );
      endpoints.push(endpoint);
      this.log.info(`Registered contract deployment endpoint at ${path}`);
    }

    log.info(`Installed web svcs for plugin ${this.getId()} OK`, { endpoints });
    return endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.ofNullable(this.httpServer);
  }
}
