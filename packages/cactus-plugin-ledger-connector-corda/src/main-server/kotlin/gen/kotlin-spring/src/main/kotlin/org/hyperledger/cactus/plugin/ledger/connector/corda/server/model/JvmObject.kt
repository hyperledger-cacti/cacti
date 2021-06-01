package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.JvmType
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.JvmTypeKind
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size
import javax.validation.Valid

/**
 * Can represent JVM primitive and reference types as well. The jvmTypeKind field indicates which one is being stored. If the jvmTypeKind field is set to REFERENCE then the jvmCtorArgs array is expected to be filled, otherwise (e.g. PRIMITIVE jvmTypeKind) it is expected that the primitiveValue property is filled with a primitive data type supported by the JSON standard such as strings, booleans, numbers, etc.
 * @param jvmTypeKind 
 * @param jvmType 
 * @param primitiveValue 
 * @param jvmCtorArgs 
 */
data class JvmObject(

    @field:Valid
    @field:JsonProperty("jvmTypeKind", required = true) val jvmTypeKind: JvmTypeKind,

    @field:Valid
    @field:JsonProperty("jvmType", required = true) val jvmType: JvmType,

    @field:Valid
    @field:JsonProperty("primitiveValue") val primitiveValue: kotlin.Any? = null,

    @field:Valid
    @field:JsonProperty("jvmCtorArgs") val jvmCtorArgs: kotlin.collections.List<JvmObject>? = null
) {

}

