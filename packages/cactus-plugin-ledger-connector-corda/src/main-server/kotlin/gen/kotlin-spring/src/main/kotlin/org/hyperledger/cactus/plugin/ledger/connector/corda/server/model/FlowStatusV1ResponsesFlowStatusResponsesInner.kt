package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.FlowV1Error
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Email
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size
import javax.validation.Valid

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

    @get:JsonProperty("clientRequestId") val clientRequestId: kotlin.String? = null,

    @field:Valid
    @get:JsonProperty("flowError") val flowError: FlowV1Error? = null,

    @get:JsonProperty("flowId") val flowId: kotlin.String? = null,

    @get:JsonProperty("flowResult") val flowResult: kotlin.String? = null,

    @get:JsonProperty("flowStatus") val flowStatus: kotlin.String? = null,

    @get:JsonProperty("holdingIDShortHash") val holdingIDShortHash: kotlin.String? = null,

    @get:JsonProperty("timestamp") val timestamp: java.time.OffsetDateTime? = null
) {

}
