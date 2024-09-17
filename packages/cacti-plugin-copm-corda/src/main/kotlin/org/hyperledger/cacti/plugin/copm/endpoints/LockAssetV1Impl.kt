package org.hyperledger.cacti.plugin.copm.endpoints

import org.hyperledger.cacti.plugin.copm.ApiCopmCordaServiceImpl.Companion.logger
import org.hyperledger.cacti.plugin.copm.DLTransactionContextFactory
import org.hyperledger.cacti.plugin.copm.interfaces.CordaConfiguration
import org.hyperledger.cacti.plugin.copm.types.DLTransactionParams
import org.hyperledger.cacti.plugin.copm.validators.ValidatedLockAssetV1Request
import org.hyperledger.cacti.plugin.copm.core.LockAssetV1200ResponsePb
import org.hyperledger.cacti.plugin.copm.core.services.defaultservice.DefaultServiceOuterClass
import org.hyperledger.cacti.weaver.sdk.corda.AssetManager


suspend fun lockAssetV1Impl(request: DefaultServiceOuterClass.LockAssetV1Request,
                            transactionContextFactory: DLTransactionContextFactory,
                            cordaConfig: CordaConfiguration
): LockAssetV1200ResponsePb.LockAssetV1200ResponsePB {
    logger.debug("start lockAssetV1")
    val data = ValidatedLockAssetV1Request(request)
    val contract = cordaConfig.assetContract(data.asset)
    val lockInfo = AssetManager.createAssetLockInfo(data.hash,data.expiryTimeFmt, data.expiryTime)
    val flow = if (data.asset.isNFT) "LockAsset" else "LockFungibleAsset"
    val agreement = if (data.asset.isNFT) AssetManager.createAssetExchangeAgreement(data.asset.assetType,data.asset.assetId, data.destAccount.accountId,"")
    else AssetManager.createFungibleAssetExchangeAgreement(data.asset.assetType,data.asset.assetQuantity,data.destAccount.accountId, "")
    val transaction = transactionContextFactory.getLocalTransactionContext(data.sourceAccount)
    val result = transaction.invoke(
        DLTransactionParams(
            cordaConfig.copmContract,
            flow,
            listOf(lockInfo,
                agreement,
                contract.getStateAndRefCmdStr,
                contract.burnAssetCmd,
                cordaConfig.getIssuer(data.asset),
                cordaConfig.getObservers(data.sourceAccount))
        )
    )
    return LockAssetV1200ResponsePb.LockAssetV1200ResponsePB
        .newBuilder()
        .setLockId(result.toString())
        .build()
}
