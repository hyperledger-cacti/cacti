/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows

import arrow.core.Either
import arrow.core.Left
import arrow.core.Right
import arrow.core.flatMap
import co.paralleluniverse.fibers.Suspendable
import com.weaver.corda.app.interop.contracts.MembershipStateContract
import com.weaver.corda.app.interop.states.Member
import com.weaver.corda.app.interop.states.MembershipState
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
import java.security.cert.X509Certificate
import java.time.LocalDateTime
import java.time.ZoneId

/**
 * The CreateMembershipState flow is used to store a [MembershipState] in the Corda ledger.
 *
 * @property membership The [MembershipState] provided by the Corda client to be stored in the vault.
 */
@InitiatingFlow
@StartableByRPC
class CreateMembershipState(
    val membership: MembershipState,
    val sharedParties: List<Party> = listOf<Party>()
) : FlowLogic<Either<Error, UniqueIdentifier>>() {
    /**
     * The call() method captures the logic to create a new [MembershipState] state in the vault.
     *
     * @return Returns the linearId of the newly created [MembershipState].
     */
    @Suspendable
    override fun call(): Either<Error, UniqueIdentifier> = try {
        println("Membership to be stored in the vault: $membership")

        // 1. Check that a membership for that securityDomain does not already exist
        subFlow(GetMembershipStateBySecurityDomain(membership.securityDomain)).fold({
            // If the flow produces an error, then the membership does not already exist.

            // Create the membership to store with our identity listed as a participant
            val outputState = membership.copy(participants = listOf(ourIdentity) + sharedParties)

            // 2. Build the transaction
            val notary = serviceHub.networkMapCache.notaryIdentities.first()
            val command = Command(MembershipStateContract.Commands.Issue(), ourIdentity.owningKey)
            val txBuilder = TransactionBuilder(notary)
                    .addOutputState(outputState, MembershipStateContract.ID)
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
            val storedMembershipState = subFlow(FinalityFlow(fullySignedTx, sessions)).tx.outputStates.first() as MembershipState

            // 4. Return the linearId of the state
            println("Successfully stored membership $storedMembershipState in the vault.\n")
            Right(storedMembershipState.linearId)
        }, {
            println("Membership for security domain ${membership.securityDomain} already exists.")
            println("Membership: ${it.state.data}\n")
            Left(Error("Corda Network Error: Membership for securityDomain ${membership.securityDomain} already exists."))
        })
    } catch (e: Exception) {
        println("Error storing state in the ledger: ${e.message}\n")
        Left(Error("Failed to store state in ledger: ${e.message}"))
    }
}
@InitiatedBy(CreateMembershipState::class)
class CreateMembershipStateResponder(val session: FlowSession) : FlowLogic<SignedTransaction>() {
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
 * The UpdateMembershipState flow is used to update an existing [MembershipState] in the Corda ledger.
 *
 * @property membership The [MembershipState] provided by the Corda client to replace the
 * existing [MembershipState] for that network.
 */
@InitiatingFlow
@StartableByRPC
class UpdateMembershipState(val membership: MembershipState) : FlowLogic<Either<Error, UniqueIdentifier>>() {
    /**
     * The call() method captures the logic to update an existing [MembershipState] state in the vault.
     *
     * It first checks that a [MembershipState] exists in the vault. It then copies the old membership
     * with the new data, builds and verifies the transaction, and collects the required
     * signatures.
     *
     * @return Returns the linearId of the updated [MembershipState].
     */
    @Suspendable
    override fun call(): Either<Error, UniqueIdentifier> = try {
        println("Membership to be updated in the vault: $membership")

        // 1. Find the membership that needs to be updated
        val states = serviceHub.vaultService.queryBy<MembershipState>().states
        val inputState = states.find { it.state.data.securityDomain == membership.securityDomain }
        if (inputState == null) {
            println("Membership for securityDomain ${membership.securityDomain} does not exist.\n")
            Left(Error("Corda Network Error: Membership for securityDomain ${membership.securityDomain} does not exist"))
        }
        println("Current version of membership is $inputState")

        // 2. Create the output state from a copy of the input state with the provided identifiers
        // Note that the null status of the inputState has been checked above.
        val outputState = inputState!!.state.data.copy(
                members = membership.members
        )

        println("Updating state to $outputState\n")

        // 3. Build the transaction
        val notary = serviceHub.networkMapCache.notaryIdentities.first()
        val command = Command(MembershipStateContract.Commands.Update(), listOf(ourIdentity.owningKey))
        val txBuilder = TransactionBuilder(notary)
                .addInputState(inputState)
                .addOutputState(outputState, MembershipStateContract.ID)
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
        println("Successfully updated membership in the ledger: $finalTx\n")

        // 4. Return the linearId of the state
        Right(inputState.state.data.linearId)
    } catch (e: Exception) {
        println("Error updating membership: ${e.message}\n")
        Left(Error("Failed to store state in ledger: ${e.message}"))
    }
}
@InitiatedBy(UpdateMembershipState::class)
class UpdateMembershipStateResponder(val session: FlowSession) : FlowLogic<SignedTransaction>() {
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
 * The DeleteMembershipState flow is used to delete an existing [MembershipState] in the Corda ledger.
 *
 * @property securityDomain The identifier for the network for which the [MembershipState] is to be deleted.
 */
@InitiatingFlow
@StartableByRPC
class DeleteMembershipState(val securityDomain: String) : FlowLogic<Either<Error, UniqueIdentifier>>() {

