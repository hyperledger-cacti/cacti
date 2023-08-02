package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CPIIDV5
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CPIV5ResponseCpks
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
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
data class CPIV5ResponseCpis(

    @field:JsonProperty("cpiFileChecksum") val cpiFileChecksum: kotlin.String? = null,

    @field:JsonProperty("cpiFileFullChecksum") val cpiFileFullChecksum: kotlin.String? = null,

    @field:Valid
    @field:JsonProperty("cpks") val cpks: kotlin.collections.List<CPIV5ResponseCpks>? = null,

    @field:JsonProperty("groupPolicy") val groupPolicy: kotlin.String? = null,

    @field:Valid
    @field:JsonProperty("id") val id: CPIIDV5? = null,

    @field:JsonProperty("timestamp") val timestamp: java.time.OffsetDateTime? = null
) {

}

