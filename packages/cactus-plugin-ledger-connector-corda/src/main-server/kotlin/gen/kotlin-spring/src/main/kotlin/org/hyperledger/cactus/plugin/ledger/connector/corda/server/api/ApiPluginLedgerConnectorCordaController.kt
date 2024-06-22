package org.hyperledger.cactus.plugin.ledger.connector.corda.server.api

import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.ClearMonitorTransactionsV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.ClearMonitorTransactionsV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DeployContractJarsBadRequestV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DeployContractJarsSuccessV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DeployContractJarsV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DiagnoseNodeV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DiagnoseNodeV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.FlowStatusV1Responses
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.GetFlowCidV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.GetFlowCidV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.GetMonitorTransactionsV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.GetMonitorTransactionsV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.InvokeContractV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.InvokeContractV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.ListCpiV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.ListCpiV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.ListFlowsV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.ListFlowsV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.NodeInfo
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.StartFlowV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.StartFlowV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.StartMonitorV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.StartMonitorV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.StopMonitorV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.StopMonitorV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.VaultQueryV1Request
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity

import org.springframework.web.bind.annotation.*
import org.springframework.validation.annotation.Validated
import org.springframework.web.context.request.NativeWebRequest
import org.springframework.beans.factory.annotation.Autowired

import jakarta.validation.Valid
import jakarta.validation.constraints.DecimalMax
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

import kotlin.collections.List
import kotlin.collections.Map

@RestController
@Validated
@RequestMapping("\${api.base-path:}")
open class ApiPluginLedgerConnectorCordaController(@Autowired(required = true) val service: ApiPluginLedgerConnectorCordaService) {


    @RequestMapping(
        method = [RequestMethod.DELETE],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/clear-monitor-transactions"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    open fun clearMonitorTransactionsV1( @Valid @RequestBody clearMonitorTransactionsV1Request: ClearMonitorTransactionsV1Request): ResponseEntity<ClearMonitorTransactionsV1Response> {
        return ResponseEntity(service.clearMonitorTransactionsV1(clearMonitorTransactionsV1Request), HttpStatus.valueOf(200))
    }


    @RequestMapping(
        method = [RequestMethod.POST],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/deploy-contract-jars"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    open fun deployContractJarsV1( @Valid @RequestBody deployContractJarsV1Request: DeployContractJarsV1Request): ResponseEntity<DeployContractJarsSuccessV1Response> {
        return ResponseEntity(service.deployContractJarsV1(deployContractJarsV1Request), HttpStatus.valueOf(200))
    }


    @RequestMapping(
        method = [RequestMethod.POST],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/diagnose-node"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    open fun diagnoseNodeV1( @Valid @RequestBody(required = false) diagnoseNodeV1Request: DiagnoseNodeV1Request?): ResponseEntity<DiagnoseNodeV1Response> {
        return ResponseEntity(service.diagnoseNodeV1(diagnoseNodeV1Request), HttpStatus.valueOf(200))
    }


    @RequestMapping(
        method = [RequestMethod.GET],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/get-flow-cid"],
        produces = ["text/plain"],
        consumes = ["application/json"]
    )
    open fun getFlowV1( @Valid @RequestBody getFlowCidV1Request: GetFlowCidV1Request): ResponseEntity<GetFlowCidV1Response> {
        return ResponseEntity(service.getFlowV1(getFlowCidV1Request), HttpStatus.valueOf(200))
    }


    @RequestMapping(
        method = [RequestMethod.GET],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/get-monitor-transactions"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    open fun getMonitorTransactionsV1( @Valid @RequestBody getMonitorTransactionsV1Request: GetMonitorTransactionsV1Request): ResponseEntity<GetMonitorTransactionsV1Response> {
        return ResponseEntity(service.getMonitorTransactionsV1(getMonitorTransactionsV1Request), HttpStatus.valueOf(200))
    }


    @RequestMapping(
        method = [RequestMethod.GET],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/get-prometheus-exporter-metrics"],
        produces = ["text/plain"]
    )
    open fun getPrometheusMetricsV1(): ResponseEntity<kotlin.String> {
        return ResponseEntity(service.getPrometheusMetricsV1(), HttpStatus.valueOf(200))
    }


    @RequestMapping(
        method = [RequestMethod.POST],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/invoke-contract"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    open fun invokeContractV1( @Valid @RequestBody invokeContractV1Request: InvokeContractV1Request): ResponseEntity<InvokeContractV1Response> {
        return ResponseEntity(service.invokeContractV1(invokeContractV1Request), HttpStatus.valueOf(200))
    }


    @RequestMapping(
        method = [RequestMethod.GET],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/list-cpi"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    open fun listCpiV1( @Valid @RequestBody listCpiV1Request: ListCpiV1Request): ResponseEntity<ListCpiV1Response> {
        return ResponseEntity(service.listCpiV1(listCpiV1Request), HttpStatus.valueOf(200))
    }


    @RequestMapping(
        method = [RequestMethod.GET],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/list-flow"],
        produces = ["text/plain"],
        consumes = ["application/json"]
    )
    open fun listFlowV1( @Valid @RequestBody getFlowCidV1Request: GetFlowCidV1Request): ResponseEntity<FlowStatusV1Responses> {
        return ResponseEntity(service.listFlowV1(getFlowCidV1Request), HttpStatus.valueOf(200))
    }


    @RequestMapping(
        method = [RequestMethod.POST],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/list-flows"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    open fun listFlowsV1( @Valid @RequestBody(required = false) listFlowsV1Request: ListFlowsV1Request?): ResponseEntity<ListFlowsV1Response> {
        return ResponseEntity(service.listFlowsV1(listFlowsV1Request), HttpStatus.valueOf(200))
    }


    @RequestMapping(
        method = [RequestMethod.POST],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/network-map"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    open fun networkMapV1( @Valid @RequestBody(required = false) body: kotlin.Any?): ResponseEntity<List<NodeInfo>> {
        return ResponseEntity(service.networkMapV1(body), HttpStatus.valueOf(200))
    }


    @RequestMapping(
        method = [RequestMethod.POST],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/start-flow"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    open fun startFlowV1( @Valid @RequestBody startFlowV1Request: StartFlowV1Request): ResponseEntity<StartFlowV1Response> {
        return ResponseEntity(service.startFlowV1(startFlowV1Request), HttpStatus.valueOf(200))
    }


    @RequestMapping(
        method = [RequestMethod.POST],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/start-monitor"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    open fun startMonitorV1( @Valid @RequestBody startMonitorV1Request: StartMonitorV1Request): ResponseEntity<StartMonitorV1Response> {
        return ResponseEntity(service.startMonitorV1(startMonitorV1Request), HttpStatus.valueOf(200))
    }


    @RequestMapping(
        method = [RequestMethod.DELETE],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/stop-monitor"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    open fun stopMonitorV1( @Valid @RequestBody stopMonitorV1Request: StopMonitorV1Request): ResponseEntity<StopMonitorV1Response> {
        return ResponseEntity(service.stopMonitorV1(stopMonitorV1Request), HttpStatus.valueOf(200))
    }


    @RequestMapping(
        method = [RequestMethod.POST],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/vault-query"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    open fun vaultQueryV1( @Valid @RequestBody vaultQueryV1Request: VaultQueryV1Request): ResponseEntity<kotlin.Any> {
        return ResponseEntity(service.vaultQueryV1(vaultQueryV1Request), HttpStatus.valueOf(200))
    }
}
