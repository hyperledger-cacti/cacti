import {
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  PluginAspect,
} from "@hyperledger/cactus-core-api";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

import { promisify } from "util";
import { Optional } from "typescript-optional";
import { Server } from "http";
import { Server as SecureServer } from "https";
import { DeployContractEndpoint } from "./web-services/deploy-contract-endpoint";
import { NodeSSH } from "node-ssh";
export interface IPluginLedgerConnectorCordaOptions {
  rpcApiHttpHost: string;
}

/**
 * FIXME: This is under construction.
 */
export interface ITransactionOptions {
  privateKey?: string;
}

export interface ICordaDeployContractOptions {
  host: string;
  username: string;
  port: number;
  privateKey: string; // The private key used to ssh into Docker container
  contractZip: string;
}

export class PluginLedgerConnectorCorda
  implements IPluginLedgerConnector<any, any>, IPluginWebService {
  private readonly log: Logger;
  private httpServer: Server | SecureServer | null = null;

  constructor(public readonly options: IPluginLedgerConnectorCordaOptions) {
    if (!options) {
      throw new Error(`PluginLedgerConnectorCorda#ctor options falsy.`);
    }
    if (!options.rpcApiHttpHost) {
      throw new Error(
        `PluginLedgerConnectorCorda#ctor options.rpcApiHttpHost falsy.`
      );
    }
    // const web3Provider = new Web3.providers.HttpProvider(
    //   this.options.rpcApiHttpHost
    // );
    // this.web3 = new Web3(web3Provider);
    this.log = LoggerProvider.getOrCreate({
      label: "plugin-ledger-connector-corda",
      level: "trace",
    });
  }

  public async installWebServices(
    expressApp: any
  ): Promise<IWebServiceEndpoint[]> {
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const pluginId = this.getId(); // @hyperledger/cactus-plugin-ledger-connector-corda
      const path = `/api/v1/plugins/${pluginId}/contract/deploy`;
      const endpoint: IWebServiceEndpoint = new DeployContractEndpoint({
        path,
        plugin: this,
      });
      expressApp.use(endpoint.getPath(), endpoint.getExpressRequestHandler());
      endpoints.push(endpoint);
      this.log.info(`Registered contract deployment endpoint at ${path}`);
    }
    return endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.ofNullable(this.httpServer);
  }

  public async shutdown(): Promise<void> {
    const serverMaybe = this.getHttpServer();
    if (serverMaybe.isPresent()) {
      const server = serverMaybe.get();
      await promisify(server.close.bind(server))();
    }
  }

  public getId(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-corda`;
  }

  public getAspect(): PluginAspect {
    return PluginAspect.LEDGER_CONNECTOR;
  }

  public async deployContract(
    options: ICordaDeployContractOptions
  ): Promise<any> {
    if (!options.contractZip) {
      throw new Error(
        `PluginLedgerConnectorCorda#deployContract() options.contractZip falsy.`
      );
    }
    const ssh = new NodeSSH();
    ssh
      .connect({
        host: options.host,
        username: options.username,
        port: options.port,
        privateKey: options.privateKey,
      })
      .then(() => {
        // Local, Remote
        ssh
          .putFile(options.contractZip, "/root/smart-contracts/upload.zip")
          .then(
            () => {
              this.log.debug("Smart Contracts uploaded to server");

              // ssh.execCommand('./deploy_contract.sh', { cwd:'/opt/corda/builder' }).then(function(result) {
              //   console.log("Copied success")
              // })
            },
            (error) => {
              this.log.debug(
                "Error: Failed to upload smart contract to server"
              );
              this.log.debug(error);
            }
          );
      });
  }

  public async addPublicKey(publicKeyHex: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
