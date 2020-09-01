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
  host: string;
  port: number;
  username: string;
  password: string;
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
    if (!options.port) {
      throw new Error(`PluginLedgerConnectorCorda#ctor options.port falsy.`);
    }
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
    this.log.info("Port: %d | Key: %s", options.port, options.privateKey);
    ssh
      .connect({
        host: "localhost",
        username: "root",
        port: options.port,
        privateKey: options.privateKey,
      })
      .then(function () {
        // Local, Remote
        ssh
          .putFile(
            "/Users/jacob.weate/Projects/ssh-docker/builder/upload.zip",
            "/root/smart-contracts/upload.zip"
          )
          .then(
            function () {
              console.log("Smart Contracts uploaded to server");
              await ssh
                .execCommand("/bin/ash deploy_contract.sh", {
                  cwd: "/opt/corda/builder",
                })
                .then(function (result) {
                  console.log("STDERR: " + result.stderr);
                });
            },
            function (error) {
              console.log("Error: Failed to upload smart contract to server");
              console.log(error);
            }
          );
      });
  }

  public async getFlowList(): Promise<any> {
    const command = "flow list";
    return this.executeCordaCommand(command);
  }

  public async startFlow(flow: string, state: object): Promise<any> {
    const command =
      "flow start " +
      flow +
      " " +
      JSON.stringify(state).replace("{", "").replace("}", "");
    return this.executeCordaCommand(command);
  }

  public async queryVault(stateName: string): Promise<any> {
    const command = "run vaultQuery contractStateType: " + stateName;
    return this.executeCordaCommand(command);
  }

  public async executeCordaCommand(command: string): Promise<any> {
    const log = this.log;
    const ssh = new NodeSSH();
    let nodeResult = "";
    ssh
      .connect({
        host: this.options.host,
        port: this.options.port,
        username: this.options.username,
        password: this.options.password,
      })
      .then(() => {
        ssh.execCommand(command).then((result) => {
          this.log.info("STDOUT: " + result.stdout);
          nodeResult = result.stdout;
        });
      });
    return nodeResult;
  }

  public async addPublicKey(publicKeyHex: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
