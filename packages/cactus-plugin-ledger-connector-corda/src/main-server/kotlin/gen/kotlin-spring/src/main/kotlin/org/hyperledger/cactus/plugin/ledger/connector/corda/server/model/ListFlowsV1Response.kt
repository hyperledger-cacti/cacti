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
import io.swagger.v3.oas.annotations.media.Schema

/**
 * 
 * @param flowNames An array of strings storing the names of the flows as returned by the flowList Corda RPC.
 */
data class ListFlowsV1Response(

    @Schema(example = "[\"net.corda.core.flows.ContractUpgradeFlow$Authorise\",\"net.corda.core.flows.ContractUpgradeFlow$Deauthorise\",\"net.corda.core.flows.ContractUpgradeFlow$Initiate\",\"net.corda.finance.flows.CashExitFlow\",\"net.corda.finance.flows.CashIssueAndPaymentFlow\",\"net.corda.finance.flows.CashIssueFlow\",\"net.corda.finance.flows.CashPaymentFlow\",\"net.corda.finance.internal.CashConfigDataFlow\",\"net.corda.samples.obligation.flows.IOUIssueFlow\",\"net.corda.samples.obligation.flows.IOUSettleFlow\",\"net.corda.samples.obligation.flows.IOUTransferFlow\",\"net.corda.samples.obligation.flows.SelfIssueCashFlow\"]", required = true, description = "An array of strings storing the names of the flows as returned by the flowList Corda RPC.")
    @get:JsonProperty("flowNames", required = true) val flowNames: kotlin.collections.List<kotlin.String> = arrayListOf()
) {

}

