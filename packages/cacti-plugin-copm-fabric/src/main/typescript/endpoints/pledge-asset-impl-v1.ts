import { Logger } from "@hyperledger/cactus-common";
import {
  PledgeAssetV1Request,
  Validators,
  Interfaces as CopmIF,
} from "@hyperledger/cacti-copm-core";

export async function pledgeAssetV1Impl(
  req: PledgeAssetV1Request,
  log: Logger,
  contextFactory: CopmIF.DLTransactionContextFactory,
  contractName: string,
): Promise<string> {
  const data = Validators.validatePledgeAssetRequest(req);

  const transactionContext = await contextFactory.getTransactionContext(
    data.source,
  );

  const pledgeId = await transactionContext.invoke({
    contract: contractName,
    method: data.asset.isNFT() ? "PledgeAsset" : "PledgeTokenAsset",
    args: [
      data.asset.assetType,
      data.asset.idOrQuantity(),
      data.destinationNetwork,
      data.destinationCertificate,
      (Math.floor(Date.now() / 1000) + data.expirySecs).toString(),
    ],
  });

  return pledgeId;
}
