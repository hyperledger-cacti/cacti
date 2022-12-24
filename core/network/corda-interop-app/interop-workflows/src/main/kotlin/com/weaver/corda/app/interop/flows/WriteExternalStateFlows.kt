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
import net.corda.core.contracts.Command
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.flows.*
import net.corda.core.transactions.TransactionBuilder
import java.util.Base64
import net.corda.core.node.services.queryBy
import net.corda.core.node.services.vault.QueryCriteria
import com.google.protobuf.ByteString

import org.hyperledger.fabric.protos.msp.Identities
import org.hyperledger.fabric.protos.peer.ProposalPackage

import com.weaver.protos.common.state.State
import com.weaver.protos.fabric.view_data.ViewData
import com.weaver.protos.corda.ViewDataOuterClass
import com.weaver.protos.common.interop_payload.InteropPayloadOuterClass
import com.weaver.corda.app.interop.contracts.ExternalStateContract
import com.weaver.corda.app.interop.states.ExternalState


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
            println("Storing ExternalState in the vault:\n\tLinear Id = ${state.linearId}\n\tParticipants = ${state.participants}\n\tMeta = ${view.meta}\tState = ${Base64.getEncoder().encodeToString(state.state)}\n")

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
    /**
     * The call() method captures the logic to read external state written into the vault,
     * and parse the payload and proof based on the protocol.
     *
     * @return Returns JSON string in ByteArray containing: payload, signatures, and proof message.
     */
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
            throw IllegalArgumentException("Error: Could not find external state with linearId $linearId")
        } else {
            val viewMetaByteArray = states.first().state.data.meta
            val viewDataByteArray = states.first().state.data.state
            val meta = State.Meta.parseFrom(viewMetaByteArray)

            when (meta.protocol) {
                State.Meta.Protocol.CORDA -> {
                    val cordaViewData = ViewDataOuterClass.ViewData.parseFrom(viewDataByteArray)
                    println("cordaViewData: $cordaViewData")
                    val interopPayload = InteropPayloadOuterClass.InteropPayload.parseFrom(cordaViewData.payload)
                    val payloadString = interopPayload.payload.toStringUtf8()
                    println("response from remote: ${payloadString}.\n")
                    println("query address: ${interopPayload.address}.\n")
                    val viewData = ViewDataOuterClass.ViewData.newBuilder()
                            .addAllNotarizations(cordaViewData.notarizationsList)
                            .setPayload(interopPayload.payload)
                            .build()
                            
                    return viewData.toByteArray()
                }
                State.Meta.Protocol.FABRIC -> {
                    val fabricViewData = ViewData.FabricView.parseFrom(viewDataByteArray)
                    println("fabricViewData: $fabricViewData")
                    // TODO: We assume here that the response payloads have been matched earlier, but perhaps we should match them here too
                    val chaincodeAction = ProposalPackage.ChaincodeAction.parseFrom(fabricViewData.endorsedProposalResponsesList[0].payload.extension)
                    val interopPayload = InteropPayloadOuterClass.InteropPayload.parseFrom(chaincodeAction.response.payload)
                    val payloadString = interopPayload.payload.toStringUtf8()
                    println("response from remote: ${payloadString}.\n")
                    println("query address: ${interopPayload.address}.\n")

                    val securityDomain = interopPayload.address.split("/")[1]
                    val proofStringPrefix = "Verified Proof: Endorsed by members: ["
                    val proofStringSuffix = "] of security domain: $securityDomain"
                    var mspIdList = ""
                    fabricViewData.endorsedProposalResponsesList.map { endorsedProposalResponse ->
                        val endorsement = endorsedProposalResponse.endorsement
                        val mspId = Identities.SerializedIdentity.parseFrom(endorsement.endorser).mspid
                        if (mspIdList.isNotEmpty()) {
                            mspIdList += ", "
                        }
                        mspIdList += mspId
                    }
                    val proofMessage = proofStringPrefix + mspIdList + proofStringSuffix
                    println("Proof Message: ${proofMessage}.\n")

                    var notarizationList: List<ViewDataOuterClass.ViewData.Notarization> = listOf()

                    fabricViewData.endorsedProposalResponsesList.map { endorsedProposalResponse ->
                        val endorsement = endorsedProposalResponse.endorsement
                        val serializedIdentity = Identities.SerializedIdentity.parseFrom(endorsement.endorser)
                        val mspId = serializedIdentity.mspid
                        val certString = Base64.getEncoder().encodeToString(serializedIdentity.idBytes.toByteArray())
                        val signature = Base64.getEncoder().encodeToString(endorsement.signature.toByteArray())
                        
                        val notarization = ViewDataOuterClass.ViewData.Notarization.newBuilder()
                                .setCertificate(certString)
                                .setSignature(signature)
                                .setId(mspId)
                                .build()
                        notarizationList = notarizationList + notarization
                    }

                    val viewData = ViewDataOuterClass.ViewData.newBuilder()
                            .addAllNotarizations(notarizationList)
                            .setPayload(interopPayload.payload)
                            .build()
                            
                    return viewData.toByteArray()
                }
                else -> {
                    println("GetExternalStateByLinearId Error: Unrecognized protocol.\n")
                    throw IllegalArgumentException("Error: Unrecognized protocol.")
                }
            }


        }
    }

}
