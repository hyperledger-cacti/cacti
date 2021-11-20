/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows

import arrow.core.Either
import arrow.core.Left
import arrow.core.Right
import co.paralleluniverse.fibers.Suspendable
import com.weaver.corda.app.interop.contracts.VerificationPolicyStateContract
import com.weaver.corda.app.interop.states.Identifier
import com.weaver.corda.app.interop.states.Policy
import com.weaver.corda.app.interop.states.VerificationPolicyState
import net.corda.core.contracts.Command
import net.corda.core.contracts.StateAndRef
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.contracts.requireThat
import net.corda.core.flows.*
import net.corda.core.node.ServiceHub
import net.corda.core.node.services.queryBy
import net.corda.core.transactions.TransactionBuilder
import net.corda.core.transactions.SignedTransaction
import net.corda.core.identity.Party

/**
 * The CreateVerificationPolicyState flow is used to store a [VerificationPolicyState] in the Corda ledger.
 *
 * The verification policy is used by the Corda network to store the rules on which parties from
 * a foreign network should provide proof of a view in order for it to be deemed valid by the Corda network.
 *
 * @property verificationPolicy The [VerificationPolicyState] provided by the Corda client to be stored in the vault.
 */
@InitiatingFlow
@StartableByRPC
class CreateVerificationPolicyState
@JvmOverloads
constructor(
    val verificationPolicy: VerificationPolicyState,
    val sharedParties: List<Party> = listOf<Party>()
) : FlowLogic<Either<Error, UniqueIdentifier>>() {
    /**
     * The call() method captures the logic to create a new [VerificationPolicyState] state in the vault.
     *
     * It first checks that a [VerificationPolicyState] does not already exist in the vault. It then builds
     * and verifies the transaction, and collects the required signatures.
     *
     * @return Returns the linearId of the newly created [VerificationPolicyState].
     */
    @Suspendable
    override fun call(): Either<Error, UniqueIdentifier> = try {
        println("Verification Policy to be stored in the vault: $verificationPolicy")

        // 1. Check that a verification policy for that securityDomain does not already exist
        subFlow(GetVerificationPolicyStateBySecurityDomain(verificationPolicy.securityDomain)).fold({
            // If the flow produces an error, then the verification policy does not already exist.

            // Create the verification policy to store with our identity listed as a participant
            val outputState = verificationPolicy.copy(participants = listOf(ourIdentity) + sharedParties)

            // 2. Build the transaction
            val notary = serviceHub.networkMapCache.notaryIdentities.first()
            val command = Command(VerificationPolicyStateContract.Commands.Issue(), ourIdentity.owningKey)
            val txBuilder = TransactionBuilder(notary)
                    .addOutputState(outputState, VerificationPolicyStateContract.ID)
                    .addCommand(command)

            // 3. Verify and collect signatures on the transaction
            txBuilder.verify(serviceHub)
            val partSignedTx = serviceHub.signInitialTransaction(txBuilder)
            
            var sessions = listOf<FlowSession>()
            for (otherParty in sharedParties) {
                val otherSession = initiateFlow(otherParty)
                sessions += otherSession
            }
            val fullySignedTx = subFlow(CollectSignaturesFlow(partSignedTx, sessions))
            val storedVerificationPolicyState = subFlow(FinalityFlow(fullySignedTx, sessions)).tx.outputStates.first() as VerificationPolicyState

            // 4. Return the linearId of the state
            println("Successfully stored verification policy $storedVerificationPolicyState in the vault.\n")
            Right(storedVerificationPolicyState.linearId)
        }, {
            println("Verification policy for securityDomain ${verificationPolicy.securityDomain} already exists.")
            println("Verification policy: ${it.state.data}\n")
            Left(Error("Corda Network Error: Verification Policy for securityDomain ${verificationPolicy.securityDomain} already exists."))
        })
    } catch (e: Exception) {
        println("Error storing state in the ledger: ${e.message}\n")
        Left(Error("Failed to store state in ledger: ${e.message}"))
    }
}
@InitiatedBy(CreateVerificationPolicyState::class)
class CreateVerificationPolicyStateResponder(val session: FlowSession) : FlowLogic<SignedTransaction>() {
    @Suspendable
    override fun call(): SignedTransaction {
        val signTransactionFlow = object : SignTransactionFlow(session) {
            override fun checkTransaction(stx: SignedTransaction) = requireThat {
            }
        }
        try {
            val txId = subFlow(signTransactionFlow).id
            println("${ourIdentity} signed transaction.")
            return subFlow(ReceiveFinalityFlow(session, expectedTxId = txId))
        } catch (e: Exception) {
            println("Error during transaction by ${ourIdentity}: ${e.message}\n")
            return subFlow(ReceiveFinalityFlow(session))
        }
    }
}

