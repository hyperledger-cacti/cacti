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
 * @param filename 
 * @param hasDbMigrations Indicates whether the cordapp jar in question contains any embedded migrations that Cactus can/should execute between copying the jar into the cordapp directory and starting the node back up.
 * @param contentBase64 
 */
data class JarFile(

    @get:Size(min=1,max=255)
    @get:JsonProperty("filename", required = true) val filename: kotlin.String,

    @get:JsonProperty("hasDbMigrations", required = true) val hasDbMigrations: kotlin.Boolean,

    @get:Size(min=1,max=1073741824)
    @get:JsonProperty("contentBase64", required = true) val contentBase64: kotlin.String
) : kotlin.collections.HashMap<String, kotlin.Any>() {

}
