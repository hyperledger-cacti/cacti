package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CPIIDV1
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.ListCpiV1ResponseCpisInnerCpksInner
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
 * @param cpiFileChecksum 
 * @param cpiFileFullChecksum 
 * @param cpks 
 * @param groupPolicy 
 * @param id 
 * @param timestamp 
 */
data class ListCpiV1ResponseCpisInner(

    @param:JsonProperty("cpiFileChecksum")
    @get:JsonProperty("cpiFileChecksum") val cpiFileChecksum: kotlin.String? = null,

    @param:JsonProperty("cpiFileFullChecksum")
    @get:JsonProperty("cpiFileFullChecksum") val cpiFileFullChecksum: kotlin.String? = null,

    @field:Valid
    @param:JsonProperty("cpks")
    @get:JsonProperty("cpks") val cpks: kotlin.collections.List<ListCpiV1ResponseCpisInnerCpksInner>? = null,

    @param:JsonProperty("groupPolicy")
    @get:JsonProperty("groupPolicy") val groupPolicy: kotlin.String? = null,

    @field:Valid
    @param:JsonProperty("id")
    @get:JsonProperty("id") val id: CPIIDV1? = null,

    @param:JsonProperty("timestamp")
    @get:JsonProperty("timestamp") val timestamp: java.time.OffsetDateTime? = null
) {

}
