package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CPIIDV1
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.ListCpiV1ResponseCpisInnerCpksInner
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Email
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size
import javax.validation.Valid

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
