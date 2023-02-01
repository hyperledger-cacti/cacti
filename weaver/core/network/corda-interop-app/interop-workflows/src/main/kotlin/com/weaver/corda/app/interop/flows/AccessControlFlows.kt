/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows

import arrow.core.*
import co.paralleluniverse.fibers.Suspendable
import com.weaver.corda.app.interop.contracts.AccessControlPolicyStateContract
import com.weaver.corda.app.interop.states.AccessControlPolicyState
import com.weaver.corda.app.interop.states.Rule
import com.weaver.protos.common.access_control.AccessControl
import com.weaver.protos.common.query.QueryOuterClass
import net.corda.core.contracts.Command
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.flows.*
import net.corda.core.node.services.queryBy
import net.corda.core.contracts.requireThat
import net.corda.core.contracts.StateAndRef
import net.corda.core.node.ServiceHub
import net.corda.core.transactions.TransactionBuilder
import net.corda.core.transactions.SignedTransaction
import net.corda.core.identity.Party

/**
 * The CreateAccessControlPolicy flow is used to store an [AccessControlPolicyState] in the Corda ledger.
 *
 * The access control policy is used by the Corda network to store the rules on the views that parties from
 * a foreign network are permitted to access.
 *
 * An access control policy is a set of access rules applied to a security domain that describe what resource
 * a principal can access.
 * The principal is a security principal an external subject resolves to. When requesting access, the
 * subject must present valid credentials identifying itself with a security domain.
 * the underlying ledger technology and can include references to business objects, smart contracts,
 * smart contract functions, or other types of code that can result in access to state.
 *
 * @property accessControlPolicy The [AccessControlPolicyState] provided by the Corda client to be stored in the vault.
 */
@InitiatingFlow
@StartableByRPC
class CreateAccessControlPolicy
@JvmOverloads
constructor(
        val accessControlPolicy: AccessControlPolicyState,
        val sharedParties: List<Party> = listOf<Party>()
) : FlowLogic<Either<Error, UniqueIdentifier>>() {
    /**
     * The call() method captures the logic to create a new [AccessControlPolicyState] state in the vault.
     *
     * It first checks that a [AccessControlPolicyState] does not already exist in the vault. It then builds
     * and verifies the transaction, and collects the required signatures.
     *
     * @return Returns the linearId of the newly created [AccessControlPolicyState].
     */
    @Suspendable
    override fun call(): Either<Error, UniqueIdentifier> = try {
        println("Access Control Policy to be stored in the vault: $accessControlPolicy")

        // 1. Check that a access control for that security domain does not already exist
        subFlow(GetAccessControlPolicyBySecurityDomain(accessControlPolicy.securityDomain)).fold({
            // If the flow produces an error, then the access control policy does not already exist.
            
            // Create the access control to store with our identity listed as a participant
            val outputState = accessControlPolicy.copy(participants = listOf(ourIdentity) + sharedParties)

            // 2. Build the transaction
            val notary = serviceHub.networkMapCache.notaryIdentities.first()
            val command = Command(AccessControlPolicyStateContract.Commands.Issue(), ourIdentity.owningKey)
            val txBuilder = TransactionBuilder(notary)
                    .addOutputState(outputState, AccessControlPolicyStateContract.ID)
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
            val storedAccessControlPolicyState = subFlow(FinalityFlow(fullySignedTx, sessions)).tx.outputStates.first() as AccessControlPolicyState

            // 4. Return the linearId of the state
            println("Successfully stored access control policy $storedAccessControlPolicyState in the vault.\n")
            Right(storedAccessControlPolicyState.linearId)
        }, {
            println("Access Control Policy for network ${accessControlPolicy.securityDomain} already exists.")
            println("Access Control Policy: ${it.state.data}\n")
            Left(Error("Corda Network Error: Access Control Policy for network ${accessControlPolicy.securityDomain} already exists."))
        })
    } catch (e: Exception) {
        println("Error storing state in the ledger: ${e.message}\n")
        Left(Error("Failed to store state in ledger: ${e.message}"))
    }
}

@InitiatedBy(CreateAccessControlPolicy::class)
class CreateAccessControlPolicyResponder(val session: FlowSession) : FlowLogic<SignedTransaction>() {
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
* The UpdateAccessControlPolicyState flow is used to update an existing [AccessControlPolicyState] in the Corda ledger.
*
* @property AccessControlPolicyState The [AccessControlPolicyState] provided by the Corda client to replace the
 * existing [AccessControlPolicyState] for that network.
*/
@InitiatingFlow
@StartableByRPC
class UpdateAccessControlPolicyState(val accessControlPolicyState: AccessControlPolicyState) : FlowLogic<Either<Error, UniqueIdentifier>>() {

