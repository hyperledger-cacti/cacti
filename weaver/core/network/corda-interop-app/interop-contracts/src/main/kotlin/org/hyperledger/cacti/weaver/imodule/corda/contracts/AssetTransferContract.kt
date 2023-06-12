/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package org.hyperledger.cacti.weaver.imodule.corda.contracts

import org.hyperledger.cacti.weaver.imodule.corda.states.AssetPledgeState
import org.hyperledger.cacti.weaver.imodule.corda.states.AssetClaimStatusState
import org.hyperledger.cacti.weaver.imodule.corda.states.NetworkIdState
import org.hyperledger.cacti.weaver.imodule.corda.states.ExternalState
import org.hyperledger.cacti.weaver.protos.common.asset_transfer.AssetTransfer
import org.hyperledger.cacti.weaver.protos.common.state.State
import org.hyperledger.cacti.weaver.protos.fabric.view_data.ViewData
import org.hyperledger.cacti.weaver.protos.corda.ViewDataOuterClass
import org.hyperledger.cacti.weaver.protos.common.interop_payload.InteropPayloadOuterClass
import org.hyperledger.fabric.protos.peer.ProposalPackage
import net.corda.core.contracts.CommandData
import net.corda.core.contracts.Contract
import net.corda.core.contracts.requireSingleCommand
import net.corda.core.contracts.requireThat
import net.corda.core.contracts.StaticPointer
import net.corda.core.transactions.LedgerTransaction
import java.time.Instant
import java.util.*
import co.paralleluniverse.fibers.Suspendable

/**
 * AssetTransferContract defines the rules for managing a [AssetPledgeState].
 *
 */
class AssetTransferContract : Contract {
    companion object {
        // Used to identify our contract when building a transaction.
        const val ID = "org.hyperledger.cacti.weaver.imodule.corda.contracts.AssetTransferContract"
    }

