package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.FlowV1Error
import jakarta.validation.constraints.DecimalMax
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import jakarta.validation.Valid

/**
 * 
 * @param flowStatus 
 * @param holdingIDShortHash 
 * @param timestamp 
 * @param clientRequestId 
 * @param flowError 
 * @param flowId 
 * @param flowResult 
 */
data class StartFlowV1Response(

    @param:JsonProperty("flowStatus", required = true)
    @get:JsonProperty("flowStatus", required = true) val flowStatus: kotlin.String,

    @param:JsonProperty("holdingIDShortHash", required = true)
    @get:JsonProperty("holdingIDShortHash", required = true) val holdingIDShortHash: kotlin.String,

    @param:JsonProperty("timestamp", required = true)
    @get:JsonProperty("timestamp", required = true) val timestamp: java.time.OffsetDateTime,

    @param:JsonProperty("clientRequestId")
    @get:JsonProperty("clientRequestId") val clientRequestId: kotlin.String? = null,

    @field:Valid
    @param:JsonProperty("flowError")
    @get:JsonProperty("flowError") val flowError: FlowV1Error? = null,

    @param:JsonProperty("flowId")
    @get:JsonProperty("flowId") val flowId: kotlin.String? = null,

    @param:JsonProperty("flowResult")
    @get:JsonProperty("flowResult") val flowResult: kotlin.String? = null
) {

}
