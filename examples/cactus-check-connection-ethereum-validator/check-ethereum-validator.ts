import { Router, NextFunction, Request, Response } from "express";
import { getLogger } from "log4js";
import { TransactionManagement } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/TransactionManagement";
import {
  RIFError,
  BadRequestError,
} from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/RIFError";
import { ConfigUtil } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/util/ConfigUtil";
import { TestEthereumBalance } from "./TestEthereumBalance";

const config: any = ConfigUtil.getConfig();
const moduleName = "check-ethereum-validator";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const router: Router = Router();
export const transactionManagement: TransactionManagement = new TransactionManagement();

function isRifError(err: any, res: Response): boolean {
  if (err instanceof RIFError) {
    logger.error(`RIFError caught, ${err.statusCode}, ${err.message}`);
    res.status(err.statusCode);
    res.send(err.message);
    return true;
  }
  logger.error(`Error caught: ${err.statusCode}, ${err.message}`);
  return false;
}

router.post("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info("check-ethereum-validator()");
    const tradeID: string = transactionManagement.startBusinessLogic(req);
    const result = { tradeID: tradeID };
    res.status(200).json(result);
  } catch (err) {
    if (isRifError(err, res)) return;
    next(err);
  }
});

const testEthereumBalance: TestEthereumBalance = new TestEthereumBalance();

router.get("/:account", (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info("check-ethereum-validator()");
    testEthereumBalance
      .getBalance(req.params.account)
      .then((result) => {
        logger.debug(JSON.stringify(result));
        res.status(200).json(result);
      })
      .catch((err) => {
        logger.error(err);
      });
  } catch (err) {
    if (isRifError(err, res)) return;
    next(err);
  }
});

export default router;
