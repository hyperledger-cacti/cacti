package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonValue
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.FlowInvocationType
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.JvmObject
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
 * @param flowFullClassName The fully qualified name of the Corda flow to invoke
 * @param flowInvocationType 
 * @param params The list of arguments to pass in to the contract method being invoked.
 * @param timeoutMs The amount of milliseconds to wait for a transaction receipt beforegiving up and crashing.
 */
data class InvokeContractV1Request(

    @get:Size(min=1,max=1024)
    @get:JsonProperty("flowFullClassName", required = true) val flowFullClassName: kotlin.String,

    @field:Valid
    @get:JsonProperty("flowInvocationType", required = true) val flowInvocationType: FlowInvocationType,

    @field:Valid
    @get:JsonProperty("params", required = true) val params: kotlin.collections.List<JvmObject> = arrayListOf(),

    @get:Min(0)
    @get:JsonProperty("timeoutMs") val timeoutMs: kotlin.Int? = 60000
) {

}
