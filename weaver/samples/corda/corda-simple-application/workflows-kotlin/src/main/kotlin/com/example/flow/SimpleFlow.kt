/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.flow

import co.paralleluniverse.fibers.Suspendable
import com.cordaSimpleApplication.contract.SimpleContract
import com.cordaSimpleApplication.state.SimpleState
import net.corda.core.contracts.Command
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.contracts.requireThat
import net.corda.core.flows.*
import net.corda.core.node.services.Vault
import net.corda.core.node.services.queryBy
import net.corda.core.node.services.vault.QueryCriteria
import net.corda.core.transactions.SignedTransaction
import net.corda.core.transactions.TransactionBuilder
import net.corda.core.utilities.ProgressTracker
import net.corda.core.utilities.ProgressTracker.Step
import net.corda.core.serialization.CordaSerializable
import java.util.Arrays.asList

import org.hyperledger.cacti.weaver.imodule.corda.states.ExternalState
import org.hyperledger.cacti.weaver.imodule.corda.contracts.ExternalStateContract
import org.hyperledger.cacti.weaver.imodule.corda.flows.GetExternalStateAndRefByLinearId
import org.hyperledger.cacti.weaver.imodule.corda.flows.getViewFromExternalState
import org.hyperledger.cacti.weaver.imodule.corda.flows.getPayloadFromView

/**
 * The CreateState flow is used to create a new [SimpleState].
 *
 * @property key the key for the [SimpleState].
 * @property value the value for the [SimpleState].
 */
@StartableByRPC
class CreateState(val key: String, val value: String) : FlowLogic<SignedTransaction>() {
    /**
     * The progress tracker checkpoints each stage of the flow and outputs the specified messages when each
     * checkpoint is reached in the code. See the 'progressTracker.currentStep' expressions within the call() function.
     */
    companion object {
        object GENERATING_TRANSACTION : Step("Generating transaction based on new simple state.")
        object VERIFYING_TRANSACTION : Step("Verifying contract constraints.")
        object SIGNING_TRANSACTION : Step("Signing transaction with our private key.")
        object FINALISING_TRANSACTION : Step("Obtaining notary signature and recording transaction.") {
            override fun childProgressTracker() = FinalityFlow.tracker()
        }
        fun tracker() = ProgressTracker(
                GENERATING_TRANSACTION,
                VERIFYING_TRANSACTION,
                SIGNING_TRANSACTION,
                FINALISING_TRANSACTION
        )
    }

    override val progressTracker = tracker()

    /**
     * The call() method captures the logic to build and sign a transaction that creates a [SimpleState].
     *
     * @return returns the signed transaction.
     */
    @Suspendable
    override fun call(): SignedTransaction {
        // Obtain a reference to the notary we want to use.
        val notary = serviceHub.networkMapCache.notaryIdentities[0]

        // Stage 1.
        progressTracker.currentStep = GENERATING_TRANSACTION
        // Generate an unsigned transaction.
        val simpleState = SimpleState(key, value, serviceHub.myInfo.legalIdentities.first())
        println("Storing simple state in the ledger: $simpleState\n")
        val txCommand = Command(SimpleContract.Commands.Create(), simpleState.participants.map { it.owningKey })
        val txBuilder = TransactionBuilder(notary)
                .addOutputState(simpleState, SimpleContract.ID)
                .addCommand(txCommand)

        // Stage 2.
        progressTracker.currentStep = VERIFYING_TRANSACTION
        // Verify that the transaction is valid.
        txBuilder.verify(serviceHub)

        // Stage 3.
        progressTracker.currentStep = SIGNING_TRANSACTION
        // Sign the transaction.
        val signedTx = serviceHub.signInitialTransaction(txBuilder)

        // Stage 5.
        progressTracker.currentStep = FINALISING_TRANSACTION
        val session = listOf<FlowSession>()
        // Notarise and record the transaction in the party's vault.
        return subFlow(FinalityFlow(signedTx, session, FINALISING_TRANSACTION.childProgressTracker()))
    }
}

/**
 * The CreateState flow is used to create a new [SimpleState].
 *
 * @property key the key for the [SimpleState].
 * @property value the value for the [SimpleState].
 */
