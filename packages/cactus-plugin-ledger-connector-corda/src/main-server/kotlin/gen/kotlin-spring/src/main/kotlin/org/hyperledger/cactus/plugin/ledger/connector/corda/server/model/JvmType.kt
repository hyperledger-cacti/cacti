package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
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
 * Represents a reference to a JVM type (such as a Java class)
 * @param fqClassName 
 * @param constructorName This parameter is used to specify that the function used to construct this JvmType is not a constructor function but instead is a factory function. Setting this parameter will cause the plugin to look up methods of the class denoted by fqClassName instead of its constructors.
 * @param invocationTarget 
 */
data class JvmType(

    @get:Size(min=1,max=65535)
    @get:JsonProperty("fqClassName", required = true) val fqClassName: kotlin.String,

    @get:Size(min=1,max=65535)
    @get:JsonProperty("constructorName") val constructorName: kotlin.String? = null,

    @field:Valid
    @get:JsonProperty("invocationTarget") val invocationTarget: JvmObject? = null
) {

}
