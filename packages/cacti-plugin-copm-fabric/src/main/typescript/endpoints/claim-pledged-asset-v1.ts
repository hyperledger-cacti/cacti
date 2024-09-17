import { Logger } from "@hyperledger/cactus-common";
import {
  ClaimPledgedAssetV1Request,
  Interfaces as CopmIF,
  Validators,
} from "@hyperledger-cacti/cacti-copm-core";
import { FabricConfiguration } from "../lib/fabric-configuration";

export async function claimPledgedAssetV1Impl(
  req: ClaimPledgedAssetV1Request,
  log: Logger,
  contextFactory: CopmIF.DLTransactionContextFactory,
  interopConfig: CopmIF.InteropConfiguration,
  fabricConfig: FabricConfiguration,
): Promise<string> {
  const data = new Validators.ValidatedClaimPledgedAssetRequest(req);

  const interop_context = await contextFactory.getRemoteTransactionContext(
    data.destAccount,
    data.sourceNetwork,
  );

  const claimId = await interop_context.invokeFlow(
    interopConfig.getRemotePledgeStatusCmd(data.sourceNetwork, data),
    {
      contractId: fabricConfig.getAssetContractName(data.asset),
      method: data.asset.isNFT() ? "ClaimRemoteAsset" : "ClaimRemoteTokenAsset",
      args: [
        data.pledgeId,
        data.asset.assetType,
        data.asset.idOrQuantity(),
        data.sourceCert,
        data.sourceNetwork,
        "",
      ],
    },
  );

  log.debug("claim pledged asset complete");
  return claimId;
}