    /**
     * The call() method captures the logic to update an existing [AccessControlPolicyState] state in the vault.
     *
     * It first checks that a [AccessControlPolicyState] exists in the vault. It then copies the old access control policy
     * with the new data, builds and verifies the transaction, and collects the required signatures.
     *
     * @return Returns the linearId of the updated [AccessControlPolicyState].
     */
    @Suspendable
    override fun call(): Either<Error, UniqueIdentifier> = try {
        println("Access Control Policy to be updated in the vault: $accessControlPolicyState")

        // 1. Find the access control that needs to be updated
        val states = serviceHub.vaultService.queryBy<AccessControlPolicyState>().states
        val inputState = states.find {
            it.state.data.securityDomain == accessControlPolicyState.securityDomain
        }
        if (inputState == null) {
            println("Access Control Policy for network ${accessControlPolicyState.securityDomain} does not exist.\n")
            Left(Error("Corda Network Error: Access Control Policy for network ${accessControlPolicyState.securityDomain} does not exist"))
        } else {
            println("Current version of access control policy is $inputState")

            // 2. Create the output state from a copy of the input state with the provided
            // externalNetworkParticipants and flowsWhitelist. Note that the null status of
            // the inputState has been checked above.
            val outputState = inputState.state.data.copy(
                    rules = accessControlPolicyState.rules
            )
            println("Updating access control policy state to $outputState\n")

            // 3. Build the transaction
            val notary = serviceHub.networkMapCache.notaryIdentities.first()
            val command = Command(
                    AccessControlPolicyStateContract.Commands.Update(),
                    listOf(ourIdentity.owningKey))
            val txBuilder = TransactionBuilder(notary)
                    .addInputState(inputState)
                    .addOutputState(outputState, AccessControlPolicyStateContract.ID)
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
            println("Successfully updated access control policy in the ledger: $finalTx\n")

            // 4. Return the linearId of the state
            Right(inputState.state.data.linearId)
        }
    } catch (e: Exception) {
        println("Error updating access control policy: ${e.message}\n")
        Left(Error("Failed to store state in ledger: ${e.message}"))
    }
}

@InitiatedBy(UpdateAccessControlPolicyState::class)
class UpdateAccessControlPolicyStateResponder(val session: FlowSession) : FlowLogic<SignedTransaction>() {
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
 * The DeleteAccessControlPolicyState flow is used to delete an existing [AccessControlPolicyState] in the Corda ledger.
 *
 * @property securityDomain The identifier for the network for which the [AccessControlPolicyState] is to be deleted.
 */
@InitiatingFlow
@StartableByRPC
class DeleteAccessControlPolicyState(val securityDomain: String) : FlowLogic<Either<Error, UniqueIdentifier>>() {

    /**
     * The call() method captures the logic to build and sign a transaction that deletes a [AccessControlPolicyState].
     *
     * @return returns the linearId of the deleted state.
     */
    @Suspendable
    override fun call(): Either<Error, UniqueIdentifier> = try {
        println("Access Control Policy for security domain $securityDomain to be deleted from the ledger.")

        val notary = serviceHub.networkMapCache.notaryIdentities[0]

        // 1. Find the access control policy that needs to be deleted
        val states = serviceHub.vaultService.queryBy<AccessControlPolicyState>().states
        val inputState = states.find { it.state.data.securityDomain == securityDomain }
        if (inputState == null) {
            println("Access Control Policy for security domain $securityDomain does not exist.\n")
            Left(Error("Corda Network Error: Access Control Policy for security domain $securityDomain does not exist"))
        } else {
            // 2. Build the transaction
            val participants = inputState.state.data.participants.map { it.owningKey }
            val txCommand = Command(AccessControlPolicyStateContract.Commands.Delete(), participants)
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
            println("Successfully deleted access control policy from the ledger.\n")
            Right(inputState.state.data.linearId)
        }
    } catch (e: Exception) {
        println("Failed to delete access control policy from the ledger: ${e.message}.\n")
        Left(Error("Corda Network Error: Error deleting Access Control Policy for security domain $securityDomain: ${e.message}"))
    }
}

@InitiatedBy(DeleteAccessControlPolicyState::class)
class DeleteAccessControlPolicyStateResponder(val session: FlowSession) : FlowLogic<SignedTransaction>() {
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
 * The GetAccessControlPolicyBySecurityDomain flow gets the [AccessControlPolicyState] for the provided securityDomain.
 *
 * @property securityDomain The securityDomain for the [AccessControlPolicyState] to be retrieved.
 */
@StartableByRPC
class GetAccessControlPolicyBySecurityDomain(val securityDomain: String) : FlowLogic<Either<Error, StateAndRef<AccessControlPolicyState>>>() {

