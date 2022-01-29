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

import net.corda.core.identity.Party
import net.corda.samples.tokenizedhouse.states.FungibleHouseTokenState
import com.r3.corda.lib.tokens.contracts.states.FungibleToken
import net.corda.core.node.services.queryBy
import net.corda.core.identity.CordaX500Name
import com.r3.corda.lib.tokens.contracts.types.TokenPointer
import com.r3.corda.lib.tokens.contracts.types.TokenType
import net.corda.core.contracts.Amount
import com.r3.corda.lib.tokens.contracts.FungibleTokenContract
import com.r3.corda.lib.tokens.contracts.utilities.issuedBy
import net.corda.core.utilities.ProgressTracker


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

@InitiatingFlow
@StartableByRPC
class GetTokenStateAndContractId(
    val tokenAsset: String,
    val type: String,
    val quantity: Long,
    val holder: Party
): FlowLogic<Pair<String, FungibleToken>>() {

    override val progressTracker = ProgressTracker()

    @Suspendable
    override fun call(): Pair<String, FungibleToken> {

        println("GetTokenStateAndContractId() called")

        //val pledgedFungibleToken = Gson().fromJson(tokenAsset.toByteArray().toString(Charsets.UTF_8), FungibleHouseTokenJson::class.java)
        val pledgedFungibleToken = Gson().fromJson(tokenAsset, FungibleHouseTokenJson::class.java)
        println("Unmarshalled fungible token asset is: ${pledgedFungibleToken}")

        if (pledgedFungibleToken.tokenType != type) {
            println("pledgedFungibleToken.tokenType(${pledgedFungibleToken.tokenType}) need to match with type(${type}).")
            throw Exception("pledgedFungibleToken.numUnits(${pledgedFungibleToken.numUnits}) need to match with quantity(${quantity}).")
        } else if (pledgedFungibleToken.numUnits != quantity) {
            println("pledgedFungibleToken.numUnits(${pledgedFungibleToken.numUnits}) need to match with quantity(${quantity}).")
            throw Exception("pledgedFungibleToken.numUnits(${pledgedFungibleToken.numUnits}) need to match with quantity(${quantity}).")
        }

        //get house states on ledger with uuid as input tokenId
        val stateAndRef = serviceHub.vaultService.queryBy<FungibleHouseTokenState>()
                .states.filter { it.state.data.symbol.equals(type) }[0]

        //get the RealEstateEvolvableTokenType object
        val evolvableTokenType = stateAndRef.state.data

        //get the pointer pointer to the house
        val tokenPointer: TokenPointer<FungibleHouseTokenState> = evolvableTokenType.toPointer(evolvableTokenType.javaClass)

        val issuerName: CordaX500Name = CordaX500Name.parse("O=PartyA,L=London,C=GB")
        val issuer = serviceHub.networkMapCache.getPeerByLegalName(issuerName)!!

        //assign the issuer to the house type who will be issuing the tokens
        val issuedTokenType = tokenPointer issuedBy issuer

        //specify how much amount to issue to holder
        val amount = Amount(quantity, issuedTokenType)

        val fungibletoken = FungibleToken(amount, holder)

        return Pair(FungibleTokenContract.contractId, fungibletoken)
    }
}