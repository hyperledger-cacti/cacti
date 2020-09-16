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
import * as fs from "fs";

/**
 * FIXME: This is under construction.
 */
export interface ITransactionOptions {
  privateKey?: string;
}

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
  contractZip: Buffer;
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
    const file = fs.writeFile(
      "/tmp/smart-contract.zip",
      options.contractZip,
      (error) => {
        log.error(error?.message);
      }
    );
    const log = this.log;
    const ssh = new NodeSSH();
    log.info("Port: %d | Key: %s", options.port, options.privateKey);
    ssh
      .connect({
        host: "localhost",
        username: "root",
        port: options.port,
        privateKey: options.privateKey,
      })
      .then(() => {
        // Local, Remote
        ssh
          .putFile(
            "/tmp/smart-contract.zip",
            "/root/smart-contracts/upload.zip"
          )
          .then(
            () => {
              log.info("Smart Contracts uploaded to server");
              ssh.exec("./deploy_contract.sh", [], {
                cwd: "/opt/corda/builder",
                onStdout(chunk) {
                  log.info("stdoutChunk", chunk.toString("utf8"));
                },
                onStderr(chunk) {
                  log.info("stderrChunk", chunk.toString("utf8"));
                },
              });
              // ssh
              //   .execCommand("/bin/ash deploy_contract.sh", {
              //     cwd: "/opt/corda/builder",
              //   })
              //   .then((result) => {
              //     log.info("STDOUT: " + result.stdout);
              //     log.info("STDERR: " + result.stderr);
              //   });
            },
            (error) => {
              log.info("Error: Failed to upload smart contract to server");
              log.info(error);
            }
          );
      });
  }

  public async getFlowList(porter: number): Promise<string> {
    const log = this.log;
    log.info("");
    const ssh = new NodeSSH();
    let nodeResult = "";
    ssh
      .connect({
        host: "localhost",
        port: porter,
        username: "user1",
        password: "test",
      })
      .then(() => {
        ssh.execCommand("flow list").then((result) => {
          nodeResult = result.stdout;
          this.log.info("FLOW: " + nodeResult);
          return nodeResult;
        });
      });
    return nodeResult;
  }

  public async startFlow(flow: string, state: object): Promise<string> {
    const command =
      "flow start " +
      flow +
      " " +
      JSON.stringify(state)
        .replace("{", "")
        .replace("}", "")
        .replace(/\"/gi, " ");
    return this.executeCordaCommand(command);
  }

  public async queryVault(stateName: string): Promise<any> {
    const command = "run vaultQuery contractStateType: " + stateName;
    return this.executeCordaCommand(command);
  }

  public async executeCordaCommand(command: string): Promise<string> {
    const log = this.log;
    log.info("");
    const ssh = new NodeSSH();
    let nodeResult = "";
    ssh
      .connect({
        host: "localhost",
        port: this.options.port,
        username: "user1",
        password: "test",
      })
      .then(() => {
        ssh.execCommand(command).then((result) => {
          this.log.info("STDOUT: " + result.stdout);
          nodeResult = result.stdout;
        });
      });
    return nodeResult;
  }

  public async checkConnection(
    options: ICordaDeployContractOptions
  ): Promise<boolean> {
    const ssh = new NodeSSH();
    let retry = 0;
    let available = false;
    while (!available && retry < 5) {
      this.log.info("Checking connection");
      const connection = ssh.connect({
        host: "localhost",
        username: "root",
        port: options.port,
        privateKey: options.privateKey,
      });
      available = (await connection).isConnected();
      retry++;
      if (!available) {
        await new Promise((r) => setTimeout(r, 30000));
      }
    }
    return available;
  }

  public async addPublicKey(publicKeyHex: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
