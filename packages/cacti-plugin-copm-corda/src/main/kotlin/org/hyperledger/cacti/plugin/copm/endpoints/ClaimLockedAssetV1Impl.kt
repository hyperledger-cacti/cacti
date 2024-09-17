package org.hyperledger.cacti.plugin.copm.endpoints

import org.hyperledger.cacti.plugin.copm.ApiCopmCordaServiceImpl.Companion.logger
import org.hyperledger.cacti.plugin.copm.DLTransactionContextFactory
import org.hyperledger.cacti.plugin.copm.interfaces.CordaConfiguration
import org.hyperledger.cacti.plugin.copm.types.DLTransactionParams
import org.hyperledger.cacti.plugin.copm.validators.ValidatedClaimLockedAssetV1Request
import org.hyperledger.cacti.plugin.copm.core.ClaimPledgedAssetV1200ResponsePb
import org.hyperledger.cacti.plugin.copm.core.services.defaultservice.DefaultServiceOuterClass
import org.hyperledger.cacti.weaver.sdk.corda.AssetManager

suspend fun claimLockedAssetV1Impl(request: DefaultServiceOuterClass.ClaimLockedAssetV1Request,
                               transactionContextFactory: DLTransactionContextFactory,
                               cordaConfig: CordaConfiguration
): ClaimPledgedAssetV1200ResponsePb.ClaimPledgedAssetV1200ResponsePB {
    logger.debug("start claimLockedAssetV1")
    val data = ValidatedClaimLockedAssetV1Request(request)
    val assetContract = cordaConfig.assetContract(data.asset)
    val transactionContext = transactionContextFactory.getLocalTransactionContext(data.recipient)
    val claimId = transactionContext.invoke(
        DLTransactionParams(
            cordaConfig.copmContract,
            "ClaimAsset",
            listOf(data.contractId,
                AssetManager.createAssetClaimInfo(data.hash),
                assetContract.issueAssetCmd,
                assetContract.updateAssetOwnerCmdStr,
                cordaConfig.getIssuer(data.asset),
                cordaConfig.getObservers(data.recipient))
        )
    )
    return ClaimPledgedAssetV1200ResponsePb.ClaimPledgedAssetV1200ResponsePB.newBuilder()
        .setClaimId(claimId.toString())
        .build()
}
