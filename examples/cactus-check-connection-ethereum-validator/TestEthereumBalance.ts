import { Verifier } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/verifier/Verifier";
import { ConfigUtil } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/util/ConfigUtil";
import { verifierFactory } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/routes/index";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "TestEthereumBalance";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class TestEthereumBalance {
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

  private createVerifier(): void {
    logger.debug("create verifierEthereum");

    this.verifierEthereum = verifierFactory.getVerifier(
      this.validatorId,
      this.appId,
      this.monitorOptions,
      this.monitorMode,
    );
  }

  getBalance(account: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.createVerifier();

      const contract = {};
      const method = { type: "web3Eth", command: "getBalance" };
      const args = { args: [account] };

      this.verifierEthereum
        .sendSyncRequest(contract, method, args)
        .then((result) => {
          const response = {
            status: result.status,
            amount: parseFloat(result.data),
          };
          resolve(response);
        })
        .catch((err) => {
          logger.error(err);
          reject(err);
        });
    });
  }
}
