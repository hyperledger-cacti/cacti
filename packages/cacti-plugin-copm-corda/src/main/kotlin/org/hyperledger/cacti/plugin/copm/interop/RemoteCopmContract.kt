package org.hyperledger.cacti.plugin.copm.interop

import org.hyperledger.cacti.plugin.copm.types.DLAsset
import org.hyperledger.cacti.plugin.copm.types.DLTransactionParams
import org.hyperledger.cacti.plugin.copm.validators.ValidatedClaimPledgedAssetV1Request

interface RemoteCopmContract {
    fun matchesNetworkTypeAndAsset(networkType: String, asset: DLAsset): Boolean
    fun getPledgeInfoCmd(claim: ValidatedClaimPledgedAssetV1Request) : DLTransactionParams
}