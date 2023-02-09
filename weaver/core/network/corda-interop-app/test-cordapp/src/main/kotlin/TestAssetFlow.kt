/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.test

import co.paralleluniverse.fibers.Suspendable
import net.corda.core.flows.*
import net.corda.core.node.ServiceHub
import net.corda.core.node.services.queryBy
import net.corda.core.node.services.vault.QueryCriteria
import net.corda.core.identity.AbstractParty
import net.corda.core.identity.Party
import net.corda.core.contracts.StateAndRef
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.contracts.BelongsToContract
import net.corda.core.contracts.StaticPointer
import net.corda.core.contracts.LinearState
import net.corda.core.contracts.Command
import net.corda.core.contracts.CommandData
import net.corda.core.contracts.Contract
import net.corda.core.contracts.requireSingleCommand
import net.corda.core.contracts.requireThat
import net.corda.core.transactions.LedgerTransaction
import net.corda.core.transactions.TransactionBuilder

// Sample Asset State for asset exchange Unit Tests
@BelongsToContract(AssetStateContract::class)
data class AssetState (
    val id: String,
    val owner: Party,
    override val linearId: UniqueIdentifier = UniqueIdentifier()
) : LinearState {
    override val participants: List<AbstractParty> get() = listOf(owner)
}

class AssetStateContract : Contract {
    companion object {
        const val ID = "com.weaver.corda.app.interop.test.AssetStateContract"
    }
    override fun verify(tx: LedgerTransaction) {
        val command = tx.commands.requireSingleCommand<Commands>()
        when (command.value) {
            is Commands.Issue -> requireThat {
                "There should be no input AssetState" using (tx.inputsOfType<AssetState>().isEmpty())
                "There should be one output AssetState" using (tx.outputsOfType<AssetState>().size == 1)
                val participantKeys = listOf(tx.outputsOfType<AssetState>()[0].owner.owningKey)
                "The required signers of the transaction must be the owner" using (command.signers.containsAll(participantKeys))
            }
            is Commands.Delete -> requireThat {
                "There should be one input AssetState" using (tx.inputsOfType<AssetState>().size == 1)
                val input = tx.inputsOfType<AssetState>()[0]
                "There should be no output AssetState" using (tx.outputsOfType<AssetState>().isEmpty())
                "The owner must be the signer." using (command.signers.containsAll(listOf(input.owner.owningKey)))
            }
        }
    }
    interface Commands : CommandData {
        class Issue : Commands
        class Delete : Commands
    }
}

@InitiatingFlow
@StartableByRPC
class CreateAsset(
    val id: String,
    val owner: Party
) : FlowLogic<StateAndRef<AssetState>>() {
    @Suspendable
    override fun call(): StateAndRef<AssetState> {
        val asset = AssetState(id, owner)
        println(asset)
        // 2. Build the transaction
        val notary = serviceHub.networkMapCache.notaryIdentities.first()
        val command = Command(AssetStateContract.Commands.Issue(), ourIdentity.owningKey)
        val txBuilder = TransactionBuilder(notary)
                .addOutputState(asset, AssetStateContract.ID)
                .addCommand(command)
        txBuilder.verify(serviceHub)
        val stx = serviceHub.signInitialTransaction(txBuilder)
        val sessions = listOf<FlowSession>()
        subFlow(FinalityFlow(stx, sessions)).tx.outputStates.first()
        
        val assetStateRef = serviceHub.vaultService.queryBy<AssetState>(
                    QueryCriteria.LinearStateQueryCriteria(linearId = listOf(asset.linearId))
                ).states.first()
        println(assetStateRef)
        return assetStateRef
    }
}

@InitiatingFlow
@StartableByRPC
class UpdateOwnerFlow(
    val assetPointer: StaticPointer<AssetState>
) : FlowLogic<AssetState>() {
    @Suspendable
    override fun call(): AssetState {
        val asset = assetPointer.resolve(serviceHub).state.data
        return asset.copy(owner=ourIdentity)
    }
}

@InitiatingFlow
@StartableByRPC
class GetAssetRef(
    val type: String,
    val id: String
) : FlowLogic<StateAndRef<AssetState>>() {
    @Suspendable
    override fun call(): StateAndRef<AssetState> {
        val assetStateRef = serviceHub.vaultService.queryBy<AssetState>().states
                    .filter { it.state.data.id == id }
        println(assetStateRef)
        return assetStateRef.first()
    }
}