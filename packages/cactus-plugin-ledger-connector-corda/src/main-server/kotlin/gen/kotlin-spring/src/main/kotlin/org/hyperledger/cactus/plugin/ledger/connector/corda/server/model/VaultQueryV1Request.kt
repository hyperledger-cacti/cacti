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

/**
 * 
 * @param contractStateType Valid, fully qualified JVM class name which will be fed into Class.forName(...)
 */
data class VaultQueryV1Request(

    @get:Size(min=1)
    @get:JsonProperty("contractStateType") val contractStateType: kotlin.String? = null
) {

}
