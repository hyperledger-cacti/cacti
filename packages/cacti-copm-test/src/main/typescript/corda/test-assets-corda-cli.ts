import { DLAccount } from "@hyperledger-cacti/cacti-copm-core";
import { TestAssets } from "../interfaces/test-assets";
import { CordaRPCConfig } from "./corda-rpc-config";
import { Logger } from "@hyperledger/cactus-common";
import { exec } from "child_process";

const path = require("path");

export class TestAssetsCordaCli implements TestAssets {
  account: DLAccount;
  log: Logger;
  private cli: string;

  constructor(owner: DLAccount, log: Logger) {
    this.account = owner;
    this.log = log;
    this.cli = path.resolve(
      path.dirname(__filename),
      "../../../../../../weaver/samples/corda/corda-simple-application/clients/build/install/clients/bin/clients",
    );
    this.log.info(this.cli);
  }

  public async start() {}

  public async stop() {}

  public async userOwnsNonFungibleAsset(
    assetType: string,
    assetId: string,
  ): Promise<boolean> {
    const port = this.getRPCPort();
    // CORDA_PORT=10006 ./clients/build/install/clients/bin/clients bond get-assets-by-type 'bond01'`)
    const res = await this.runCliCommand(
      `CORDA_PORT=${port} ${this.cli} bond get-assets-by-type ${assetType}`,
    );
    this.log.info(`Response: ${res}`);
    const matchStr = `id=${assetId}, owner=${this.account.userId}`;
    return res.includes(matchStr);
  }

  public async addToken(assetType: string, assetQuantity: number) {
    const cmd = `NETWORK_NAME='${this.account.organization}' CORDA_PORT=${this.getRPCPort()} ${this.cli} issue-asset-state ${assetQuantity} ${assetType}`;
    await this.runCliCommand(cmd);
  }

  public async addNonFungibleAsset(assetType: string, assetId: string) {
    const cmd = `NETWORK_NAME=${this.account.organization} CORDA_PORT=${this.getRPCPort()} ${this.cli} bond issue-asset '${assetId}' '${assetType}'`;
    await this.runCliCommand(cmd);
  }

  public async tokenBalance(tokenType: string): Promise<number> {
    const port = this.getRPCPort();
    const res = await this.runCliCommand(
      `CORDA_PORT=${port} ${this.cli} get-asset-states-by-type ${tokenType}`,
    );
    if (res.includes("[]")) {
      return 0;
    }
    const assetStates = res.split("AssetState(");
    let total = 0;
    for (const assetState of assetStates) {
      const matches = assetState.match(/quantity=(\d+)/);
      if (matches) {
        total += +matches[1];
      }
    }
    return total;
  }

  private runCliCommand(command: string): Promise<string> {
    this.log.info(`Running command: ${command}`);
    return new Promise<string>((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          this.log.info(`stderr: ${stderr}`);
          this.log.info(`stdout: ${stdout}`);
          resolve(stdout);
        }
      });
    });
  }

  private getRPCPort(): number {
    const rpcData = CordaRPCConfig.getRPCData(this.account);
    return rpcData.port;
  }
}
