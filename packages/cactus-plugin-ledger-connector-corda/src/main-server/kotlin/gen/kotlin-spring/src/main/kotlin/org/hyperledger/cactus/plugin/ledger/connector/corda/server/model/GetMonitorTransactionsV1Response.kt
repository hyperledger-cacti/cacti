package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.GetMonitorTransactionsV1ResponseTxInner
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
 * @param success Flag set to true if operation completed correctly.
 * @param msg Message describing operation status or any errors that occurred.
 * @param stateFullClassName The fully qualified name of the Corda state to monitor
 * @param tx 
 */
data class GetMonitorTransactionsV1Response(

    @get:JsonProperty("success", required = true) val success: kotlin.Boolean,

    @get:JsonProperty("msg", required = true) val msg: kotlin.String,

    @get:Size(min=1,max=1024)
    @get:JsonProperty("stateFullClassName") val stateFullClassName: kotlin.String? = null,

    @field:Valid
    @get:JsonProperty("tx") val tx: kotlin.collections.List<GetMonitorTransactionsV1ResponseTxInner>? = arrayListOf()
) {

}
