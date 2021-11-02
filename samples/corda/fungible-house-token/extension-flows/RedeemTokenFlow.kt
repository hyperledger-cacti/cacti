package net.corda.samples.tokenizedhouse.flows

import co.paralleluniverse.fibers.Suspendable
import com.r3.corda.lib.tokens.contracts.types.TokenPointer
import com.r3.corda.lib.tokens.contracts.types.TokenType
import com.r3.corda.lib.tokens.workflows.flows.rpc.RedeemFungibleTokens
import com.r3.corda.lib.tokens.workflows.flows.rpc.MoveFungibleTokensHandler
import net.corda.core.contracts.Amount
import net.corda.core.flows.*
import net.corda.core.identity.Party
import net.corda.core.node.services.queryBy
import net.corda.core.utilities.ProgressTracker
import net.corda.samples.tokenizedhouse.states.FungibleHouseTokenState
import net.corda.core.identity.CordaX500Name

// *********
// * Flows *
// *********
@InitiatingFlow
@StartableByRPC
class RedeemTokenFlow(val symbol: String,
                         val quantity: Long) : FlowLogic<String>() {
    override val progressTracker = ProgressTracker()

    @Suspendable
    override fun call():String {
        //get house states on ledger with uuid as input tokenId
        val stateAndRef = serviceHub.vaultService.queryBy<FungibleHouseTokenState>()
                .states.filter { it.state.data.symbol.equals(symbol) }[0]

        //get the RealEstateEvolvableTokenType object
        val evolvableTokenType = stateAndRef.state.data

        //get the pointer pointer to the house
        val tokenPointer: TokenPointer<FungibleHouseTokenState> = evolvableTokenType.toPointer(evolvableTokenType.javaClass)

        //specify how much amount to issue to holder
        val amount:Amount<TokenType> = Amount(quantity,tokenPointer)
        val issuerName: CordaX500Name = CordaX500Name.parse("O=PartyA,L=London,C=GB")
        val issuer = serviceHub.networkMapCache.getPeerByLegalName(issuerName)!!
        
        val stx = subFlow(RedeemFungibleTokens(amount,issuer))

        return "Redeemed $quantity $symbol token(s) of ${ourIdentity.name.organisation}"+
                "\ntxId: ${stx.id}"
    }
}






