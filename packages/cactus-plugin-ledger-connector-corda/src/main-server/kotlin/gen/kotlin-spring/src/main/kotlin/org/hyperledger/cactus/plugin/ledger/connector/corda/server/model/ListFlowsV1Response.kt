package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
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
 * @param flowNames An array of strings storing the names of the flows as returned by the flowList Corda RPC.
 */
data class ListFlowsV1Response(

    @get:JsonProperty("flowNames", required = true) val flowNames: kotlin.collections.List<kotlin.String> = arrayListOf()
) {

}
