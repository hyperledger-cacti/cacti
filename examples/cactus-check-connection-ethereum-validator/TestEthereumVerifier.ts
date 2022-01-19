import { Verifier } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/verifier/Verifier";
import { ConfigUtil } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/util/ConfigUtil";
import { verifierFactory } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/routes/index";
import { VerifierEventListener } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/verifier/LedgerPlugin";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
import { VerifierFactory } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/verifier/VerifierFactory";
const moduleName = "TestEthereumBalance";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class TestEthereumVerifier {
  private verifierEthereum: Verifier;
  private validatorId: string;
  private appId: string;
  private monitorOptions: object;
  private monitorMode: boolean;

  constructor() {
    this.verifierEthereum = null;
    this.validatorId = "84jUisrs";
    this.appId = "BusinessLogicCheckEthereumValidator";
    this.monitorOptions = {};
    this.monitorMode = false;
  }

  private createVerifierWithoutMonitoring(): void {
    logger.debug("create verifierEthereum");

    this.verifierEthereum = verifierFactory.getVerifier(
      this.validatorId,
      this.appId,
      this.monitorOptions,
      this.monitorMode
    );
  }


  sendAsyncRequest(contract: object, method: { type: string; command: string; }, args: object): Promise<any> {
    return new Promise((resolve, reject) => {
      this.verifierEthereum.sendAsyncRequest(contract, method, args)
        .then(() => {
          logger.debug(`Successfully sent async request to: ${method.command}`);
          resolve(true);
        })
        .catch((err) => {
          logger.error(err);
          reject(err);
        });
    });
  }

  sendSyncRequest(contract: object, method: { type: string; command: string; }, args: object): Promise<any> {
    return new Promise((resolve, reject) => {
      this.verifierEthereum
        .sendSyncRequest(contract, method, args)
        .then((result) => {
          let response = {};
          if (method.command === "getBalance") {
            response = {
              status: result.status,
              amount: parseFloat(result.data)
            };
          } else {
            response = {
              status: result.status,
              data: result.data
            };
          }
          resolve(response);
        })
        .catch((err) => {
          logger.error(err);
          reject(err);
        });
    });
  }

  getBalance(account: string, requestType: string): any {

    this.createVerifierWithoutMonitoring();

    const contract = {};
    const method = { type: "web3Eth", command: "getBalance" };
    const args = { args: [account] };

    logger.debug(`Sending ${requestType} request for ETH balance...`);
    if (requestType === "async") {
      return this.sendAsyncRequest(contract, method, args);
    } else {
      return this.sendSyncRequest(contract, method, args);
    }
  }

  transferAsset(srcAccount: string, destAccount: string, amount: string, requestType: string) {

    this.createVerifierWithoutMonitoring();

    const contract = {};
    const method = { type: "web3Eth", command: "sendTransaction" };
    const args = {
      args: [
        {
          from: srcAccount,
          to: destAccount,
          value: amount,
        },
      ],
    };

    logger.debug(`Sending ${requestType} request for moving ETH assets...`);

    if (requestType === "async") {
      return this.sendAsyncRequest(contract, method, args);
    } else {
      return this.sendSyncRequest(contract, method, args);
    }
  }

  stopMonitor() {

    logger.debug(`StartingMonitor`);

    this.createVerifierWithoutMonitoring();
    logger.debug(`Stopping Monitor`);
    const blpMonitorModuleName = "BusinessLogicCheckEthereumValidator"

    this.verifierEthereum.stopMonitor(blpMonitorModuleName)
  }

  startMonitor() {

    logger.debug(`StartingMonitor`);

    const blpMonitorModuleName = "BusinessLogicCheckEthereumValidator";
    const verifier = verifierFactory.getVerifier(
      this.validatorId,
      blpMonitorModuleName,
      this.monitorOptions,
      true)
    let eventListener: VerifierEventListener

    verifier.startMonitor(blpMonitorModuleName, {}, eventListener)
  }
}
