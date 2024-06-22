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
 * @param index 
 * @param &#x60;data&#x60; 
 */
data class GetMonitorTransactionsV1ResponseTxInner(

    @get:JsonProperty("index") val index: kotlin.String? = null,

    @get:JsonProperty("data") val `data`: kotlin.String? = null
) {

}
