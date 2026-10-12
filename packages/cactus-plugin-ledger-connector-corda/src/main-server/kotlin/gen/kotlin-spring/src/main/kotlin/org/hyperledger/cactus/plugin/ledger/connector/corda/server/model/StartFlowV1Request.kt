package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.StartFlowV1RequestRequestBody
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
 * This method starts a new instance for the specified flow for the specified holding identity.
 * @param username 
 * @param password 
 * @param rejectUnauthorized 
 * @param clientRequestId 
 * @param flowClassName 
 * @param requestBody 
 * @param holdingIDShortHash 
 */
data class StartFlowV1Request(

    @param:JsonProperty("username", required = true)
    @get:JsonProperty("username", required = true) val username: kotlin.String,

    @param:JsonProperty("password", required = true)
    @get:JsonProperty("password", required = true) val password: kotlin.String,

    @param:JsonProperty("rejectUnauthorized", required = true)
    @get:JsonProperty("rejectUnauthorized", required = true) val rejectUnauthorized: kotlin.Boolean,

    @param:JsonProperty("clientRequestId", required = true)
    @get:JsonProperty("clientRequestId", required = true) val clientRequestId: kotlin.String,

    @param:JsonProperty("flowClassName", required = true)
    @get:JsonProperty("flowClassName", required = true) val flowClassName: kotlin.String,

    @field:Valid
    @param:JsonProperty("requestBody", required = true)
    @get:JsonProperty("requestBody", required = true) val requestBody: StartFlowV1RequestRequestBody,

    @param:JsonProperty("holdingIDShortHash")
    @get:JsonProperty("holdingIDShortHash") val holdingIDShortHash: kotlin.String? = null
) {

}
