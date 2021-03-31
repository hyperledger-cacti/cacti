package com.cordaInteropApp.flows

import arrow.core.Either
import arrow.core.Left
import arrow.core.Right
import arrow.core.flatMap
import co.paralleluniverse.fibers.Suspendable
import com.cordaInteropApp.contracts.ExternalStateContract
import com.cordaInteropApp.states.ExternalState
import com.google.gson.Gson
import common.state.State
import net.corda.core.contracts.Command
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.flows.*
import net.corda.core.transactions.TransactionBuilder
import java.util.Base64

/**
 * The WriteExternalStateInitiator flow is used to process a response from a foreign network for state.
 *
 * This flow first verifies the proofs associated with the state and then stores the state and proofs in the vault.
 *
 * @property view The view received from the foreign network.
 * @property address The address of the view, containing a location, securityDomain and view segment.
 */
@StartableByRPC
class WriteExternalStateInitiator(
        val viewBase64String: String,
        val address: String): FlowLogic<Either<Error, UniqueIdentifier>>() {

    /**
     * The call() method captures the logic to perform the proof validation and the construction of
     * the transaction to store the [ExternalState] in the vault.
     *
     * @return Returns the linearId of the newly created [ExternalState].
     */
    @Suspendable
    override fun call(): Either<Error, UniqueIdentifier> = try {
        println("External network returned view: $viewBase64String\n")

        val view = State.View.parseFrom(Base64.getDecoder().decode(viewBase64String))

        // 1. Verify the proofs that are returned
        verifyView(view, address, serviceHub).flatMap {
            println("View verification successful. Creating state to be stored in the vault.")
            // 2. Create the state to be stored
            val state = ExternalState(
                    linearId = UniqueIdentifier(),
                    participants = listOf(ourIdentity),
                    meta = view.meta.toByteArray(),
                    state = view.data.toByteArray())
            println("Storing ExternalState in the vault: $state \n")

            // 3. Build the transaction
            val notary = serviceHub.networkMapCache.notaryIdentities.first()
            val command = Command(ExternalStateContract.Commands.Issue(), ourIdentity.owningKey)
            val txBuilder = TransactionBuilder(notary)
                    .addOutputState(state, ExternalStateContract.ID)
                    .addCommand(command)

            // 4. Verify and collect signatures on the transaction
            txBuilder.verify(serviceHub)
            val tx = serviceHub.signInitialTransaction(txBuilder)
            val sessions = listOf<FlowSession>()
            val stx = subFlow(CollectSignaturesFlow(tx, sessions))
            subFlow(FinalityFlow(stx, sessions))

            // 5. Return the linearId of the state
            println("State stored successfully.\n")
            Right(state.linearId)
        }
    } catch (e: Exception) {
        Left(Error("Failed to store state in ledger: ${e.message}"))
    }
}
