package net.corda.samples.tokenizedhouse.flows

import co.paralleluniverse.fibers.Suspendable
import com.r3.corda.lib.tokens.contracts.types.TokenPointer
import com.r3.corda.lib.tokens.contracts.types.TokenType
import net.corda.core.contracts.Amount
import net.corda.core.flows.*
import net.corda.core.identity.Party
import net.corda.core.node.services.queryBy
import net.corda.core.utilities.ProgressTracker
import net.corda.samples.tokenizedhouse.states.FungibleHouseTokenState
import com.r3.corda.lib.tokens.selection.database.selector.DatabaseTokenSelection
import com.r3.corda.lib.tokens.workflows.utilities.tokenAmountWithIssuerCriteria
import com.r3.corda.lib.tokens.selection.TokenQueryBy

import net.corda.core.contracts.StateAndRef
import com.r3.corda.lib.tokens.contracts.states.FungibleToken
import net.corda.core.identity.CordaX500Name
import com.r3.corda.lib.tokens.contracts.types.IssuedTokenType
import com.r3.corda.lib.tokens.contracts.utilities.issuedBy
import net.corda.core.contracts.StaticPointer
import net.corda.core.transactions.TransactionBuilder
import com.r3.corda.lib.tokens.contracts.commands.MoveTokenCommand
import com.r3.corda.lib.tokens.contracts.FungibleTokenContract
import net.corda.core.contracts.Command



// *********
// * Flows *
// *********
@InitiatingFlow
@StartableByRPC
class GetIssuedTokenType(val symbol: String) : FlowLogic<IssuedTokenType>() {
    override val progressTracker = ProgressTracker()

    @Suspendable
    override fun call():IssuedTokenType {
        //get house states on ledger with uuid as input tokenId
        val stateAndRef = serviceHub.vaultService.queryBy<FungibleHouseTokenState>()
                .states.filter { it.state.data.symbol.equals(symbol) }[0]

        //get the RealEstateEvolvableTokenType object
        val evolvableTokenType = stateAndRef.state.data

        //get the pointer to the house
        val tokenPointer: TokenPointer<FungibleHouseTokenState> = evolvableTokenType.toPointer(evolvableTokenType.javaClass)
        val issuerName: CordaX500Name = CordaX500Name.parse("O=PartyA,L=London,C=GB")
        val issuer = serviceHub.networkMapCache.getPeerByLegalName(issuerName)!!
        
        val issuedTokenType = tokenPointer issuedBy issuer 

        return issuedTokenType
    }
}

@InitiatingFlow
@StartableByRPC
class RetrieveStateAndRef(
    val type: String, 
    val quantity: Long
): FlowLogic<StateAndRef<FungibleToken>>() {
    
    override val progressTracker = ProgressTracker()

    @Suspendable
    override fun call(): StateAndRef<FungibleToken> {

        println("Retrieve State and Ref")
        
        //get house states on ledger with uuid as input tokenId
        val stateAndRef = serviceHub.vaultService.queryBy<FungibleHouseTokenState>()
                .states.filter { it.state.data.symbol.equals(type) }[0]

        //get the RealEstateEvolvableTokenType object
        val evolvableTokenType = stateAndRef.state.data

        //get the pointer pointer to the house
        val tokenPointer: TokenPointer<FungibleHouseTokenState> = evolvableTokenType.toPointer(evolvableTokenType.javaClass)

        //specify how much amount to issue to holder
        val amount:Amount<TokenType> = Amount(quantity,tokenPointer)

        println("Amount: $amount")

        val selector = DatabaseTokenSelection(serviceHub)
        val issuerName: CordaX500Name = CordaX500Name.parse("O=PartyA,L=London,C=GB")
        val issuer = serviceHub.networkMapCache.getPeerByLegalName(issuerName)!!
        val baseCriteria = tokenAmountWithIssuerCriteria(amount.token, issuer)
        val queryCriteria = baseCriteria
        val fungibleStates = selector.selectTokens(amount, TokenQueryBy(issuer = issuer, queryCriteria = queryCriteria))

        //TODO: Check all fungibleStates have same notary, skipping for demo Testnet as we have only one notary

        println("After Token Selection: $fungibleStates")
        val notary = fungibleStates.first().state.notary
        val (exitStates, change) = selector.generateExit(
                exitStates = fungibleStates,
                amount = amount,
                changeHolder = ourIdentity
        )
        if (exitStates.isEmpty()) {
            throw IllegalStateException("Tokens with specified quantity not found")
        }
        if (exitStates.size == 1 && change == null) {
            println("Return ${exitStates}")
            return exitStates.first()
        }

        // Else Merge and Manage change tokens
        val issuedTokenType = exitStates[0].state.data.amount.token
        val holder = exitStates[0].state.data.holder
        val lockToken = FungibleToken(Amount(quantity, issuedTokenType), holder)
        
        var txBuilder = TransactionBuilder(notary)
               .addOutputState(lockToken, FungibleTokenContract.contractId)
        var outIndices = listOf(0)
        if (change != null) {
            txBuilder = txBuilder.addOutputState(change, FungibleTokenContract.contractId)
            outIndices += 1
        }
        for (exitState in exitStates) {
            txBuilder = txBuilder.addInputState(exitState)   //Add all from list
        }
        val cmd = Command(MoveTokenCommand(issuedTokenType, listOf(0..exitStates.size-1).flatten(), outIndices), 
                setOf(
                    holder.owningKey
                ).toList()
            )
        txBuilder = txBuilder.addCommand(cmd)
        txBuilder.verify(serviceHub)
        val sTx = serviceHub.signInitialTransaction(txBuilder)
        val storedLockToken = subFlow(FinalityFlow(sTx, listOf<FlowSession>())).tx.outputStates[0] as FungibleToken
        println("Stored: ${storedLockToken}")

        val lockTokenRef = serviceHub.vaultService.queryBy<FungibleToken>()
                .states.filter { it.state.data.amount.equals(storedLockToken.amount) }[0]
        println("Return ${lockTokenRef}")
        return lockTokenRef
    }
}

@InitiatingFlow
@StartableByRPC
class UpdateOwnerFromPointer(val statePointer: StaticPointer<FungibleToken>) : FlowLogic<FungibleToken>() {
    override val progressTracker = ProgressTracker()

    @Suspendable
    override fun call(): FungibleToken {
        val token = statePointer.resolve(serviceHub).state.data
        return FungibleToken(token.amount, ourIdentity) 
    }
}
