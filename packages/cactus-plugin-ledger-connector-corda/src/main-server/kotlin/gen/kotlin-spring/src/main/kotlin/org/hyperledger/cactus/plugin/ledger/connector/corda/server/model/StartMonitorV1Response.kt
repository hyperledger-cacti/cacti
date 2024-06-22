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
 * @param success Flag set to true if monitoring started correctly.
 * @param msg Message describing operation status or any errors that occurred.
 */
data class StartMonitorV1Response(

    @get:JsonProperty("success", required = true) val success: kotlin.Boolean,

    @get:JsonProperty("msg", required = true) val msg: kotlin.String
) {

}