    /**
     * A transaction is valid if the verify() function of the contract for any of the transaction's
     * input and output states does not throw an exception.
     */
    override fun verify(tx: LedgerTransaction) {
        val command = tx.commands.requireSingleCommand<Commands>()
        when (command.value) {
            is Commands.Pledge -> requireThat {
                "There should be one input state." using (tx.inputs.size == 1)
                "There should be one output AssetPledgeState." using (tx.outputsOfType<AssetPledgeState>().size == 1)
                
                // Get the Asset Pledge State
                val pledgeState = tx.outputsOfType<AssetPledgeState>()[0]

                // Check if output belong to this contract
                // "Output state should belong to this contract" using (tx.outputsOfType<AssetPledgeState>().contract().equals(ID))
                
                // Check if timeout is beyond current time
                val expiryTime = Instant.ofEpochSecond(pledgeState.expiryTimeSecs)
                "AssetPledgeState.expiryTimeSecs is after current time." using (expiryTime.isAfter(Instant.now()))
                
                // Check if the asset owner is the locker
                val inputState = tx.inputs[0].state.data
                "Locker must be the owner of pledged asset" using inputState.participants.containsAll(listOf(pledgeState.locker))
                
                // Check if asset consumed (input state) is the same used in pledge
                val assetPointer = StaticPointer(tx.inputs[0].ref, tx.inputs[0].state.data.javaClass)
                "Asset consumed should be the one used in pledge." using (assetPointer.equals(pledgeState.assetStatePointer))
                
                // Check if the locker is a signer
                val requiredSigners = pledgeState.participants.map { it.owningKey }
                "The required signers of the transaction must include the locker." using (command.signers.containsAll(requiredSigners))

                val inReferences = tx.referenceInputRefsOfType<NetworkIdState>()
                "There should be a single reference input network id." using (inReferences.size == 1)

                val validNetworkIdState = inReferences.get(0).state.data
                "AssetPledgeState.localNetwokId must match with the networkId of current network." using (pledgeState.localNetworkId.equals(validNetworkIdState.networkId))
            }
            is Commands.ClaimRemoteAsset -> requireThat {
                "There should be one input External state." using (tx.inputsOfType<ExternalState>().size == 1)
                "There should be two output states." using (tx.outputs.size == 2)
                "One of the output states should be of type AssetClaimStatusState." using (tx.outputsOfType<AssetClaimStatusState>().size == 1)

                // Check if output state [AssetClaimStatusState] belongs to this contract
                //"Output state should belong to this contract" using (claimStateAndRefs[0].contract.equals(ID))

                // Get the input remote pledge state (external state)
                val remotePledgeStatus = parseExternalStateForPledgeStatus(
                    tx.inputsOfType<ExternalState>()[0]
                )

                // Get the output asset claim state
                val claimState = tx.outputsOfType<AssetClaimStatusState>()[0]

                val inReferences = tx.referenceInputRefsOfType<NetworkIdState>()
                "There should be a single reference input network id." using (inReferences.size == 1)
                val validNetworkIdState = inReferences.get(0).state.data
                
                // Pledge State checks
                "Expiry Time should match in PledgeState and ClaimStatus" using (remotePledgeStatus.expiryTimeSecs == claimState.expiryTimeSecs)
                "Recipient should match in Pledge State and ClaimStatus" using (remotePledgeStatus.recipient == claimState.recipientCert)
                "NetworkId should match in Pledge State and ClaimStatu" using (remotePledgeStatus.remoteNetworkID == claimState.localNetworkID)

                // Claim State checks
                "AssetClaimStatusState.localNetwokID must match with the networkId of current network." using (claimState.localNetworkID.equals(validNetworkIdState.networkId))

                // Check if timeWindow <= expiryTime
                val untilTime = tx.timeWindow!!.untilTime!!
                val expiryTime = Instant.ofEpochSecond(claimState.expiryTimeSecs)
                "TimeWindow to claim pledged remote asset should be before expiry time." using
                        (untilTime.isBefore(expiryTime) || untilTime.equals(expiryTime))

                // Check if the owner of the asset in the importing network after asset claim is the recipient
                val outputAssetState = tx.outputs[0].data
                "Recipient must be the owner of claimed asset." using (outputAssetState.participants.containsAll(listOf(claimState.recipient)))

                // Check if the recipient is a signer
                val requiredSigners = claimState.participants.map { it.owningKey }
                "The required signers of the transaction must include the recipient." using (command.signers.containsAll(requiredSigners))
            }
            is Commands.ReclaimPledgedAsset -> requireThat {
                "There should be one input AssetPledgeState." using (tx.inputsOfType<AssetPledgeState>().size == 1)
                "There should be one input ExternalState." using (tx.inputsOfType<ExternalState>().size == 1)
                "There should be one output state." using (tx.outputs.size == 1)
                
                // Get the input asset pledge state
                val pledgeState = tx.inputsOfType<AssetPledgeState>()[0]
                
                // Get the input remote pledge state (external state)
                val remoteClaimStatus = parseExternalStateForClaimStatus(
                    tx.inputsOfType<ExternalState>()[0]
                )
                
                // Claim Status checks
                "Expiry Time should match in PledgeState and ClaimStatus" using (remoteClaimStatus.expiryTimeSecs == pledgeState.expiryTimeSecs)
                "ClaimStatus should be false" using (remoteClaimStatus.claimStatus == false)
                "Expiration status should be true" using (remoteClaimStatus.expirationStatus == true)
                
                // Check if timeWindow > expiryTime
                val fromTime = tx.timeWindow!!.fromTime!!
                "TimeWindow for reclaim pledged asset should be after expiry time." using (fromTime.isAfter(Instant.ofEpochSecond(pledgeState.expiryTimeSecs)))
                
                // Check if the asset owner is the locker
                val outputState = tx.outputs[0].data
                "Locker must be the owner of pledged asset" using outputState.participants.containsAll(listOf(pledgeState.locker))
                
                // Verify if locker is the signer
                val requiredSigners = listOf(pledgeState.locker.owningKey)
                "The required signers of the transaction must include the locker." using (command.signers.containsAll(requiredSigners))

                val inReferences = tx.referenceInputRefsOfType<NetworkIdState>()
                "There should be a single reference input network id." using (inReferences.size == 1)
                val validNetworkIdState = inReferences.get(0).state.data

                "LocalNetwokId must match with the networkId of current network." using (pledgeState.localNetworkId.equals(validNetworkIdState.networkId))
            }
        }
    }