/**
 * The UpdateVerificationPolicyState flow is used to update an existing [VerificationPolicyState] in the Corda ledger.
 *
 * @property verificationPolicy The [VerificationPolicyState] provided by the Corda client to replace the
 * existing [VerificationPolicyState] for that network.
 */
@InitiatingFlow
@StartableByRPC
class UpdateVerificationPolicyState(val verificationPolicy: VerificationPolicyState) : FlowLogic<Either<Error, UniqueIdentifier>>() {
    /**
     * The call() method captures the logic to update an existing [VerificationPolicyState] state in the vault.
     *
     * It first checks that a [VerificationPolicyState] exists in the vault. It then copies the old verification policy
     * with the new data, builds and verifies the transaction, and collects the required signatures.
     *
     * @return Returns the linearId of the updated [VerificationPolicyState].
     */
    @Suspendable
    override fun call(): Either<Error, UniqueIdentifier> = try {
        println("Verification Policy to be updated in the vault: $verificationPolicy")

        // 1. Find the verification policy that needs to be updated
        val states = serviceHub.vaultService.queryBy<VerificationPolicyState>().states
        val inputState = states.find { it.state.data.securityDomain == verificationPolicy.securityDomain }
        if (inputState == null) {
            println("Verification policy for securityDomain ${verificationPolicy.securityDomain} does not exist.\n")
            Left(Error("Corda Network Error: Verification Policy for securityDomain ${verificationPolicy.securityDomain} does not exist"))
        }
        println("Current version of verification policy is $inputState")

        // 2. Create the output state from a copy of the input state with the provided Identifiers
        // Note that the null status of the inputState has been checked above.
        val outputState = inputState!!.state.data.copy(
                identifiers = verificationPolicy.identifiers)

        println("Updating state to $outputState\n")

        // 3. Build the transaction
        val notary = serviceHub.networkMapCache.notaryIdentities.first()
        val command = Command(VerificationPolicyStateContract.Commands.Update(), listOf(ourIdentity.owningKey))
        val txBuilder = TransactionBuilder(notary)
                .addInputState(inputState)
                .addOutputState(outputState, VerificationPolicyStateContract.ID)
                .addCommand(command)

        // 3. Verify and collect signatures on the transaction
        txBuilder.verify(serviceHub)
        val partSignedTx = serviceHub.signInitialTransaction(txBuilder)
        
        var sessions = listOf<FlowSession>()
        for (otherParty in outputState.participants) {
            if (otherParty != ourIdentity) {
                val otherSession = initiateFlow(otherParty)
                sessions += otherSession
            }
        }
        val fullySignedTx = subFlow(CollectSignaturesFlow(partSignedTx, sessions))
        
        val finalTx = subFlow(FinalityFlow(fullySignedTx, sessions))
        println("Successfully updated verification policy in the ledger: $finalTx\n")

        // 4. Return the linearId of the state
        Right(inputState.state.data.linearId)
    } catch (e: Exception) {
        println("Error updating verification policy: ${e.message}\n")
        Left(Error("Failed to store state in ledger: ${e.message}"))
    }
}
@InitiatedBy(UpdateVerificationPolicyState::class)
class UpdateVerificationPolicyStateResponder(val session: FlowSession) : FlowLogic<SignedTransaction>() {
    @Suspendable
    override fun call(): SignedTransaction {
        val signTransactionFlow = object : SignTransactionFlow(session) {
            override fun checkTransaction(stx: SignedTransaction) = requireThat {
            }
        }
        try {
            val txId = subFlow(signTransactionFlow).id
            println("${ourIdentity} signed transaction.")
            return subFlow(ReceiveFinalityFlow(session, expectedTxId = txId))
        } catch (e: Exception) {
            println("Error during transaction by ${ourIdentity}: ${e.message}\n")
            return subFlow(ReceiveFinalityFlow(session))
        }
    }
}
/**
 * The DeleteVerificationPolicyState flow is used to delete an existing [VerificationPolicyState] in the Corda ledger.
 *
 * @property securityDomain The identifier for the network for which the [VerificationPolicyState] is to be deleted.
 */