    /**
     * The call() method captures the logic to build and sign a transaction that deletes a [MembershipState].
     *
     * @return returns the linearId of the deleted state.
     */
    @Suspendable
    override fun call(): Either<Error, UniqueIdentifier> = try {
        println("Membership for securityDomain $securityDomain to be deleted from the ledger.")

        val notary = serviceHub.networkMapCache.notaryIdentities[0]

        // 1. Find the membership that needs to be deleted
        val states = serviceHub.vaultService.queryBy<MembershipState>().states
        val inputState = states.find { it.state.data.securityDomain == securityDomain }
        if (inputState == null) {
            println("Membership for securityDomain $securityDomain does not exist.\n")
            Left(Error("Corda Network Error: Membership for securityDomain $securityDomain does not exist"))
        }

        // 2. Build the transaction
        val participants = inputState!!.state.data.participants.map { it.owningKey }
        val txCommand = Command(MembershipStateContract.Commands.Delete(), participants)
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
        println("Successfully deleted membership from the ledger.\n")
        Right(inputState.state.data.linearId)
    } catch (e: Exception) {
        println("Failed to delete membership from the ledger: ${e.message}.\n")
        Left(Error("Corda Network Error: Error deleting membership for securityDomain $securityDomain: ${e.message}"))
    }
}
@InitiatedBy(DeleteMembershipState::class)
class DeleteMembershipStateResponder(val session: FlowSession) : FlowLogic<SignedTransaction>() {
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
 * The GetMembershipStateBySecurityDomain flow gets the [MembershipState] for the provided id.
 *
 * @property securityDomain The id for the [MembershipState] to be retrieved.
 */
@StartableByRPC
class GetMembershipStateBySecurityDomain(val securityDomain: String)
    : FlowLogic<Either<Error, StateAndRef<MembershipState>>>() {

    @Suspendable
    override fun call(): Either<Error, StateAndRef<MembershipState>> = try {
        println("Getting Membership for securityDomain $securityDomain.")

        val states = serviceHub.vaultService.queryBy<MembershipState>().states
                .filter { it.state.data.securityDomain == securityDomain }
        println("States with securityDomain $securityDomain: $states\n")
        if (states.isEmpty()) {
            println("Membership for securityDomain $securityDomain not found\n")
            Left(Error("Error: Membership for securityDomain $securityDomain not found"))
        } else {
            Right(states.first())
        }
    } catch (e: Exception) {
        println("Error getting Membership: ${e.message}\n")
        Left(Error("Error getting Membership: ${e.message}"))
    }
}

/**
 * The GetMembershipStates flow gets all the [MembershipState]s in the ledger.
 */
@StartableByRPC
class GetMembershipStates() : FlowLogic<List<StateAndRef<MembershipState>>>() {

