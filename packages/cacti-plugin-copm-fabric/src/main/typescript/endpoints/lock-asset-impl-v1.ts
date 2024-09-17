import {
  LockAssetV1Request,
  Validators,
  Interfaces as CopmIF,
} from "@hyperledger-cacti/cacti-copm-core";
import { Logger } from "@hyperledger/cactus-common";
import { AssetManager } from "@hyperledger/cacti-weaver-sdk-fabric";
import { FabricConfiguration } from "../lib/fabric-configuration";

export async function lockAssetV1Impl(
  req: LockAssetV1Request,
  log: Logger,
  contextFactory: CopmIF.DLTransactionContextFactory,
  fabricConfig: FabricConfiguration,
): Promise<string> {
  const params = Validators.validateLockAssetRequest(req);

  const transactionContext = await contextFactory.getTransactionContext(
    params.sourceAccount,
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
    contractId: fabricConfig.getAssetContractName(params.asset),
    method: params.asset.isNFT() ? "LockAsset" : "LockFungibleAsset",
    args: [agreementStr, lockInfoStr],
  });

  log.debug("lock complete");
  return claimId;
}
