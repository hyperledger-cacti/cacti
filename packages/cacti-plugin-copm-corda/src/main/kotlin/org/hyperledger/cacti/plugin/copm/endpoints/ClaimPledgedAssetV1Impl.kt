package org.hyperledger.cacti.plugin.copm.endpoints

import org.hyperledger.cacti.plugin.copm.ApiCopmCordaServiceImpl.Companion.logger
import org.hyperledger.cacti.plugin.copm.DLTransactionContextFactory
import org.hyperledger.cacti.plugin.copm.corda.CordaAssetClaim
import org.hyperledger.cacti.plugin.copm.interfaces.CordaConfiguration
import org.hyperledger.cacti.plugin.copm.interfaces.InteropConfig
import org.hyperledger.cacti.plugin.copm.types.DLTransactionParams
import org.hyperledger.cacti.plugin.copm.validators.ValidatedClaimPledgedAssetV1Request
import net.corda.core.contracts.UniqueIdentifier
import org.hyperledger.cacti.plugin.copm.core.ClaimPledgedAssetV1200ResponsePb
import org.hyperledger.cacti.plugin.copm.core.services.defaultservice.DefaultServiceOuterClass

suspend fun claimPledgedAssetV1Impl(request: DefaultServiceOuterClass.ClaimPledgedAssetV1Request,
                                    contextFactory: DLTransactionContextFactory,
                                    cordaConfig: CordaConfiguration,
                                    interopConfig: InteropConfig
): ClaimPledgedAssetV1200ResponsePb.ClaimPledgedAssetV1200ResponsePB {
    logger.debug("start claimPledgedAssetV1")
    val data = ValidatedClaimPledgedAssetV1Request(request)
    val assetContract = cordaConfig.assetContract(data.asset)
    val remoteContext = contextFactory.getRemoteTransactionContext(data.destinationAccount, data.sourceAccount.organization)
    val remoteCmd = interopConfig.getRemoteCopmContract(data.sourceAccount.organization, data.asset).getPledgeInfoCmd(data)
    logger.debug("getting remote pledge id")
    @Suppress("Unchecked_cast")
    val pledgeStatusLinearId = (remoteContext.invoke(remoteCmd) as Array<UniqueIdentifier>)[0].toString()
    logger.debug("claiming pledge $pledgeStatusLinearId")
    val params = CordaAssetClaim(
        data,
        pledgeStatusLinearId,
        assetContract.issueAssetCmd,
        assetContract.getStateAndContractIdCmdStr,
        cordaConfig.getIssuer(data.asset),
        cordaConfig.getObservers(data.destinationAccount)
    )
    val transaction = contextFactory.getLocalTransactionContext(data.destinationAccount)
    val res = transaction.invoke(
        DLTransactionParams(
            cordaConfig.copmContract,
            "AssetTransferClaim",
            listOf(params)
        )
    )
    logger.debug("done claiming pledge ${res.toString()}")
    return ClaimPledgedAssetV1200ResponsePb.ClaimPledgedAssetV1200ResponsePB.newBuilder().setClaimId(res.toString())
        .build()
}