@InitiatingFlow
@StartableByRPC
class CreateFromExternalState(
    val key: String,
    val externalStateLinearIds: Array<UniqueIdentifier>
) : FlowLogic<SignedTransaction>() {
    /**
     * The progress tracker checkpoints each stage of the flow and outputs the specified messages when each
     * checkpoint is reached in the code. See the 'progressTracker.currentStep' expressions within the call() function.
     */
    companion object {
        object GENERATING_TRANSACTION : Step("Generating transaction based on new simple state.")
        object VERIFYING_TRANSACTION : Step("Verifying contract constraints.")
        object SIGNING_TRANSACTION : Step("Signing transaction with our private key.")
        object FINALISING_TRANSACTION : Step("Obtaining notary signature and recording transaction.") {
            override fun childProgressTracker() = FinalityFlow.tracker()
        }
        fun tracker() = ProgressTracker(
                GENERATING_TRANSACTION,
                VERIFYING_TRANSACTION,
                SIGNING_TRANSACTION,
                FINALISING_TRANSACTION
        )
    }

    override val progressTracker = tracker()

    /**
     * The call() method captures the logic to build and sign a transaction that creates a [SimpleState].
     *
     * @return returns the signed transaction.
     */
    @Suspendable
    override fun call(): SignedTransaction {
        println("Creating state from External State...")
        // Obtain a reference to the notary we want to use.
        val notary = serviceHub.networkMapCache.notaryIdentities[0]
        val externalStateAndRef = subFlow(GetExternalStateAndRefByLinearId(externalStateLinearIds[0].toString()))
        val value = getPayloadFromView(getViewFromExternalState(externalStateAndRef.state.data)).toString(Charsets.UTF_8)
        
        progressTracker.currentStep = GENERATING_TRANSACTION
        // Generate an unsigned transaction.
        val simpleState = SimpleState(key, value, serviceHub.myInfo.legalIdentities.first())
        println("Storing simple state in the ledger: $simpleState\n")
        val txCommand = Command(SimpleContract.Commands.CreateFromExternal(), simpleState.participants.map { it.owningKey })
        val externalStateConsumeCommand = Command(ExternalStateContract.Commands.Consume(), 
            externalStateAndRef.state.data.participants.map { it.owningKey }
        )
        val txBuilder = TransactionBuilder(notary)
                .addInputState(externalStateAndRef)
                .addOutputState(simpleState, SimpleContract.ID)
                .addCommand(txCommand)
                .addCommand(externalStateConsumeCommand)

        // Stage 2.
        progressTracker.currentStep = VERIFYING_TRANSACTION
        // Verify that the transaction is valid.
        txBuilder.verify(serviceHub)

        // Stage 3.
        progressTracker.currentStep = SIGNING_TRANSACTION
        // Sign the transaction.
        val signedTx = serviceHub.signInitialTransaction(txBuilder)

        // Stage 5.
        progressTracker.currentStep = FINALISING_TRANSACTION
        var sessions = listOf<FlowSession>()
        for (party in externalStateAndRef.state.data.participants) {
            if (!ourIdentity.equals(party)) {
                val session = initiateFlow(party)
                sessions += session
            }
        }
        
        val sTx = subFlow(CollectSignaturesFlow(signedTx, sessions))
        
        // Notarise and record the transaction in the party's vault.
        return subFlow(FinalityFlow(sTx, sessions, FINALISING_TRANSACTION.childProgressTracker()))
    }
}
@InitiatedBy(CreateFromExternalState::class)
class CreateFromExternalStateAcceptor(val session: FlowSession) : FlowLogic<SignedTransaction>() {
    @Suspendable
    override fun call(): SignedTransaction {
        val signTransactionFlow = object : SignTransactionFlow(session) {
            override fun checkTransaction(stx: SignedTransaction) = requireThat {
                val tx = stx.tx.toLedgerTransaction(serviceHub)

                val externalState = tx.inputsOfType<ExternalState>().single()
                val out = tx.outputsOfType<SimpleState>().single()

                val externalValue = getPayloadFromView(getViewFromExternalState(externalState)).toString(Charsets.UTF_8)

                "Value in SimpleState should match with external state" using (out.value == externalValue)
            }
        }
        try {
            val txId = subFlow(signTransactionFlow).id
            println("${ourIdentity} signed transaction.")
            return subFlow(ReceiveFinalityFlow(session, expectedTxId = txId))
        } catch (e: Exception) {
            val errorMsg = "Error signing create from external state transaction: ${e.message}\n"
            println(errorMsg)
            throw Error(errorMsg)
        }
    }
}

