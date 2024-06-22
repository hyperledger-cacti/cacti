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
 * @param nodeIds Optional property specifying which Corda Node should be the one being diagnosed in case the Connector has multiple connections established for different nodes (which is not yet a supported feature, but we want to keep this possibility open for the future).
 */
data class DiagnoseNodeV1Request(

    @get:Size(min=0,max=1024) 
    @get:JsonProperty("nodeIds") val nodeIds: kotlin.collections.List<kotlin.String>? = arrayListOf()
) {

}
