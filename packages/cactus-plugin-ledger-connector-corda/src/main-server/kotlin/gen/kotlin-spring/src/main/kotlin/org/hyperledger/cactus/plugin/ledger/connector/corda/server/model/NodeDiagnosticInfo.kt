package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CordappInfo
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
    @get:JsonProperty("cordapps", required = true) val cordapps: kotlin.collections.List<CordappInfo>,

    @get:JsonProperty("platformVersion", required = true) val platformVersion: kotlin.Int,

    @get:JsonProperty("revision", required = true) val revision: kotlin.String,

    @get:JsonProperty("vendor", required = true) val vendor: kotlin.String,

    @get:JsonProperty("version", required = true) val version: kotlin.String
) {

}
