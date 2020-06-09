package com.accenture.interoperability.webserver

import com.accenture.interoperability.contracts.ForeignPubKey
import com.accenture.interoperability.flows.CopyAssetFlow
import com.accenture.interoperability.flows.CreateActorFlow
import com.accenture.interoperability.flows.VerifySignedMessageFlow
import com.accenture.interoperability.states.ActorState
import com.accenture.interoperability.states.ActorType
import net.corda.core.node.services.vault.QueryCriteria
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/actors")
class ActorsController(rpc: NodeRPCConnection) {

    private val proxy = rpc.proxy

    class ActorRequestBody(
        val async: Boolean?,
        val name: String,
        val type: ActorType,
        val pubKey: String
    )

    @PostMapping("/create", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun createActor(
        @RequestBody requestBody: ActorRequestBody
    ): ResponseEntity<Any> {
        val pubKey = ForeignPubKey.verifyPubKey(requestBody.pubKey)

        val parties = proxy.networkMapSnapshot()
            .map { it.legalIdentities.first() } - proxy.notaryIdentities()

        val flowHandler = proxy.startFlowDynamic(
            CreateActorFlow.Initiator::class.java,
            pubKey,
            parties,
            requestBody.name,
            requestBody.type
        )


        val out = if (requestBody.async == false) {
            Pair("transactionHash", flowHandler.returnValue.get().toString())
        } else {
            flowHandler.close()
            Pair("stateMachineRunId", flowHandler.id.toString())
        }

        return ResponseEntity.ok(mapOf(out))
    }


    class ActorOutput(
        val uuid: String,
        val name: String,
        val type: String,
        val pubKey: String
    ) {
        constructor(actor: ActorState) : this(
            uuid = actor.linearId.id.toString(),
            name = actor.name,
            type = actor.type.name,
            pubKey = actor.pubKey
        )
    }

    @GetMapping("/list", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun getActorsList(): ResponseEntity<Any> {
        val actors = proxy.vaultQuery(
            ActorState::class.java
        ).states.map {
            ActorOutput(it.state.data)
        }
        return ResponseEntity.ok(actors)
    }

    @GetMapping("/{pubKey:.+}", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun getActorByPubKey(
        @PathVariable pubKey: String
    ): ResponseEntity<Any> {
        val actor = proxy.vaultQueryByCriteria<ActorState>(
            QueryCriteria.LinearStateQueryCriteria(
                externalId = listOf(pubKey)
            ),
            ActorState::class.java
        ).states.singleOrNull()?.state?.data
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(ActorOutput(actor))
    }


    class VerifyRequestBody(
        val message: String,
        val signatures: List<String>
    )

    @PostMapping("/verify", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun verifySignatures(
        @RequestBody requestBody: VerifyRequestBody
    ): ResponseEntity<Any> {

        val pair = verifyMessageAndSignatures(requestBody.message, requestBody.signatures)

        return ResponseEntity.ok(
            mapOf(
                "message" to requestBody.message, // input message
                "signatures" to requestBody.signatures, // input signatures
                "verify" to pair.first, // result of verification
                "verifyStateRef" to pair.second?.toString() // reference to VerifyState or null
            )
        )
    }

    @PostMapping("/verify-state", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun checkVerifySignatures(
        @RequestBody requestBody: VerifyRequestBody
    ): ResponseEntity<Any> {

        val pair = queryVerifyState(requestBody.message, requestBody.signatures)

        return ResponseEntity.ok(
            mapOf(
                "message" to requestBody.message, // input message
                "signatures" to requestBody.signatures,  // input signatures
                "verify" to pair?.first, // result of verification if VerifyState exists otherwise null
                "verifyStateRef" to pair?.second?.toString() // reference to existing VerifyState or null
            )
        )
    }

    @PostMapping("/verify-and-create", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun verifySignaturesAndCreateAsset(
        @RequestBody requestBody: VerifyRequestBody
    ): ResponseEntity<Any> {

        val pair = verifyMessageAndSignatures(requestBody.message, requestBody.signatures)

        // if VerifyState exists trigger a CopyAssetFlow and return transaction id otherwise return null
        val transactionHash = pair.second?.let { stateRef ->
            val participants = proxy.networkMapSnapshot()
                .map { it.legalIdentities.first() } - proxy.notaryIdentities()
            proxy.startFlowDynamic(
                CopyAssetFlow.Initiator::class.java,
                stateRef,
                participants
            ).returnValue.get().toString()
        }

        return ResponseEntity.ok(
            mapOf(
                "message" to requestBody.message, // input message
                "signatures" to requestBody.signatures,  // input signatures
                "verify" to pair.first,// result of verification
                "verifyStateRef" to pair.second?.toString(), // reference to VerifyState or null
                "transactionHash" to transactionHash  // id of the transaction that created the Asset
            )
        )
    }

    private fun queryVerifyState(
        message: String, signatures: List<String>
    ) = proxy.startFlowDynamic(
        VerifySignedMessageFlow.QueryAlreadyBeenValidated::class.java,
        message,
        signatures
    ).returnValue.get().firstOrNull()

    private fun verifyMessageAndSignatures(
        message: String, signatures: List<String>
    ) = queryVerifyState(message, signatures) // Check that this message and these signatures have already been verified.
        ?: // Not found. Verify the message and signatures now
        proxy.startFlowDynamic(
            VerifySignedMessageFlow.Initiator::class.java,
            message,
            signatures
        ).returnValue.get()
}
