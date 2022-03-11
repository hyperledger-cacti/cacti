package net.corda.samples.tokenizedhouse.flows

import com.weaver.corda.app.interop.states.AssetPledgeState
import com.weaver.corda.app.interop.flows.GetAssetClaimStatusState
import com.weaver.corda.app.interop.flows.GetAssetPledgeStatus
import com.weaver.corda.app.interop.flows.AssetPledgeStateToProtoBytes
import net.corda.samples.tokenizedhouse.states.FungibleHouseTokenJson
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import net.corda.core.node.ServiceHub
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
import net.corda.core.contracts.ContractState
import net.corda.core.contracts.StaticPointer
import com.r3.corda.lib.tokens.contracts.FungibleTokenContract
import com.r3.corda.lib.tokens.contracts.utilities.issuedBy
import java.util.Base64

/**
 * The GetAssetClaimStatusByPledgeId flow fetches the asset claim status in the importing network and returns as byte array.
 * It is called during the interop query by exporting network before performing the re-claim on asset pledged in exporting network.
 *
 * @property pledgeId The unique identifier representing the pledge on an asset for transfer, in the exporting n/w.
 * @property expiryTimeSecs The time epoch seconds after which re-claim of the asset is allowed.
 */
@InitiatingFlow
@StartableByRPC
class GetAssetClaimStatusByPledgeId(
    val pledgeId: String,
    val expiryTimeSecs: String
) : FlowLogic<ByteArray>() {
    /**
     * The call() method captures the logic to fetch [AssetClaimStatusState] vault state from importing n/w.
     *
     * @return Returns ByteArray.
     */

    @Suspendable
    override fun call(): ByteArray {

        println("Inside GetAssetClaimStatusByPledgeId(), pledgeId: $pledgeId and expiryTimeSecs: $expiryTimeSecs.")

        println("Creating empty fungible token asset JSON.")
        var marshalledBlankAssetJson = marshalFungibleToken("dummy-token-type", 0L, "dummy-owner-cert")

        return subFlow(GetAssetClaimStatusState(pledgeId, expiryTimeSecs, marshalledBlankAssetJson))
    }
}

/**
 * The getHouseTokenJsonStringFromStatePointer function fetches the fungible token state from its state pointer [AssetPledgeState].assetStatePointer
 * and creates marshalled JSON encoded object which is returned.
 * This function is called by the exporting network in the context of interop-query from the importing network
 * to the exporting network before performing claim on remote asset.
 *
 * @property assetPledgeState The (interop) vault state that represents the pledge details on the ledger.
 */
fun getHouseTokenJsonStringFromStatePointer(assetPledgeState: AssetPledgeState, serviceHub: ServiceHub) : String {

    if (assetPledgeState.assetStatePointer == null) {
        // Typically, [AssetPledgeState].assetStatePointer will be null only in the case of pledge details not
        // being available for a given pledgeId. The flow GetAssetPledgeStatus in AssetTransferFlows sets this
        // pointer to null if the pledge-state is not available in the context of the interop-query from the
        // importing n/w to the exporting n/w. Hence return empty string, and this will not be passed to the
        // JSON unmarshalling method GetTokenStateAndContractId since the expiryTime will be elapsed for the
        // claim to happen (i.e., if assetStatePointer is null, then expiryTimeSecs will be set to past time).
        return ""
    }

    val assetStatePointer: StaticPointer<ContractState> = assetPledgeState.assetStatePointer!!
    val assetState = assetStatePointer.resolve(serviceHub).state.data as FungibleToken

    @Suppress("UNCHECKED_CAST")
    val fungibleHouseTokenPointer: TokenPointer<FungibleHouseTokenState> = assetState.amount.token.tokenType as TokenPointer<FungibleHouseTokenState>
    val fungibleHouseTokenState = fungibleHouseTokenPointer.pointer.resolve(serviceHub).state.data

    println("Creating fungible token asset JSON from StatePointer.")
    var marshalledAssetJson =
        marshalFungibleToken(fungibleHouseTokenState.symbol, assetState.amount.quantity, assetPledgeState.lockerCert)

    return marshalledAssetJson
}

/**
 * The GetAssetPledgeStatusByPledgeId flow fetches the fungible tokens pledge status in the exporting network and returns as byte array.
 * It is called during the interop query by importing network before performing the claim on fungible tokens pledged in exporting network.
 *
 * @property pledgeId The unique identifier representing the pledge on fungible tokens for transfer, in the exporting n/w.
 * @property recipientNetworkId The id of the network in which the pledged fungible tokens will be claimed.
 */
@InitiatingFlow
@StartableByRPC
class GetAssetPledgeStatusByPledgeId(
    val pledgeId: String,
    val recipientNetworkId: String
) : FlowLogic<ByteArray>() {
    @Suspendable
    override fun call(): ByteArray {

        var assetPledgeState: AssetPledgeState = subFlow(GetAssetPledgeStatus(pledgeId, recipientNetworkId))
        println("Obtained [AssetPledgeState] vault state: ${assetPledgeState}.\n")
        val marshalledAssetJson = getHouseTokenJsonStringFromStatePointer(assetPledgeState, serviceHub)

        return subFlow(AssetPledgeStateToProtoBytes(assetPledgeState, marshalledAssetJson))
    }
}