    @Suspendable
    override fun call(): Either<Error, StateAndRef<AccessControlPolicyState>> = try {
        println("Getting Access Control Policy for security domain $securityDomain.")

        val states = serviceHub.vaultService.queryBy<AccessControlPolicyState>().states
                .filter { it.state.data.securityDomain == securityDomain }
        println("States with securityDomain $securityDomain: $states\n")
        if (states.isEmpty()) {
            println("Access Control Policy for security domain $securityDomain not found\n")
            Left(Error("Error: Access Control Policy for security domain $securityDomain not found"))
        } else {
            Right(states.first())
        }
    } catch (e: Exception) {
        println("Corda Network Error: Error getting access control policy ${e.message}")
        Left(Error("Corda Network Error: Error getting access control policy ${e.message}"))
    }
}

/**
 * The GetAccessControlPolicies flow gets all the [AccessControlPolicyState]s in the ledger.
 */
@StartableByRPC
class GetAccessControlPolicies() : FlowLogic<List<StateAndRef<AccessControlPolicyState>>>() {

    @Suspendable
    override fun call(): List<StateAndRef<AccessControlPolicyState>> {
        println("Getting all Access Control Policies.")

        val states = serviceHub.vaultService.queryBy<AccessControlPolicyState>().states

        println("Found Access Control Policies: $states\n")
        return states
    }
}

/**
 * The verifyAccessToFlow looks up the Access Control State for the external network
 * and verifies that the requester has the required permission to call the specified flow.
 *
 * This requires the following checks:
 * - That an access control policy for the external network exists
 * - That the requested view address is on the whitelist of the access control policy
 * - That the specific party from the external network that made the request is on the list of
 * participants for the access control policy
 * - That the provided certificate for the requester matches the stored certificate in the access control policy
 *
 * @param query The query that the external network sent to the Corda network.
 * @param serviceHub The service hub is used to make vault query operations.
 * @return Returns and Either with an Error if verification failed, or true
 */
@Suspendable
fun verifyAccessToFlow(query: QueryOuterClass.Query, serviceHub: ServiceHub): Either<Error, Unit> = try {
    println("Verifying access for ${query.requestingNetwork} for address ${query.address}")

    // First get the access control policy for the requesting network
    val accessControlPolicyState = serviceHub.vaultService
            .queryBy<AccessControlPolicyState>().states
            .filter { it.state.data.securityDomain == query.requestingNetwork }
            .map { it.state.data }
            .single()
    println("Access control policy found: $accessControlPolicyState")

    parseAddress(query.address).flatMap { parsedAddress ->
        val bestMatch = accessControlPolicyState.rules.fold("", {acc, rule ->
            // if already found an exact match and principal is valid, ignore other rules
            if (acc == rule.resource && isPrincipalValid(rule, query.certificate)) {
                acc
            } else {
                // check if the identifier pattern is valid, that it matches the address
                // and it's longer (i.e. more specific) than the currentBestMatch and that the principal is valid
                if (validPatternString(rule.resource) && isPatternAndAddressMatch(rule.resource, parsedAddress.viewSegment)
                        && rule.resource.length > acc.length && isPrincipalValid(rule, query.certificate)) {
                    rule.resource
                } else {
                    acc
                }
            }
        })
        if (bestMatch.isNotEmpty()) {
            println("Access Control Policy PERMITS the request '${query.address}' from '${query.requestingNetwork}:${query.certificate}'\n")
            Right(Unit)
        } else {
            println("Access Control Error: No suitable access control policy rule found.")
            Left(Error("Access Control Error: No suitable access control policy rule found."))
        }
    }
} catch (e: Exception) {
    println("Error verifying access for ${query.requestingOrg} for the address: ${query.address} with error: ${e}\n")
    Left(Error("Error verifying access for ${query.requestingOrg} for the address: ${query.address} with error: ${e.message}"))
}

// TODO: Need to use principalType and perform different validation for type "certificate" and "ca". Atm code assumes its a certificate
fun isPrincipalValid(rule: Rule, cert: String): Boolean {
   return cert.trim() == rule.principal.trim()
}