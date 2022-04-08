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
 * @param success Flag set to true if operation completed correctly.
 * @param msg Message describing operation status or any errors that occurred.
 */
data class StopMonitorV1Response(

    @field:JsonProperty("success", required = true) val success: kotlin.Boolean,

    @field:JsonProperty("msg", required = true) val msg: kotlin.String
) {

}