/**
 * The UpdateState flow is used to update an existing [SimpleState].
 *
 * @property key the key for the [SimpleState].
 * @property value the new value for the [SimpleState].
 */
@StartableByRPC
class UpdateState(val key: String, val value: String) : FlowLogic<SignedTransaction>() {
    /**
     * The progress tracker checkpoints each stage of the flow and outputs the specified messages when each
     * checkpoint is reached in the code. See the 'progressTracker.currentStep' expressions within the call() function.
     */
    companion object {
        object GENERATING_TRANSACTION : Step("Generating transaction based on new simple state.")
        object VERIFYING_TRANSACTION : Step("Verifying contract constraints.")
        object SIGNING_TRANSACTION : Step("Signing transaction with our private key.")
        object FINALISING_TRANSACTION : Step("Obtaining notary signature and recording transaction.") {
            override fun childProgressTracker() = FinalityFlow.tracker()
        }
        fun tracker() = ProgressTracker(
                GENERATING_TRANSACTION,
                VERIFYING_TRANSACTION,
                SIGNING_TRANSACTION,
                FINALISING_TRANSACTION
        )
    }

    override val progressTracker = tracker()

    /**
     * The call() method captures the logic to build and sign a transaction that updates a [SimpleState].
     *
     * @return returns the signed transaction.
     */
    @Suspendable
    override fun call(): SignedTransaction {
        // Obtain a reference to the notary we want to use.
        val notary = serviceHub.networkMapCache.notaryIdentities[0]

        // Stage 1.
        progressTracker.currentStep = GENERATING_TRANSACTION
        // Generate an unsigned transaction.
        val statesWithKey = serviceHub.vaultService.queryBy<SimpleState>().states
                .filter { it.state.data.key == key }
        if (statesWithKey.isEmpty()) {
            throw NoSuchElementException("SimpleState with key $key not found")
        }
        val inputState = statesWithKey.first()
        val outputState = inputState.state.data.copy(value = value)
        println("Updating simple state in the ledger: $outputState\n")

        val txCommand = Command(SimpleContract.Commands.Update(), inputState.state.data.participants.map { it.owningKey })
        val txBuilder = TransactionBuilder(notary)
                .addInputState(inputState)
                .addOutputState(outputState, SimpleContract.ID)
                .addCommand(txCommand)

        // Stage 2.
        progressTracker.currentStep = VERIFYING_TRANSACTION
        // Verify that the transaction is valid.
        txBuilder.verify(serviceHub)

        // Stage 3.
        progressTracker.currentStep = SIGNING_TRANSACTION
        // Sign the transaction.
        val signedTx = serviceHub.signInitialTransaction(txBuilder)

        // Stage 5.
        progressTracker.currentStep = FINALISING_TRANSACTION
        val session = listOf<FlowSession>()
        // Notarise and record the transaction in the party's vault.
        return subFlow(FinalityFlow(signedTx, session, FINALISING_TRANSACTION.childProgressTracker()))
    }
}

/**
 * The DeleteState flow is used to delete an existing [SimpleState].
 *
 * @property key the key for the [SimpleState] to be deleted.
 */
@StartableByRPC
class DeleteState(val key: String) : FlowLogic<SignedTransaction>() {
    /**
     * The progress tracker checkpoints each stage of the flow and outputs the specified messages when each
     * checkpoint is reached in the code. See the 'progressTracker.currentStep' expressions within the call() function.
     */
    companion object {
        object GENERATING_TRANSACTION : Step("Generating transaction based on new simple state.")
        object VERIFYING_TRANSACTION : Step("Verifying contract constraints.")
        object SIGNING_TRANSACTION : Step("Signing transaction with our private key.")
        object FINALISING_TRANSACTION : Step("Obtaining notary signature and recording transaction.") {
            override fun childProgressTracker() = FinalityFlow.tracker()
        }
        fun tracker() = ProgressTracker(
                GENERATING_TRANSACTION,
                VERIFYING_TRANSACTION,
                SIGNING_TRANSACTION,
                FINALISING_TRANSACTION
        )
    }

