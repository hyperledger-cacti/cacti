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
 * Represents a reference to a JVM type (such as a Java class)
 * @param fqClassName 
 */
data class JvmType(

    @get:NotNull  
    @get:Size(min=1,max=65535)
    @field:JsonProperty("fqClassName") val fqClassName: kotlin.String
) {

}

