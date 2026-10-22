package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonValue
import com.fasterxml.jackson.annotation.JsonCreator
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
 * Values: PRIMITIVE,REFERENCE
 */
enum class JvmTypeKind(@get:JsonValue val value: kotlin.String) {

    PRIMITIVE("PRIMITIVE"),
    REFERENCE("REFERENCE");

    companion object {
        @JvmStatic
        @JsonCreator
        fun forValue(value: kotlin.String): JvmTypeKind {
            return values().firstOrNull{ it.value == value }
                ?: throw IllegalArgumentException("Unexpected value '$value' for enum 'JvmTypeKind'")
        }
    }
}
