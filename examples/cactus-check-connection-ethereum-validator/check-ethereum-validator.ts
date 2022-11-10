import { Router, NextFunction, Request, Response } from "express";
import { getLogger } from "log4js";
import { TransactionManagement } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/TransactionManagement";
import { RIFError } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/RIFError";
import { ConfigUtil } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/util/ConfigUtil";
import { TestEthereumVerifier } from "./TestEthereumVerifier";
import escapeHtml from "escape-html";

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
    res.render(escapeHtml(err.message));
    return true;
  }
  logger.error(`Error caught: ${err.statusCode}, ${err.message}`);
  return false;
}

function checkRequestType(requestType: string): string | boolean {

  if (requestType === undefined) {
    logger.error(`Unspecified type of request in request body. Use <async, sync>`);
    return false;
  }
  if (requestType.localeCompare("async") !== 0 && requestType.localeCompare("sync") !== 0) {
    logger.error(`Wrong request type specified in request: ${requestType}. Use <async, sync>`);
    return false;
  }
  return requestType;
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

const testEthereumVerifier: TestEthereumVerifier = new TestEthereumVerifier();

router.post("/getBalance", (req: Request, res: Response, next: NextFunction) => {
  logger.info("check-ethereum-validator()");

  const requestType = checkRequestType(req.body.requestType);

  if (requestType === false) {
    return res.end();
  }

  logger.debug(`Sending ${requestType} request on 'getBalance' endpoint`);

  try {
    testEthereumVerifier.getBalance(req.body.account,
      requestType.toString())
      .then((result: any) => {
        logger.debug(JSON.stringify(result));
        res.status(200).json(result);
      })
      .catch((err: any) => {
        logger.error(err);
      });
  } catch (err) {
    if (isRifError(err, res)) return;
    next(err);
  }

});

router.post("/transferAssets", (req: Request, res: Response, next: NextFunction) => {

  logger.info("check-ethereum-validator()");

  const requestType = checkRequestType(req.body.requestType);

  if (requestType === false) {
    return res.end();
  }

  logger.debug(`Sending ${req.body.requestType} request on 'transferAsset' endpoint`);

  try {
    testEthereumVerifier.transferAsset(req.body.srcAccount,
      req.body.destAccount,
      req.body.amount,
      req.body.requestType)
      .then((result: any) => {
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


router.get("/stopMonitor", (req: Request, res: Response, next: NextFunction) => {

  logger.info("check-ethereum-validator()");

  try {
    testEthereumVerifier.stopMonitor()
    res.status(200).json(true);
  } catch (err) {
    if (isRifError(err, res)) return;
    next(err);
  }
});

router.get("/startMonitor", (req: Request, res: Response, next: NextFunction) => {

  logger.info("check-ethereum-validator()");

  try {
    testEthereumVerifier.startMonitor()
    res.status(200).json(true);
  } catch (err) {
    if (isRifError(err, res)) return;
    next(err);
  }
});

export default router;
