/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

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
import org.hyperledger.fabric.protos.peer.ProposalResponsePackage
import java.util.Base64

import net.corda.core.node.services.queryBy
import net.corda.core.node.services.vault.QueryCriteria
import fabric.view_data.ViewData
import common.interop_payload.InteropPayloadOuterClass


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


/**
 * The GetExternalBoLByLinearId flow is used to read an External State and parse
 * the View Data.
 *
 * @property externalStateLinearId the linearId for the ExternalState.
 */
@StartableByRPC
class GetExternalStateByLinearId(
        val externalStateLinearId: String
) : FlowLogic<ByteArray>() {

    @Suspendable
    override fun call(): ByteArray {
        println("Getting External State for linearId $externalStateLinearId stored in vault\n.")
        val linearId = UniqueIdentifier.fromString(externalStateLinearId)
        //val linearId = externalStateLinearId
        val states = serviceHub.vaultService.queryBy<ExternalState>(
                QueryCriteria.LinearStateQueryCriteria(linearId = listOf(linearId))
        ).states

        if (states.isEmpty()) {
            println("Error: Could not find external state with linearId $linearId")
            return "error".toByteArray()
        } else {
            val viewMetaByteArray = states.first().state.data.meta
            val viewDataByteArray = states.first().state.data.state
            // val utf8MetaString = Base64.getDecoder().decode(viewMetaString).toString(Charsets.UTF_8)
            // println("GetExternalStateByLinearId: $utf8MetaString")
            val meta = State.Meta.parseFrom(viewMetaByteArray)

            when (meta.protocol) {
                State.Meta.Protocol.CORDA -> {
                    println("GetExternalStateByLinearId Error: Read Corda View not implemented.\n")
                    return "error".toByteArray()
                }
                State.Meta.Protocol.FABRIC -> {
                    // val utf8String = Base64.getDecoder().decode(viewDataString).toString(Charsets.UTF_8)
                    // println("GetExternalStateByLinearId: $utf8String")
                    val fabricViewData = ViewData.FabricView.parseFrom(viewDataByteArray)
                    println("fabricViewData: $fabricViewData")
                    // val proposalResponses = fabricViewData.peerResponses.map { it.proposalResponse }
                    val interopPayload = InteropPayloadOuterClass.InteropPayload.parseFrom(fabricViewData.response.payload)
                    // Construct the external state proof
                    // val externalStateProof = ExternalStateProof(
                    //         proposals = fabricViewData.peerResponses.map { it.proposal },
                    //         proposalResponses = proposalResponses,
                    //         nwId = fabricViewData.networkId,
                    //         chId = fabricViewData.channelId,
                    //         ccId = fabricViewData.chaincodeId,
                    //         ccFunc = fabricViewData.chaincodeFn)

                    // println("External state proof: $externalStateProof\n")
                    // val proposalResponseString = Base64.getDecoder().decode(proposalResponses.first())
                    // println("Proposal response string: $proposalResponseString\n")
                    //
                    // val proposalResponse = ProposalResponsePackage.ProposalResponse.parseFrom(proposalResponseString)
                    // println("Proposal Response : $proposalResponse\n")
                    // println(proposalResponse.response.payload.javaClass.name)
                    // val payloadString = proposalResponse.response.payload.toStringUtf8()
                    println("response from remote: ${interopPayload.payload.toStringUtf8()}.\n")
                    println("query address: ${interopPayload.address}.\n")
                    return interopPayload.payload.toStringUtf8().toByteArray()
                }
                else -> {
                    println("GetExternalStateByLinearId Error: Unrecognized protocol.\n")
                    return "error".toByteArray()
                }
            }


        }
    }

}
