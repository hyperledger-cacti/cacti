package net.corda.samples.tokenizedhouse.flows

import com.weaver.corda.app.interop.states.AssetClaimStatusState
import com.weaver.corda.app.interop.flows.GetAssetClaimStatusState
import com.weaver.corda.app.interop.flows.GetAssetPledgeStatus
import com.weaver.corda.app.interop.flows.AssetClaimStatusStateToProtoBytes
import net.corda.samples.tokenizedhouse.states.FungibleHouseTokenJson
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import net.corda.core.flows.*
import co.paralleluniverse.fibers.Suspendable

@InitiatingFlow
@StartableByRPC
class GetAssetClaimStatusByPledgeId(
    val pledgeId: String,
    val expiryTimeSecs: String
) : FlowLogic<ByteArray>() {
    @Suspendable
    override fun call(): ByteArray {

        val pledgeExpiryTimeSecs: Long
        pledgeExpiryTimeSecs = expiryTimeSecs.toLong()
        println("pledgeId: ${pledgeId} and pledgeExpiryTimeSecs: ${pledgeExpiryTimeSecs}\n")
        val blankAssetJson = FungibleHouseTokenJson(
            tokenType = "",
            numUnits = 0L,
            owner = ""
        )
        println("Created empty house token asset ${blankAssetJson}\n")
        val gson = GsonBuilder().create();
        var blankAssetJsonBytes = gson.toJson(blankAssetJson, FungibleHouseTokenJson::class.java)
        println("Before calling the asset-claim-status interop flow: ${blankAssetJsonBytes}\n")
        return subFlow(GetAssetClaimStatusState(pledgeId, expiryTimeSecs, blankAssetJsonBytes))
    }
}

@InitiatingFlow
@StartableByRPC
class GetAssetPledgeStatusByPledgeId(
    val pledgeId: String,
    val recipientNetworkId: String
) : FlowLogic<ByteArray>() {
    @Suspendable
    override fun call(): ByteArray {

        val blankAssetJson = FungibleHouseTokenJson(
            tokenType = "",
            numUnits = 0L,
            owner = ""
        )
        println("Created empty house token asset ${blankAssetJson}\n")
        val gson = GsonBuilder().create();
        var blankAssetJsonBytes = gson.toJson(blankAssetJson, FungibleHouseTokenJson::class.java)
        println("Before calling the asset-pledge-status interop flow: ${blankAssetJsonBytes}\n")
        return subFlow(GetAssetPledgeStatus(pledgeId, recipientNetworkId, blankAssetJsonBytes))
    }
}