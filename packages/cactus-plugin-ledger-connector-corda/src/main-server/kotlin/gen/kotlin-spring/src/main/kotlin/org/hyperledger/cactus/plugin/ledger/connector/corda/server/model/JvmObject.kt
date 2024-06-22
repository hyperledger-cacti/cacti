package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonValue
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.JvmType
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.JvmTypeKind
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
 * Can represent JVM primitive and reference types as well. The jvmTypeKind field indicates which one is being stored. If the jvmTypeKind field is set to REFERENCE then the jvmCtorArgs array is expected to be filled, otherwise (e.g. PRIMITIVE jvmTypeKind) it is expected that the primitiveValue property is filled with a primitive data type supported by the JSON standard such as strings, booleans, numbers, etc.
 * @param jvmTypeKind 
 * @param jvmType 
 * @param primitiveValue 
 * @param jvmCtorArgs 
 */
data class JvmObject(

    @field:Valid
    @get:JsonProperty("jvmTypeKind", required = true) val jvmTypeKind: JvmTypeKind,

    @field:Valid
    @get:JsonProperty("jvmType", required = true) val jvmType: JvmType,

    @field:Valid
    @get:JsonProperty("primitiveValue") val primitiveValue: kotlin.Any? = null,

    @field:Valid
    @get:JsonProperty("jvmCtorArgs") val jvmCtorArgs: kotlin.collections.List<JvmObject>? = arrayListOf()
) {

}