@InitiatingFlow
@StartableByRPC
class DeleteVerificationPolicyState(val securityDomain: String) : FlowLogic<Either<Error, UniqueIdentifier>>() {

    /**
     * The call() method captures the logic to build and sign a transaction that deletes a [VerificationPolicyState].
     *
     * @return returns the linearId of the deleted state.
     */
    @Suspendable
    override fun call(): Either<Error, UniqueIdentifier> = try {
        println("Verification Policy for securityDomain $securityDomain to be deleted from the ledger.")

        val notary = serviceHub.networkMapCache.notaryIdentities[0]

        // 1. Find the verification policy that needs to be deleted
        val states = serviceHub.vaultService.queryBy<VerificationPolicyState>().states
        val inputState = states.find { it.state.data.securityDomain == securityDomain }
        if (inputState == null) {
            println("Verification policy for securityDomain $securityDomain does not exist.\n")
            Left(Error("Corda Network Error: Verification Policy for securityDomain $securityDomain does not exist"))
        } else {

            // 2. Build the transaction
            val participants = inputState.state.data.participants.map { it.owningKey }
            val txCommand = Command(VerificationPolicyStateContract.Commands.Delete(), participants)
            val txBuilder = TransactionBuilder(notary)
                    .addInputState(inputState)
                    .addCommand(txCommand)

            // 3. Verify and collect signatures on the transaction
            txBuilder.verify(serviceHub)
            val partSignedTx = serviceHub.signInitialTransaction(txBuilder)
            
            var sessions = listOf<FlowSession>()
            for (otherParty in inputState.state.data.participants) {
                if (otherParty != ourIdentity) {
                    val otherSession = initiateFlow(otherParty)
                    sessions += otherSession
                }
            }
            val fullySignedTx = subFlow(CollectSignaturesFlow(partSignedTx, sessions))
            
            subFlow(FinalityFlow(fullySignedTx, sessions))

            // 4. Return the linearId of the state
            println("Successfully deleted verification policy from the ledger.\n")
            Right(inputState.state.data.linearId)
        }
    } catch (e: Exception) {
        println("Failed to delete verification policy from the ledger: ${e.message}.\n")
        Left(Error("Corda Network Error: Error deleting Verification Policy for securityDomain $securityDomain: ${e.message}"))
    }
}

@InitiatedBy(DeleteVerificationPolicyState::class)
class DeleteVerificationPolicyStateResponder(val session: FlowSession) : FlowLogic<SignedTransaction>() {
    @Suspendable
    override fun call(): SignedTransaction {
        val signTransactionFlow = object : SignTransactionFlow(session) {
            override fun checkTransaction(stx: SignedTransaction) = requireThat {
            }
        }
        try {
            val txId = subFlow(signTransactionFlow).id
            println("${ourIdentity} signed transaction.")
            return subFlow(ReceiveFinalityFlow(session, expectedTxId = txId))
        } catch (e: Exception) {
            println("Error during transaction by ${ourIdentity}: ${e.message}\n")
            return subFlow(ReceiveFinalityFlow(session))
        }
    }
}

