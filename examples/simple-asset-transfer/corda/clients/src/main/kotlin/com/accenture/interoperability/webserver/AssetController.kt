package com.accenture.interoperability.webserver

import com.accenture.interoperability.contracts.ForeignAssetFactory
import com.accenture.interoperability.contracts.ForeignPubKey
import com.accenture.interoperability.flows.CopyAssetFlow
import com.accenture.interoperability.flows.CreateAssetFlow
import com.accenture.interoperability.flows.GetAssetFlow
import com.accenture.interoperability.flows.LockAssetFlow
import net.corda.core.contracts.StateRef
import net.corda.core.crypto.SecureHash
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*


@RestController
@RequestMapping("/api/v1/asset")
class AssetController(rpc: NodeRPCConnection) {

    private val proxy = rpc.proxy

    class CreateAssetRequestBody(
        val async: Boolean?,
        val assetId: String,
        val origin: List<ForeignAssetFactory.Origin>,
        val properties: ForeignAssetFactory.Properties
    ) {
        fun asCreateAssetFlowMessage() = ForeignAssetFactory.Message(
            assetId = assetId,
            origin = origin,
            properties = properties
        )
    }

    @PostMapping("/make-message", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun makeCreateAssetMessage(
        @RequestBody requestBody: CreateAssetRequestBody
    ) = ResponseEntity.ok(
        mapOf(
            "message" to ForeignAssetFactory.asJsonString(
                requestBody.asCreateAssetFlowMessage()
            )
        )
    )


    @PostMapping("/create", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun createAsset(
        @RequestBody requestBody: CreateAssetRequestBody
    ): ResponseEntity<Any> {

        val parties = proxy.networkMapSnapshot()
            .map { it.legalIdentities.first() } - proxy.notaryIdentities()

        val flowHandler = proxy.startFlowDynamic(
            CreateAssetFlow.Initiator::class.java,
            requestBody.asCreateAssetFlowMessage(),
            parties
        )

        val out = if (requestBody.async == false) {
            Pair("transactionHash", flowHandler.returnValue.get().toString())
        } else {
            flowHandler.close()
            Pair("stateMachineRunId", flowHandler.id.toString())
        }

        return ResponseEntity.ok(mapOf(out))
    }

    class AssetOutput(
        val assetId: String,
        val origin: List<ForeignAssetFactory.Origin>,
        val property1: String,
        val property2: String,
        val locked: Boolean,
        val targetDltId: String,
        val receiverPK: String
    )

    @GetMapping("/{assetId:.+}", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun getAsset(
        @PathVariable assetId: String
    ): ResponseEntity<Any> {
        val assetState = proxy.startFlowDynamic(
            GetAssetFlow::class.java, assetId
        ).returnValue.get()?.state?.data
            ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok(
            AssetOutput(
                assetId = assetState.assetId ?: "",
                origin = assetState.origin.map(ForeignAssetFactory::pair2origin),
                property1 = assetState.property1,
                property2 = assetState.property2,
                locked = assetState.locked,
                targetDltId = assetState.targetDltId ?: "",
                receiverPK = assetState.receiverPK ?: ""
            )
        )
    }


    class LockAssetRequestBody(
        val async: Boolean?,
        val assetId: String,
        val targetDLTId: String,
        val receiverPubKey: String
    )

    @PostMapping("/lock", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun lockAsset(
        @RequestBody requestBody: LockAssetRequestBody
    ): ResponseEntity<Any> {

        val receiverPK = ForeignPubKey.verifyPubKey(
            requestBody.receiverPubKey
        )

        val flowHandler = proxy.startFlowDynamic(
            LockAssetFlow.Initiator::class.java,
            requestBody.assetId, requestBody.targetDLTId,
            receiverPK
        )

        val out = if (requestBody.async == false) {
            Pair("transactionHash", flowHandler.returnValue.get().toString())
        } else {
            flowHandler.close()
            Pair("stateMachineRunId", flowHandler.id.toString())
        }

        return ResponseEntity.ok(mapOf(out))
    }
}
