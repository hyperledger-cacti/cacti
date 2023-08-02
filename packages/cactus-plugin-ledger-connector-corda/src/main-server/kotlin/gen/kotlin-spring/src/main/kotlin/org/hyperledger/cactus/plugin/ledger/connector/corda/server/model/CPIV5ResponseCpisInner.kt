package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CPIIDV5
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CPIV5ResponseCpisInnerCpksInner
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Email
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size
import javax.validation.Valid
import io.swagger.v3.oas.annotations.media.Schema

/**
 * 
 * @param cpiFileChecksum 
 * @param cpiFileFullChecksum 
 * @param cpks 
 * @param groupPolicy 
 * @param id 
 * @param timestamp 
 */
data class CPIV5ResponseCpisInner(

    @Schema(example = "string", description = "")
    @get:JsonProperty("cpiFileChecksum") val cpiFileChecksum: kotlin.String? = null,

    @Schema(example = "string", description = "")
    @get:JsonProperty("cpiFileFullChecksum") val cpiFileFullChecksum: kotlin.String? = null,

    @field:Valid
    @Schema(example = "null", description = "")
    @get:JsonProperty("cpks") val cpks: kotlin.collections.List<CPIV5ResponseCpisInnerCpksInner>? = null,

    @Schema(example = "string", description = "")
    @get:JsonProperty("groupPolicy") val groupPolicy: kotlin.String? = null,

    @field:Valid
    @Schema(example = "null", description = "")
    @get:JsonProperty("id") val id: CPIIDV5? = null,

    @Schema(example = "2022-06-24T10:15:30Z", description = "")
    @get:JsonProperty("timestamp") val timestamp: java.time.OffsetDateTime? = null
) {

}