/**
 * The GetTokenStateAndContractId flow first checks if the JSON encoded object corresponds to the specified token attribute values.
 * It first unmarshalls the passed JSON encoded object and verifies if the attribte values match with the input values. Then, it creates
 * the fungible token state object corresponding to the JSON object passed as input.
 *
 * Note: This function is passed as an argument to resolveGetAssetStateAndContractIdFlow() during reclaim-pledged asset transaction.
 * This function has five arguements. A similar function is implemented for SimpleAsset and SimpleBondAsset with
 * the "same number and type" of arguements. Based on the function name passed, <ContractId, State> will be fetched at runtime.
 *
 * @property marshalledAsset The JSON encoded fungible token asset.
 * @property type The fungible token asset type (e.g., "house").
 * @property quantity The number of units of the fungible token asset, passed as String.
 * @property lockerCert The owner (certificate in base64 of the exporting network) of the token asset before asset-transfer.
 * @property holder The party that owns the fungible tokens after asset-transfer.
 */
@InitiatingFlow
@StartableByRPC
class GetTokenStateAndContractId(
    val marshalledAsset: String,
    val type: String,
    val quantity: Long,
    val lockerCert: String,
    val holder: Party
): FlowLogic<Pair<String, FungibleToken>>() {
    @Suspendable
    override fun call(): Pair<String, FungibleToken> {

        println("Inside GetTokenStateAndContractId().")

        // must have used GsonBuilder().create().toJson() at the time of serialization of the JSON
        val pledgedFungibleToken: FungibleHouseTokenJson = Gson().fromJson(marshalledAsset, FungibleHouseTokenJson::class.java)
        println("Unmarshalled fungible token asset is: ${pledgedFungibleToken}")

        if (pledgedFungibleToken.tokenType != type) {
            println("pledgedFungibleToken.tokenType(${pledgedFungibleToken.tokenType}) need to match with type(${type}).")
            throw Exception("pledgedFungibleToken.tokenType(${pledgedFungibleToken.tokenType}) need to match with type(${type}).")
        } else if (pledgedFungibleToken.numUnits != quantity) {
            println("pledgedFungibleToken.numUnits(${pledgedFungibleToken.numUnits}) need to match with quantity(${quantity}).")
            throw Exception("pledgedFungibleToken.numUnits(${pledgedFungibleToken.numUnits}) need to match with quantity(${quantity}).")
        } else if (pledgedFungibleToken.owner != lockerCert) {
            println("pledgedFungibleToken.owner(${pledgedFungibleToken.owner}) need to match with locker(${lockerCert}).")
            throw Exception("pledgedFungibleToken.owner(${pledgedFungibleToken.owner}) need to match with locker(${lockerCert}).")
        }

        //get house states on ledger with uuid as input tokenId
        val stateAndRef = serviceHub.vaultService.queryBy<FungibleHouseTokenState>()
                .states.filter { it.state.data.symbol.equals(type) }[0]

        //get the RealEstateEvolvableTokenType object
        val evolvableTokenType: FungibleHouseTokenState = stateAndRef.state.data

        //get the pointer pointer to the house
        val tokenPointer: TokenPointer<FungibleHouseTokenState> = evolvableTokenType.toPointer(evolvableTokenType.javaClass)

        val issuerName: CordaX500Name = CordaX500Name.parse("O=PartyA,L=London,C=GB")
        val issuer: Party = serviceHub.networkMapCache.getPeerByLegalName(issuerName)!!

        //assign the issuer to the house type who will be issuing the tokens
        val issuedTokenType = tokenPointer issuedBy issuer

        //specify how much amount to issue to holder
        val amount = Amount(quantity, issuedTokenType)

        val fungibletoken = FungibleToken(amount, holder)

        return Pair(FungibleTokenContract.contractId, fungibletoken)
    }
}

/**
 * The marshalFungibleToken function is used to obtain the JSON encoding of the fungible tokens of interest to the user.
 * This function is typically called by the application client which may not know the full details of the token asset.
 *
 * @property type type The fungible token asset type (e.g., "house").
 * @property quantity The number of units of the fungible token asset.
 * @property onwerCert The certificate of the owner of asset in base64 form
 */
fun marshalFungibleToken(type: String, quantity: Long, ownerCert: String) : String {

    val assetJson = FungibleHouseTokenJson(
        tokenType = type,
        numUnits = quantity,
        owner = ownerCert
    )

    println("Inside marshalFungibleToken(), created fungible token asset: ${assetJson}\n.")
    val gson = GsonBuilder().create();
    // must use Gson().fromJson() at the time of deserialization of the JSON
    var marshalledAssetJson = gson.toJson(assetJson, FungibleHouseTokenJson::class.java)

    return marshalledAssetJson
}