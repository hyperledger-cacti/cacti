package net.corda.samples.tokenizedhouse.flows

import com.weaver.corda.app.interop.states.AssetClaimStatusState
import com.weaver.corda.app.interop.flows.GetAssetClaimStatusState
import com.weaver.corda.app.interop.flows.AssetClaimStatusStateToProtoBytes
import net.corda.samples.tokenizedhouse.states.FungibleHouseTokenJson
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import net.corda.core.flows.*
import co.paralleluniverse.fibers.Suspendable

@InitiatingFlow
@StartableByRPC
class GetAssetClaimStatusByPledgeId(val pledgeId: String, val pledgeExpiryTimeSecs: Long) : FlowLogic<ByteArray>() {
    @Suspendable
    override fun call(): ByteArray {

        val blankAssetJson = FungibleHouseTokenJson(
            tokenType = "",
            numUnits = 0L,
            owner = ""
        )
        println("Created empty house token asset ${blankAssetJson}\n")
        val gson = GsonBuilder().create();
        var blankAssetJsonBytes = gson.toJson(blankAssetJson, FungibleHouseTokenJson::class.java).toByteArray()
        val assetClaimStatusState: AssetClaimStatusState = subFlow(GetAssetClaimStatusState(pledgeId, pledgeExpiryTimeSecs, blankAssetJsonBytes))

        return subFlow(AssetClaimStatusStateToProtoBytes(assetClaimStatusState))
    }
}