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

    @get:JsonProperty("cpiFileChecksum") val cpiFileChecksum: kotlin.String? = null,

    @get:JsonProperty("cpiFileFullChecksum") val cpiFileFullChecksum: kotlin.String? = null,

    @field:Valid
    @get:JsonProperty("cpks") val cpks: kotlin.collections.List<ListCpiV1ResponseCpisInnerCpksInner>? = null,

    @get:JsonProperty("groupPolicy") val groupPolicy: kotlin.String? = null,

    @field:Valid
    @get:JsonProperty("id") val id: CPIIDV1? = null,

    @get:JsonProperty("timestamp") val timestamp: java.time.OffsetDateTime? = null
) {

}
