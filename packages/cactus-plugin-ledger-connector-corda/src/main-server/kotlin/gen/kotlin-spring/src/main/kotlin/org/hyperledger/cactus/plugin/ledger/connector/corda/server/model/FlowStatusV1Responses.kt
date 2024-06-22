package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.FlowStatusV1ResponsesFlowStatusResponsesInner
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
 * @param flowStatusResponses 
 */
data class FlowStatusV1Responses(

    @field:Valid
    @get:JsonProperty("flowStatusResponses") val flowStatusResponses: kotlin.collections.List<FlowStatusV1ResponsesFlowStatusResponsesInner>? = null
) {

}
