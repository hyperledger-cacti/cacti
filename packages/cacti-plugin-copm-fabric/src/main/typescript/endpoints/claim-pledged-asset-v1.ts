import { Logger } from "@hyperledger/cactus-common";
import {
  ClaimPledgedAssetV1Request,
  Interfaces as CopmIF,
  Validators,
} from "@hyperledger/cacti-copm-core";

export async function claimPledgedAssetV1Impl(
  req: ClaimPledgedAssetV1Request,
  log: Logger,
  contextFactory: CopmIF.DLTransactionContextFactory,
  contractName: string,
): Promise<string> {
  const data = Validators.validateClaimPledgedAssetRequest(req);

  const interop_context = await contextFactory.getRemoteTransactionContext(
    data.destAccount,
    data.sourceNetwork,
  );

  const claimId = await interop_context.invokeFlow(
    {
      contract: contractName,
      method: "GetAssetPledgeStatus",
      args: [
        data.pledgeId,
        data.sourceCert,
        data.destAccount.organization,
        data.destCert,
      ],
    },
    {
      contract: contractName,
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
