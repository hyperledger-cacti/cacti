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
 * @param chatName 
 * @param otherMember 
 * @param message 
 * @param numberOfRecords 
 */
data class StartFlowV1RequestRequestBody(

    @get:JsonProperty("chatName") val chatName: kotlin.String? = null,

    @get:JsonProperty("otherMember") val otherMember: kotlin.String? = null,

    @get:JsonProperty("message") val message: kotlin.String? = null,

    @get:JsonProperty("numberOfRecords") val numberOfRecords: kotlin.String? = null
) {

}