    override val progressTracker = tracker()

    /**
     * The call() method captures the logic to build and sign a transaction that deletes a [SimpleState].
     *
     * @return returns the signed transaction.
     */
    @Suspendable
    override fun call(): SignedTransaction {
        // Obtain a reference to the notary we want to use.
        val notary = serviceHub.networkMapCache.notaryIdentities[0]

        // Stage 1.
        progressTracker.currentStep = GENERATING_TRANSACTION
        // Generate an unsigned transaction.
        val statesWithKey = serviceHub.vaultService.queryBy<SimpleState>().states
                .filter { it.state.data.key == key }
        if (statesWithKey.isEmpty()) {
            throw NoSuchElementException("SimpleState with key $key not found")
        }
        val inputState = statesWithKey.first()
        println("Deleting state from the ledger: $inputState\n")
        val txCommand = Command(SimpleContract.Commands.Delete(), inputState.state.data.participants.map { it.owningKey })
        val txBuilder = TransactionBuilder(notary)
                .addInputState(inputState)
                .addCommand(txCommand)

        // Stage 2.
        progressTracker.currentStep = VERIFYING_TRANSACTION
        // Verify that the transaction is valid.
        txBuilder.verify(serviceHub)

        // Stage 3.
        progressTracker.currentStep = SIGNING_TRANSACTION
        // Sign the transaction.
        val signedTx = serviceHub.signInitialTransaction(txBuilder)

        // Stage 5.
        progressTracker.currentStep = FINALISING_TRANSACTION
        val session = listOf<FlowSession>()
        // Notarise and record the transaction in the party's vault.
        return subFlow(FinalityFlow(signedTx, session, FINALISING_TRANSACTION.childProgressTracker()))
    }
}

/**
 * The GetStateByKey flow is used to retrieve a [SimpleState] from the vault based on its key.
 *
 * @property key the key for the [SimpleState] to be retrieved.
 */
@StartableByRPC
class GetStateByKey(val key: String) : FlowLogic<ByteArray>() {
    @Suspendable

    /**
     * The call() method captures the logic to find a [SimpleState] in the vault based on its key.
     *
     * @return returns the [SimpleState].
     */
    override fun call(): ByteArray {
        val states = serviceHub.vaultService.queryBy<SimpleState>().states
                .filter { it.state.data.key == key }
                .map { it.state.data }
        println("Retrieved states with key $key: $states\n")
        return states.toString().toByteArray()
    }
}

/**
 * The GetStateByLinearId flow is used to retrieve a [SimpleState] from the vault based on its linearId.
 *
 * @property linearId the linearId for the [SimpleState] to be retrieved.
 */
@StartableByRPC
class GetStateByLinearId(val linearId: String) : FlowLogic<String>() {
    @Suspendable

    /**
     * The call() method captures the logic to find a [SimpleState] in the vault based on its linearId.
     *
     * @return returns the [SimpleState].
     */
    override fun call(): String {
        val uuid = UniqueIdentifier.Companion.fromString(linearId)
        val criteria = QueryCriteria.LinearStateQueryCriteria(null, asList(uuid),
            Vault.StateStatus.UNCONSUMED, null)
        val states = serviceHub.vaultService.queryBy<SimpleState>(criteria).states
        val state = states.first()
        println("Retrieved state with linearId $linearId: $state\n")
        return state.toString()
    }
}

/**
 * The GetStates flow is used to retrieve all [SimpleState]s from the vault.
 */
@StartableByRPC
class GetStates() : FlowLogic<List<SimpleState>>() {
    /**
     * The call() method captures the logic to retreive all [SimpleState]s in the vault.
     *
     * @return returns a list of [SimpleState]s.
     */
    @Suspendable
    override fun call(): List<SimpleState> {
        val states = serviceHub.vaultService.queryBy<SimpleState>().states.map { it.state.data }
        println("Retrieved states: $states\n")
        return states
    }
}
