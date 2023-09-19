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
 * @param clientAppId ID of a client application that wants to monitor the state changes
 * @param stateFullClassName The fully qualified name of the Corda state to monitor
 */
data class StartMonitorV1Request(

    @get:Size(min=1,max=1024)
    @Schema(example = "frond_v1_x_7Hdg6s", required = true, description = "ID of a client application that wants to monitor the state changes")
    @get:JsonProperty("clientAppId", required = true) val clientAppId: kotlin.String,

    @get:Size(min=1,max=1024)
    @Schema(example = "net.corda.samples.example.states.IOUState", required = true, description = "The fully qualified name of the Corda state to monitor")
    @get:JsonProperty("stateFullClassName", required = true) val stateFullClassName: kotlin.String
) {

}

