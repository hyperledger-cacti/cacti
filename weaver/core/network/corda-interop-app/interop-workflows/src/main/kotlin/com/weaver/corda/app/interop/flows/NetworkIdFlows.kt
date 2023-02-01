/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows

import arrow.core.*
import co.paralleluniverse.fibers.Suspendable
import com.weaver.corda.app.interop.contracts.NetworkIdStateContract
import com.weaver.corda.app.interop.states.NetworkIdState

import net.corda.core.contracts.ContractState
import net.corda.core.contracts.CommandData
import net.corda.core.contracts.Command
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.contracts.TimeWindow
import net.corda.core.contracts.StateAndRef
import net.corda.core.contracts.requireThat
import net.corda.core.contracts.StaticPointer

import net.corda.core.identity.Party

import net.corda.core.flows.*
import net.corda.core.node.services.queryBy
import net.corda.core.node.services.vault.QueryCriteria
import net.corda.core.node.ServiceHub
import net.corda.core.node.StatesToRecord
import net.corda.core.transactions.TransactionBuilder
import net.corda.core.transactions.SignedTransaction
import net.corda.core.transactions.LedgerTransaction
import net.corda.core.utilities.OpaqueBytes
import net.corda.core.utilities.ProgressTracker
import net.corda.core.utilities.ProgressTracker.Step
import net.corda.core.utilities.unwrap
import net.corda.core.serialization.CordaSerializable
import java.time.Instant
import java.util.Base64

/**
 * The CreateNetworkIdState flow creates a [NetworkIdState] that's used as a reference state to fetch corda network id.
 * @property networkId the corda networkId that is part of the [NetworkIdState] to be created.
 * @property members the list of corda network participants to be part of the [NetworkIdState] to be created.
 */
@InitiatingFlow
@StartableByRPC
class CreateNetworkIdState(val networkId: String, val networkMembers: List<Party> = listOf<Party>()) : FlowLogic<SignedTransaction>() {
    /**
     * The progress tracker checkpoints each stage of the flow and outputs the specified messages when each
     * checkpoint is reached in the code. See the 'progressTracker.currentStep' expressions within the call() function.
     */
    companion object {
        object GENERATING_TRANSACTION : Step("Generating transaction based on new network id state.")
        object VERIFYING_TRANSACTION : Step("Verifying contract constraints.")
        object SIGNING_TRANSACTION : Step("Signing transaction with participant's private key.")
        object GATHERING_SIGS : Step("Gathering the signatures of the other network members.") {
            override fun childProgressTracker() = CollectSignaturesFlow.tracker()
        }
        object FINALISING_TRANSACTION : Step("Obtaining notary signature and recording transaction.") {
            override fun childProgressTracker() = FinalityFlow.tracker()
        }

        fun tracker() = ProgressTracker(
            GENERATING_TRANSACTION,
            VERIFYING_TRANSACTION,
            SIGNING_TRANSACTION,
            GATHERING_SIGS,
            FINALISING_TRANSACTION
        )
    }

    override val progressTracker = tracker()

    /**
     * The flow logic is encapsulated within the call() method.
     */
    @Suspendable
    override fun call(): SignedTransaction {

        // Obtain a reference from a notary we wish to use.
        val notary = serviceHub.networkMapCache.notaryIdentities.single()

        // Stage 1.
        progressTracker.currentStep = GENERATING_TRANSACTION
        // Generate an unsigned transaction.
        val networkIdState: NetworkIdState = NetworkIdState(networkId, networkMembers)

        val commandData: NetworkIdStateContract.Commands.Create = NetworkIdStateContract.Commands.Create()
        val txCommand: Command<NetworkIdStateContract.Commands.Create> = Command(commandData, networkIdState.participants.map { it.owningKey })
        val txBuilder: TransactionBuilder = TransactionBuilder(notary)
            .addOutputState(networkIdState, NetworkIdStateContract.ID)
            .addCommand(txCommand)

        // Stage 2.
        progressTracker.currentStep = VERIFYING_TRANSACTION
        // Verify that the transaction is valid.
        txBuilder.verify(serviceHub)

        // Stage 3.
        progressTracker.currentStep = SIGNING_TRANSACTION
        // Sign the transaction.
        //val signedTx: SignedTransaction = serviceHub.signInitialTransaction(txBuilder)
        val partSignedTx: SignedTransaction = serviceHub.signInitialTransaction(txBuilder)
        println("Transaction submitter signed transaction.")

        // Stage 4.
        progressTracker.currentStep = GATHERING_SIGS
        // Gather signatures on the transaction.
        var sessions = listOf<FlowSession>()
        for (member in networkMembers) {
            if (!member.equals(ourIdentity)) {
                val membersession = initiateFlow(member)
                sessions += membersession
            }
        }
        val fullySignedTx = subFlow(CollectSignaturesFlow(partSignedTx, sessions, GATHERING_SIGS.childProgressTracker()))

        // Stage 5.
        progressTracker.currentStep = FINALISING_TRANSACTION
        //val session = listOf<FlowSession>()
        // Notarise and record the transaction in both parties' vaults.
        //return subFlow(FinalityFlow(signedTx, session, FINALISING_TRANSACTION.childProgressTracker()))
        return subFlow(FinalityFlow(fullySignedTx, sessions, FINALISING_TRANSACTION.childProgressTracker()))
    }
}

@InitiatedBy(CreateNetworkIdState::class)
class Acceptor(val session: FlowSession) : FlowLogic<SignedTransaction>() {
    @Suspendable
    override fun call(): SignedTransaction {
        val signTransactionFlow = object : SignTransactionFlow(session) {
            override fun checkTransaction(stx: SignedTransaction) = requireThat {
            }
        }
        try {
            val txId = subFlow(signTransactionFlow).id
            println("Network member signed transaction.")
            return subFlow(ReceiveFinalityFlow(session, expectedTxId = txId))
        } catch (e: Exception) {
            println("Error signing create network id transaction by network member: ${e.message}\n")
            return subFlow(ReceiveFinalityFlow(session))
        }
    }
}

/**
 * The RetrieveNetworkIdStateAndRef flow is used to retrieve a [NetworkIdState] from the vault.
 */
@InitiatingFlow
@StartableByRPC
class RetrieveNetworkIdStateAndRef() : FlowLogic<StateAndRef<NetworkIdState>?>() {

    override fun call(): StateAndRef<NetworkIdState>? {

        val states: List<StateAndRef<NetworkIdState>> = serviceHub.vaultService.queryBy<NetworkIdState>().states
        var fetchedState: StateAndRef<NetworkIdState>? = null

        if (states.isNotEmpty()) {
            // fetch the last state such that if the networkId is updated, we obtain the recent value
            fetchedState = states.last()
            println("Network id for local Corda newtork is: $fetchedState\n")
        } else {
            println("Not able to fetch network id for local Corda network\n")
        }

        return fetchedState
    }
}

/**
 * The RetrieveNetworkId flow is used to retrieve the value [NetworkIdState].networkId from the vault.
 */
@InitiatingFlow
@StartableByRPC
class RetrieveNetworkId() : FlowLogic<String?>() {

    override fun call(): String? {

        val states = serviceHub.vaultService.queryBy<NetworkIdState>().states
        var fetchedState: NetworkIdState? = null

        if (states.isNotEmpty()) {
            // consider that there will be only one such state ideally
            //fetchedState = states.first().state.data as NetworkIdState
            fetchedState = states.first().state.data
            println("Network id for local Corda newtork is: $fetchedState\n")
        } else {
            println("Not able to fetch network id for local Corda network\n")
        }

        return fetchedState!!.networkId
    }
}