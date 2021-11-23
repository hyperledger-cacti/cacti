package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size
import javax.validation.Valid

/**
* Determines which flow starting method will be used on the back-end when invoking the flow. Based on the value here the plugin back-end might invoke the rpc.startFlowDynamic() method or the rpc.startTrackedFlowDynamic() method. Streamed responses are aggregated and returned in a single response to HTTP callers who are not equipped to handle streams like WebSocket/gRPC/etc. do.
* Values: TRACKED_FLOW_DYNAMIC,FLOW_DYNAMIC
*/
enum class FlowInvocationType(val value: kotlin.String) {

    @JsonProperty("TRACKED_FLOW_DYNAMIC") TRACKED_FLOW_DYNAMIC("TRACKED_FLOW_DYNAMIC"),

    @JsonProperty("FLOW_DYNAMIC") FLOW_DYNAMIC("FLOW_DYNAMIC");

}

