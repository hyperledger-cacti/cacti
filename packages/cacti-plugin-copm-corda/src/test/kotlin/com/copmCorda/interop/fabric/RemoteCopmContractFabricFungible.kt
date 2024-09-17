package com.copmCorda.interop.fabric

import org.hyperledger.cacti.plugin.copm.interop.RemoteCopmContract
import org.hyperledger.cacti.plugin.copm.types.DLAsset
import org.hyperledger.cacti.plugin.copm.types.DLTransactionParams
import org.hyperledger.cacti.plugin.copm.validators.ValidatedClaimPledgedAssetV1Request

class RemoteCopmContractFabricFungible : RemoteCopmContract {

    override fun matchesNetworkTypeAndAsset(networkType: String, asset: DLAsset): Boolean {
        return networkType == "fabric" && ! asset.isNFT
    }
    override fun getPledgeInfoCmd(claim: ValidatedClaimPledgedAssetV1Request): DLTransactionParams {
        val params  = listOf<Any>(claim.pledgeId,
                                  claim.sourceCert,
                                  claim.destinationAccount.organization,
                                  claim.destCert)
        return DLTransactionParams("simpleassettransfer","GetTokenAssetPledgeStatus", params )
    }

}