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
 * @param clientAppId ID of a client application that wants to monitor the state changes
 * @param stateFullClassName The fully qualified name of the Corda state to monitor
 */
data class StartMonitorV1Request(

    @get:Size(min=1,max=1024)
    @get:JsonProperty("clientAppId", required = true) val clientAppId: kotlin.String,

    @get:Size(min=1,max=1024)
    @get:JsonProperty("stateFullClassName", required = true) val stateFullClassName: kotlin.String
) {

}
