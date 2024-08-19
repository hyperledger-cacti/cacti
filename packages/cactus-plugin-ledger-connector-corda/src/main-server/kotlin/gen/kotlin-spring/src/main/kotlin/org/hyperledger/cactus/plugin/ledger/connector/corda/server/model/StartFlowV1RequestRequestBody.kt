package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
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
