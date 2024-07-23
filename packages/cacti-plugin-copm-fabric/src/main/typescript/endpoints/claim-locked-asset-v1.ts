import { Logger } from "@hyperledger/cactus-common";
import { AssetManager } from "@hyperledger/cacti-weaver-sdk-fabric";
import {
  DLTransactionParams,
  Validators,
  ClaimLockedAssetV1Request,
  Interfaces as CopmIF,
} from "@hyperledger-cacti/cacti-copm-core";

export async function claimLockedAssetV1Impl(
  req: ClaimLockedAssetV1Request,
  log: Logger,
  contextFactory: CopmIF.DLTransactionContextFactory,
  contractName: string,
): Promise<string> {
  let transactionParams: DLTransactionParams;
  const params = Validators.validateClaimLockedAssetRequest(req);
  const claimInfoStr = AssetManager.createAssetClaimInfoSerialized(
    params.hashInfo,
  );

  if (params.asset.isNFT()) {
    const agreementStr = AssetManager.createAssetExchangeAgreementSerialized(
      params.asset.assetType,
      params.asset.idOrQuantity(),
      params.destCertificate,
      params.sourceCertificate,
    );
    transactionParams = {
      contract: contractName,
      method: "ClaimAsset",
      args: [agreementStr, claimInfoStr],
    };
  } else {
    // NOTE: can not currently claim NFTs with only a lock id
    transactionParams = {
      contract: contractName,
      method: "ClaimFungibleAsset",
      args: [params.lockId, claimInfoStr],
    };
  }

  const transactionContext = await contextFactory.getTransactionContext(
    params.destination,
  );
  const claimId = await transactionContext.invoke(transactionParams);

  log.debug("claim complete");
  return claimId;
}
