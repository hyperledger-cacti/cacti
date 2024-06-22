package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonValue
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
enum class JvmTypeKind(val value: kotlin.String) {

    @JsonProperty("PRIMITIVE") PRIMITIVE("PRIMITIVE"),
    @JsonProperty("REFERENCE") REFERENCE("REFERENCE")
}

