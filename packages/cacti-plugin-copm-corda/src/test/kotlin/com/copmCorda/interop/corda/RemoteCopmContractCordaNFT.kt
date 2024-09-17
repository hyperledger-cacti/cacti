package com.copmCorda.interop.corda

import org.hyperledger.cacti.plugin.copm.interop.RemoteCopmContract
import org.hyperledger.cacti.plugin.copm.types.DLAsset
import org.hyperledger.cacti.plugin.copm.types.DLTransactionParams
import org.hyperledger.cacti.plugin.copm.validators.ValidatedClaimPledgedAssetV1Request

class RemoteCopmContractCordaNFT : RemoteCopmContract {

    override fun matchesNetworkTypeAndAsset(networkType: String, asset: DLAsset): Boolean {
        return networkType == "corda" && asset.isNFT
    }

    override fun getPledgeInfoCmd(claim: ValidatedClaimPledgedAssetV1Request): DLTransactionParams {
        return DLTransactionParams("com.cordaSimpleApplication.flow",
            "GetBondAssetPledgeStatusByPledgeId",
            listOf(claim.pledgeId, claim.destinationAccount.organization))
    }
}