    @Suspendable
    override fun call(): List<StateAndRef<MembershipState>> {
        println("Getting all Memberships.")

        val states = serviceHub.vaultService.queryBy<MembershipState>().states

        println("Found memberships: $states\n")
        return states
    }
}

/**
 * The verifyMemberInSecurityDomain function verifies the identity of the requester according to
 * the [MembershipState] for the external network the request originated from.
 *
 * This involves the following steps
 * - Check that the certificate for the requester has not expired.
 * - Find the Membership state for the external network
 * - Find the member corresponding to the requester in the Membership
 * - Check the type of membership policy is associated with the member and verify according to that policy.
 *
 * @param cert The x509 certificate of the requester.
 * @param securityDomain The identifier of the network the requester belongs to.
 * @param serviceHub The service hub is used to make vault query operations.
 * @return Returns an Either with an Error if verification failed, or true.
 */
fun verifyMemberInSecurityDomain(
        cert: X509Certificate,
        securityDomain: String,
        requestingOrg: String,
        serviceHub: ServiceHub): Either<Error, Unit> = try {
    println("Verifying the identity of $requestingOrg according to the Membership for $securityDomain.")
        // Check that the certificate has not expired
        isCertificateWithinExpiry(cert)
                .flatMap {certificate ->
        // TODO: Look at Arrow's monad article to use them to flatten this structure
        getMembershipState(securityDomain, serviceHub).flatMap {membership ->
            getMemberFromMembershipState(requestingOrg, membership).flatMap {member ->
               when (member.type) {
                    "ca" -> verifyCaCertificate(certificate, member.value)
                    "certificate" -> verifyCertificateChain(certificate, member.chain)
                   else -> Left(Error("Only ca and certificate member types are implemented"))
                }
           }
        }
    }
} catch (e: Exception) {
    println("Error verifying the requester identity with the membership: ${e.message}\n")
    Left(Error("Verification Error: Error verifying membership member: ${e.message}"))
}

/**
 * The getMembershipState function performs a vaultQuery to find the [MembershipState] for a given network.
 *
 * @param securityDomain The network identifier for which to find the membership.
 * @param serviceHub The service hub is used to make vault query operations.
 * @return Returns an Either with an Error if the membership could not be found, or the [MembershipState].
 */
@Suspendable
fun getMembershipState(securityDomain: String, serviceHub: ServiceHub): Either<Error, MembershipState> = try {
    val membershipStateAndRef = serviceHub.vaultService.queryBy<MembershipState>().states
            .find { it.state.data.securityDomain == securityDomain }
    if (membershipStateAndRef == null) {
        println("Membership for securityDomain $securityDomain not found\n")
        Left(Error("Membership for securityDomain $securityDomain not found"))
    } else {
        val membership = membershipStateAndRef.state.data
        println("Membership found: $membership\n")
        Right(membership)
    }
} catch (e: Exception) {
    println("Error getting membership for securityDomain $securityDomain: ${e.message}\n")
    Left(Error("Error: Error getting membership: ${e.message}"))
}

/**
 * The getMemberFromMembershipState function takes the organization and finds the corresponding
 * [Member] in the [MembershipState].
 *
 * @param orgName The organisation name as a string.
 * @param membership The [MembershipState] the [Member] is a part of.
 * @return Returns an Either with an Error if the member could not be found, or the member.
 */
fun getMemberFromMembershipState(
        orgName: String,
        membership: MembershipState): Either<Error, Member> = try {
    println("Getting member for $orgName.\n")
    val member = membership.members.get(orgName)
    if (member == null) {
        println("$orgName not found on the member list for ${membership.securityDomain}\n")
        Left(Error("Verification Error: $orgName not found on the member list for ${membership.securityDomain}\n"))
    } else {
        // Note that the member has been null-checked above.
        Right(member)
    }
} catch (e: Exception) {
    println("Error getting member $orgName from membership for: ${e.message}\n")
    Left(Error("Error: Error getting member $orgName from membership for: ${e.message}"))
}
