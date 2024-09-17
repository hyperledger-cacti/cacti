import { Logger } from "@hyperledger/cactus-common";
import {
  PledgeAssetV1Request,
  Validators,
  Interfaces as CopmIF,
} from "@hyperledger-cacti/cacti-copm-core";
import { FabricConfiguration } from "../lib/fabric-configuration";

export async function pledgeAssetV1Impl(
  req: PledgeAssetV1Request,
  log: Logger,
  contextFactory: CopmIF.DLTransactionContextFactory,
  fabricConfig: FabricConfiguration,
): Promise<string> {
  log.debug("PledgeAssetV1Impl called");
  const data = Validators.validatePledgeAssetRequest(req);

  const transactionContext = await contextFactory.getTransactionContext(
    data.source,
  );

  const pledgeId = await transactionContext.invoke({
    contractId: fabricConfig.getAssetContractName(data.asset),
    method: data.asset.isNFT() ? "PledgeAsset" : "PledgeTokenAsset",
    args: [
      data.asset.assetType,
      data.asset.idOrQuantity(),
      data.destinationOrganization,
      data.destinationCertificate,
      (Math.floor(Date.now() / 1000) + data.expirySecs).toString(),
    ],
  });

  log.debug("PledgeAssetV1Impl complete");
  return pledgeId;
}
