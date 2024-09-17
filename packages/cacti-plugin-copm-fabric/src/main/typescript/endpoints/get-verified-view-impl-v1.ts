import {
  GetVerifiedViewV1Request,
  Validators,
  Interfaces as CopmIF,
} from "@hyperledger-cacti/cacti-copm-core";
import { Logger } from "@hyperledger/cactus-common";

export async function getVerifiedViewV1Impl(
  req: GetVerifiedViewV1Request,
  contextFactory: CopmIF.DLTransactionContextFactory,
  log: Logger,
): Promise<string> {
  const params = Validators.validateGetVerifiedViewRequest(req);
  const remoteContext = await contextFactory.getRemoteTransactionContext(
    params.account,
    params.remoteNetwork,
  );

  const data = await remoteContext.invoke({
    contractId: params.contractId,
    method: params.method,
    args: params.args,
  });

  log.debug("view complete");
  return data;
}
