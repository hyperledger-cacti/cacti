package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.JvmObject
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
 * @param constructorName This parameter is used to specify that the function used to construct this JvmType is not a constructor function but instead is a factory function. Setting this parameter will cause the plugin to look up methods of the class denoted by fqClassName instead of its constructors.
 * @param invocationTarget 
 */
data class JvmType(

    @get:Size(min=1,max=65535)
    @field:JsonProperty("fqClassName", required = true) val fqClassName: kotlin.String,

    @get:Size(min=1,max=65535)
    @field:JsonProperty("constructorName") val constructorName: kotlin.String? = null,

    @field:Valid
    @field:JsonProperty("invocationTarget") val invocationTarget: JvmObject? = null
) {

}

