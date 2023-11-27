package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Email
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size
import javax.validation.Valid
import io.swagger.v3.oas.annotations.media.Schema

/**
 * 
 * @param success 
 * @param callOutput Data returned from the JVM when no transaction is running
 * @param flowId The id for the flow handle
 * @param transactionId The net.corda.core.flows.StateMachineRunId value returned by the flow execution.
 * @param progress An array of strings representing the aggregated stream of progress updates provided by a *tracked* flow invocation. If the flow invocation was not tracked, this array is still returned, but as empty.
 */
data class InvokeContractV1Response(

    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("success", required = true) val success: kotlin.Boolean,

    @field:Valid
    @Schema(example = "null", required = true, description = "Data returned from the JVM when no transaction is running")
    @get:JsonProperty("callOutput", required = true) val callOutput: kotlin.Any,

    @Schema(example = "null", required = true, description = "The id for the flow handle")
    @get:JsonProperty("flowId", required = true) val flowId: kotlin.String,

    @get:Size(min=1,max=1024)
    @Schema(example = "null", description = "The net.corda.core.flows.StateMachineRunId value returned by the flow execution.")
    @get:JsonProperty("transactionId") val transactionId: kotlin.String? = null,

    @Schema(example = "null", description = "An array of strings representing the aggregated stream of progress updates provided by a *tracked* flow invocation. If the flow invocation was not tracked, this array is still returned, but as empty.")
    @get:JsonProperty("progress") val progress: kotlin.collections.List<kotlin.String>? = arrayListOf()
) {

}

