import {
  LockAssetV1Request,
  Validators,
  Interfaces as CopmIF,
} from "@hyperledger-cacti/cacti-copm-core";
import { Logger } from "@hyperledger/cactus-common";
import { AssetManager } from "@hyperledger/cacti-weaver-sdk-fabric";

export async function lockAssetV1Impl(
  req: LockAssetV1Request,
  log: Logger,
  contextFactory: CopmIF.DLTransactionContextFactory,
  contractName: string,
): Promise<string> {
  const params = Validators.validateLockAssetRequest(req);

  const transactionContext = await contextFactory.getTransactionContext(
    params.owner,
  );

  const serializeAgreementFunc = params.asset.isNFT()
    ? AssetManager.createAssetExchangeAgreementSerialized
    : AssetManager.createFungibleAssetExchangeAgreementSerialized;

  const agreementStr = serializeAgreementFunc(
    params.asset.assetType,
    params.asset.idOrQuantity(),
    params.destinationCertificate,
    params.sourceCertificate,
  );

  const lockInfoStr = AssetManager.createAssetLockInfoSerialized(
    params.hashInfo,
    Math.floor(Date.now() / 1000) + params.expirySecs,
  );

  const claimId = await transactionContext.invoke({
    contract: contractName,
    method: params.asset.isNFT() ? "LockAsset" : "LockFungibleAsset",
    args: [agreementStr, lockInfoStr],
  });

  log.debug("lock complete");
  return claimId;
}