    /**
     * Commands are used to indicate the intent of a transaction.
     * Commands for [AssetTransferContract] are:
     * - Pledge
     * - ReclaimPledgedAsset
     * - ClaimRemoteAsset
     */
    interface Commands : CommandData {
        class Pledge : Commands
        class ReclaimPledgedAsset : Commands
        class ClaimRemoteAsset : Commands
    }
}

@Suspendable
fun parseExternalStateForPledgeStatus(
    externalState: ExternalState
): AssetTransfer.AssetPledge {
    val viewMetaByteArray = externalState.meta
    val viewDataByteArray = externalState.state
    val meta = State.Meta.parseFrom(viewMetaByteArray)

    var payload: ByteArray
    when (meta.protocol) {
        State.Meta.Protocol.CORDA -> {
            val cordaViewData = ViewDataOuterClass.ViewData.parseFrom(viewDataByteArray)
            println("cordaViewData: $cordaViewData")
            val interopPayload = InteropPayloadOuterClass.InteropPayload.parseFrom(cordaViewData.notarizedPayloadsList[0].payload)
            payload = interopPayload.payload.toByteArray()
        }
        State.Meta.Protocol.FABRIC -> {
            val fabricViewData = ViewData.FabricView.parseFrom(viewDataByteArray)
            println("fabricViewData: $fabricViewData")
            // TODO: We assume here that the response payloads have been matched earlier, but perhaps we should match them here too
            val chaincodeAction = ProposalPackage.ChaincodeAction.parseFrom(fabricViewData.endorsedProposalResponsesList[0].payload.extension)
            val interopPayload = InteropPayloadOuterClass.InteropPayload.parseFrom(chaincodeAction.response.payload)
            payload = interopPayload.payload.toByteArray()
        }
        else -> {
            println("GetExternalStateByLinearId Error: Unrecognized protocol.\n")
            throw IllegalArgumentException("Error: Unrecognized protocol.")
        }
    }
    val payloadDecoded = Base64.getDecoder().decode(payload)
    val assetPledgeStatus = AssetTransfer.AssetPledge.parseFrom(payloadDecoded)
    return assetPledgeStatus
}

@Suspendable
fun parseExternalStateForClaimStatus(
    externalState: ExternalState
): AssetTransfer.AssetClaimStatus {
    val viewMetaByteArray = externalState.meta
    val viewDataByteArray = externalState.state
    val meta = State.Meta.parseFrom(viewMetaByteArray)

    var payload: ByteArray
    when (meta.protocol) {
        State.Meta.Protocol.CORDA -> {
            val cordaViewData = ViewDataOuterClass.ViewData.parseFrom(viewDataByteArray)
            println("cordaViewData: $cordaViewData")
            val interopPayload = InteropPayloadOuterClass.InteropPayload.parseFrom(cordaViewData.notarizedPayloadsList[0].payload)
            payload = interopPayload.payload.toByteArray()
        }
        State.Meta.Protocol.FABRIC -> {
            val fabricViewData = ViewData.FabricView.parseFrom(viewDataByteArray)
            println("fabricViewData: $fabricViewData")
            // TODO: We assume here that the response payloads have been matched earlier, but perhaps we should match them here too
            val chaincodeAction = ProposalPackage.ChaincodeAction.parseFrom(fabricViewData.endorsedProposalResponsesList[0].payload.extension)
            val interopPayload = InteropPayloadOuterClass.InteropPayload.parseFrom(chaincodeAction.response.payload)
            payload = interopPayload.payload.toByteArray()
        }
        else -> {
            println("GetExternalStateByLinearId Error: Unrecognized protocol.\n")
            throw IllegalArgumentException("Error: Unrecognized protocol.")
        }
    }
    val payloadDecoded = Base64.getDecoder().decode(payload)
    val assetClaimStatus = AssetTransfer.AssetClaimStatus.parseFrom(payloadDecoded)
    return assetClaimStatus
}
