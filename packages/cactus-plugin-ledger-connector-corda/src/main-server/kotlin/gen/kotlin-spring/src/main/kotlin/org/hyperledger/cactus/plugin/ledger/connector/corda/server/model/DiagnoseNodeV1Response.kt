package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.NodeDiagnosticInfo
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size

/**
 * 
 * @param nodeDiagnosticInfo 
 */
data class DiagnoseNodeV1Response(

    @get:NotNull 
    @field:JsonProperty("nodeDiagnosticInfo") val nodeDiagnosticInfo: NodeDiagnosticInfo
) {

}

