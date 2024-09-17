import { Logger } from "@hyperledger/cactus-common";
import { AssetManager } from "@hyperledger/cacti-weaver-sdk-fabric";
import {
  Validators,
  ClaimLockedAssetV1Request,
  Interfaces as CopmIF,
} from "@hyperledger-cacti/cacti-copm-core";
import { FabricConfiguration } from "../lib/fabric-configuration";

export async function claimLockedAssetV1Impl(
  req: ClaimLockedAssetV1Request,
  log: Logger,
  contextFactory: CopmIF.DLTransactionContextFactory,
  fabricConfig: FabricConfiguration,
): Promise<string> {
  const params = Validators.validateClaimLockedAssetRequest(req);
  const claimInfoStr = AssetManager.createAssetClaimInfoSerialized(
    params.hashInfo,
  );

  const transactionContext = await contextFactory.getTransactionContext(
    params.destination,
  );

  const claimId = await transactionContext.invoke({
    contractId: fabricConfig.getAssetContractName(params.asset),
    method: params.asset.isNFT()
      ? "ClaimAssetUsingContractId"
      : "ClaimFungibleAsset",
    args: [params.lockId, claimInfoStr],
  });

  log.debug("claim complete");
  return claimId;
}
