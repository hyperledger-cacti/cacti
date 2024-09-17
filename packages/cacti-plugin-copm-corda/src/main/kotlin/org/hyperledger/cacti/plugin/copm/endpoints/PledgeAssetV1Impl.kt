package org.hyperledger.cacti.plugin.copm.endpoints

import org.hyperledger.cacti.plugin.copm.ApiCopmCordaServiceImpl.Companion.logger
import org.hyperledger.cacti.plugin.copm.DLTransactionContextFactory
import org.hyperledger.cacti.plugin.copm.corda.CordaAssetPledge
import org.hyperledger.cacti.plugin.copm.interfaces.CordaConfiguration
import org.hyperledger.cacti.plugin.copm.types.DLTransactionParams
import org.hyperledger.cacti.plugin.copm.validators.ValidatedPledgeAssetV1Request
import org.hyperledger.cacti.plugin.copm.core.PledgeAssetV1200ResponsePb
import org.hyperledger.cacti.plugin.copm.core.services.defaultservice.DefaultServiceOuterClass

suspend fun pledgeAssetV1Impl(request: DefaultServiceOuterClass.PledgeAssetV1Request,
                              contextFactory: DLTransactionContextFactory,
                              cordaConfig: CordaConfiguration
): PledgeAssetV1200ResponsePb.PledgeAssetV1200ResponsePB {
    logger.debug("starting pledge asset")
    val data = ValidatedPledgeAssetV1Request(request)
    val assetContract = cordaConfig.assetContract(data.asset)
    val transaction = contextFactory.getLocalTransactionContext(data.sourceAccount)
    val params = CordaAssetPledge(data,
        assetContract.getStateAndRefCmdStr,
        assetContract.burnAssetCmd,
        cordaConfig.getIssuer(data.asset),
        cordaConfig.getObservers(data.destinationAccount))
    val result = transaction.invoke(
        DLTransactionParams(cordaConfig.copmContract,
            "AssetTransferPledge",
            listOf( params ))
    )
    return PledgeAssetV1200ResponsePb.PledgeAssetV1200ResponsePB
        .newBuilder()
        .setPledgeId(result?.toString())
        .build()
}
