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
 * @param clientRequestId 
 * @param flowError 
 * @param flowId 
 * @param flowResult 
 * @param flowStatus 
 * @param holdingIDShortHash 
 * @param timestamp 
 */
data class FlowStatusV1ResponsesFlowStatusResponsesInner(

    @param:JsonProperty("clientRequestId")
    @get:JsonProperty("clientRequestId") val clientRequestId: kotlin.String? = null,

    @field:Valid
    @param:JsonProperty("flowError")
    @get:JsonProperty("flowError") val flowError: FlowV1Error? = null,

    @param:JsonProperty("flowId")
    @get:JsonProperty("flowId") val flowId: kotlin.String? = null,

    @param:JsonProperty("flowResult")
    @get:JsonProperty("flowResult") val flowResult: kotlin.String? = null,

    @param:JsonProperty("flowStatus")
    @get:JsonProperty("flowStatus") val flowStatus: kotlin.String? = null,

    @param:JsonProperty("holdingIDShortHash")
    @get:JsonProperty("holdingIDShortHash") val holdingIDShortHash: kotlin.String? = null,

    @param:JsonProperty("timestamp")
    @get:JsonProperty("timestamp") val timestamp: java.time.OffsetDateTime? = null
) {

}
