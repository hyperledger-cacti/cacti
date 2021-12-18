package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size
import javax.validation.Valid

/**
 * 
 * @param success 
 * @param callOutput Data returned from the JVM when no transaction is running
 * @param flowId The id for the flow handle
 * @param transactionId The net.corda.core.flows.StateMachineRunId value returned by the flow execution.
 * @param progress An array of strings representing the aggregated stream of progress updates provided by a *tracked* flow invocation. If the flow invocation was not tracked, this array is still returned, but as empty.
 */
data class InvokeContractV1Response(

    @field:JsonProperty("success", required = true) val success: kotlin.Boolean,

    @field:Valid
    @field:JsonProperty("callOutput", required = true) val callOutput: kotlin.Any,

    @field:JsonProperty("flowId", required = true) val flowId: kotlin.String,

    @get:Size(min=1,max=1024)
    @field:JsonProperty("transactionId") val transactionId: kotlin.String? = null,

    @field:JsonProperty("progress") val progress: kotlin.collections.List<kotlin.String>? = null
) {

}

