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
import java.util.Base64

/**
 * The GetAssetClaimStatusByPledgeId flow fetches the asset claim status in the importing network and returns as byte array.
 * It is called during the interop query by exporting network before performing the re-claim on asset pledged in exporting network.
 *
 * @property pledgeId The asset pledge id in the exporting network.
 * @property expiryTimeSecs The time epoch seconds after which re-claim of the asset is allowed.
 */
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
        var blankAssetJsonString = gson.toJson(blankAssetJson, FungibleHouseTokenJson::class.java)
        println("Before calling the asset-claim-status interop flow: ${blankAssetJsonString}\n")
        return subFlow(GetAssetClaimStatusState(pledgeId, expiryTimeSecs, blankAssetJsonString))
    }
}

/**
 * The GetAssetPledgeStatusByPledgeId flow fetches the asset pledge status in the exporting network and returns as byte array.
 * It is called during the interop query by importing network before performing the claim on asset pledged in exporting network.
 *
 * @property pledgeId The asset pledge id in the exporting network.
 * @property recipientNetworkId The id of the network importing/reciving the asset.
 */
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
        var blankAssetJsonString = gson.toJson(blankAssetJson, FungibleHouseTokenJson::class.java)
        println("Before calling the asset-pledge-status interop flow: ${blankAssetJsonString}\n")
        return subFlow(GetAssetPledgeStatus(pledgeId, recipientNetworkId, blankAssetJsonString))
    }
}

/**
 * The GetTokenStateAndContractId flow first checks if the JSON encoded object corresponds to the specified token attribute values.
 * It first unmarshalls the passed JSON encoded object and verifies if the attribte values match with the input values.
 *
 * @property marshalledAsset The JSON encoded fungible token asset.
 * @property type The fungible token asset type (e.g., "house").
 * @property quantity The number units of the fungible token asset.
 * @property locker The owner (certificate in base64 of the exporting network) of the token asset before asset-transfer.
 * @property holder The owner (certificate in base64 of the importing network) of the token asset after asset-transfer.
 */
@InitiatingFlow
@StartableByRPC
class GetTokenStateAndContractId(
    val marshalledAsset: String,
    val type: String,
    val quantity: Long,
    val locker: String,
    val holder: Party
): FlowLogic<Pair<String, FungibleToken>>() {

    override val progressTracker = ProgressTracker()

    @Suspendable
    override fun call(): Pair<String, FungibleToken> {

        println("GetTokenStateAndContractId() called")

        //val pledgedFungibleToken = Gson().fromJson(tokenAsset.toByteArray().toString(Charsets.UTF_8), FungibleHouseTokenJson::class.java)
        val pledgedFungibleToken = Gson().fromJson(marshalledAsset, FungibleHouseTokenJson::class.java)
        println("Unmarshalled fungible token asset is: ${pledgedFungibleToken}")

        if (pledgedFungibleToken.tokenType != type) {
            println("pledgedFungibleToken.tokenType(${pledgedFungibleToken.tokenType}) need to match with type(${type}).")
            throw Exception("pledgedFungibleToken.tokenType(${pledgedFungibleToken.tokenType}) need to match with type(${type}).")
        } else if (pledgedFungibleToken.numUnits != quantity) {
            println("pledgedFungibleToken.numUnits(${pledgedFungibleToken.numUnits}) need to match with quantity(${quantity}).")
            throw Exception("pledgedFungibleToken.numUnits(${pledgedFungibleToken.numUnits}) need to match with quantity(${quantity}).")
        } else if (pledgedFungibleToken.owner != locker) {
            println("pledgedFungibleToken.owner(${pledgedFungibleToken.owner}) need to match with locker(${locker}).")
            throw Exception("pledgedFungibleToken.owner(${pledgedFungibleToken.owner}) need to match with locker(${locker}).")
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

/**
 * The GetOurCertificateBase64 flow is used to fetch the certificate of the party owning the node in base64 format.
 */
@InitiatingFlow
@StartableByRPC
class GetOurCertificateBase64() : FlowLogic<String>() {
    @Suspendable
    override fun call(): String {

        return Base64.getEncoder().encodeToString(ourIdentityAndCert.certificate.toString().toByteArray())
    }
}

/**
 * The MarshalFungibleToken flow is used to obtain the JSON ending of the fungible tokens of interest to the user.
 * This function is typically called by the application client which may not know the full details of the token asset.
 *
 * @property type The fungible token type to be marshalled.
 * @property quantity The number units of the fungible tokens to be marshalled.
 */
@InitiatingFlow
@StartableByRPC
class MarshalFungibleToken(
    val type: String,
    val quantity: Long
) : FlowLogic<String>() {
    @Suspendable
    override fun call(): String {

        val assetJson = FungibleHouseTokenJson(
            tokenType = type,
            numUnits = quantity,
            owner = subFlow(GetOurCertificateBase64())
        )

        println("Created fungible token asset: ${assetJson}\n.")
        val gson = GsonBuilder().create();
        var assetJsonString = gson.toJson(assetJson, FungibleHouseTokenJson::class.java)

        return assetJsonString
    }
}