/**
 * The GetVerificationPolicyStateBySecurityDomain flow gets the [VerificationPolicyState] for the provided securityDomain.
 *
 * @property securityDomain The securityDomain for the [VerificationPolicyState] to be retrieved.
 */
@StartableByRPC
class GetVerificationPolicyStateBySecurityDomain(val securityDomain: String)
    : FlowLogic<Either<Error, StateAndRef<VerificationPolicyState>>>() {

    @Suspendable
    override fun call(): Either<Error, StateAndRef<VerificationPolicyState>> = try {
        println("Getting Verification Policy for securityDomain $securityDomain.")

        val states = serviceHub.vaultService.queryBy<VerificationPolicyState>().states
                .filter { it.state.data.securityDomain == securityDomain }
        println("States with securityDomain $securityDomain: $states\n")
        if (states.isEmpty()) {
            println("Verification policy for securityDomain $securityDomain not found\n")
            Left(Error("Error: verification policy for securityDomain $securityDomain not found"))
        } else {
            Right(states.first())
        }
    } catch (e: Exception) {
        println("Error getting verification policy: ${e.message}\n")
        Left(Error("Error getting verification policy: ${e.message}"))
    }
}

/**
 * The GetVerificationPolicies flow gets all the [VerificationPolicyState]s in the ledger.
 */
@StartableByRPC
class GetVerificationPolicies() : FlowLogic<List<StateAndRef<VerificationPolicyState>>>() {

    @Suspendable
    override fun call(): List<StateAndRef<VerificationPolicyState>> {
        println("Getting all Verification Policies.")

        val states = serviceHub.vaultService.queryBy<VerificationPolicyState>().states

        println("Found verification policies: $states\n")
        return states
    }
}

/**
 * The resolvePolicy function takes the securityDomain and viewAddress for the external network that
 * a Corda client wishes to receive the state for and looks up the corresponding endorsement policy
 * for the external network that needs to be satisfied  * in order for the response to be accepted.
 *
 * @param serviceHub The service hub is used to make vault query operations.
 * @param securityDomain The identifier for the external network.
 * @param viewAddress The address of the view to be queried from the external network.
 * @return Returns and Either with an Error if lookup failed, or the String with the verification criteria.
 */
@Suspendable
fun resolvePolicy(
        serviceHub: ServiceHub,
        securityDomain: String,
        viewAddress: String): Either<Error, List<String>> = try {
    println("Finding verification policy for $securityDomain.")

    // 1. Find the verification policy for the securityDomain
    val verificationPolicy = serviceHub.vaultService.queryBy<VerificationPolicyState>().states
            .filter { it.state.data.securityDomain == securityDomain }
            .map { it.state.data }
            .single()
    println("Verification policy found: $verificationPolicy")

    // 2. fold over the identifiers in the verificationPolicy to find the best match (if any)
    val id = Identifier("", Policy("", listOf("")))
    val bestMatch = verificationPolicy.identifiers.fold(id, { acc, identifier ->
        // if already found an exact match, ignore other identifiers
        if (acc.pattern == viewAddress) {
            acc
        } else {
            // check if the identifier pattern is valid, that it matches the address
            // and it's longer (i.e. more specific) than the currentBestMatch
            if (validPatternString(identifier.pattern) && isPatternAndAddressMatch(identifier.pattern, viewAddress)
                    && identifier.pattern.length > acc.pattern.length) {
                identifier
            } else {
                acc
            }
        }
    })

    if (bestMatch.pattern.isEmpty()) {
        println("Verification Policy Error: Failed to find verification policy matching view address $viewAddress\n")
        Left(Error("Verification Policy Error: Failed to find verification policy matching view address $viewAddress\n"))
    } else {
        // 3. Return the criteria
        println("Verification criteria found for $securityDomain: ${bestMatch.policy.criteria}\n")
        Right(bestMatch.policy.criteria)
    }

} catch (e: Exception) {
    println("Verification Error: Failed to resolve policy for securityDomain $securityDomain.\n")
    Left(Error("Verification Error: Failed to resolve policy for securityDomain $securityDomain.\n"))
}
