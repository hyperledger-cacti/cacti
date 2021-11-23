package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CordappInfo
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size
import javax.validation.Valid

/**
 * A NodeDiagnosticInfo holds information about the current node version.
 * @param cordapps A list of CorDapps currently installed on this node
 * @param platformVersion The platform version of this node. This number represents a released API version, and should be used to make functionality decisions (e.g. enabling an app feature only if an underlying platform feature exists)
 * @param revision The git commit hash this node was built from
 * @param vendor The vendor of this node
 * @param version The current node version string, e.g. 4.3, 4.4-SNAPSHOT. Note that this string is effectively freeform, and so should only be used for providing diagnostic information. It should not be used to make functionality decisions (the platformVersion is a better fit for this).
 */
data class NodeDiagnosticInfo(

    @field:Valid
    @get:Size(min=0,max=4096) 
    @field:JsonProperty("cordapps", required = true) val cordapps: kotlin.collections.List<CordappInfo>,

    @field:JsonProperty("platformVersion", required = true) val platformVersion: kotlin.Int,

    @field:JsonProperty("revision", required = true) val revision: kotlin.String,

    @field:JsonProperty("vendor", required = true) val vendor: kotlin.String,

    @field:JsonProperty("version", required = true) val version: kotlin.String
) {

}

