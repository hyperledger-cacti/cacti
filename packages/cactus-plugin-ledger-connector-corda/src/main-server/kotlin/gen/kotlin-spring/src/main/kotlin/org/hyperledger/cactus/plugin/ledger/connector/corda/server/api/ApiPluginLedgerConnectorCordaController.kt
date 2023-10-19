package org.hyperledger.cactus.plugin.ledger.connector.corda.server.api

import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CPIV5Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.ClearMonitorTransactionsV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.ClearMonitorTransactionsV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DeployContractJarsBadRequestV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DeployContractJarsSuccessV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DeployContractJarsV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DiagnoseNodeV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DiagnoseNodeV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.FlowStatusV5Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.FlowStatusV5Responses
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.GetMonitorTransactionsV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.GetMonitorTransactionsV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.InvokeContractV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.InvokeContractV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.ListFlowsV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.ListFlowsV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.NodeInfo
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.StartFlowV5Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.StartMonitorV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.StartMonitorV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.StopMonitorV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.StopMonitorV1Response
import io.swagger.v3.oas.annotations.*
import io.swagger.v3.oas.annotations.enums.*
import io.swagger.v3.oas.annotations.media.*
import io.swagger.v3.oas.annotations.responses.*
import io.swagger.v3.oas.annotations.security.*
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity

import org.springframework.web.bind.annotation.*
import org.springframework.validation.annotation.Validated
import org.springframework.web.context.request.NativeWebRequest
import org.springframework.beans.factory.annotation.Autowired

import javax.validation.Valid
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Email
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size

import kotlin.collections.List
import kotlin.collections.Map

@RestController
@Validated
@RequestMapping("\${api.base-path:}")
class ApiPluginLedgerConnectorCordaController(@Autowired(required = true) val service: ApiPluginLedgerConnectorCordaService) {

    @Operation(
        summary = "Clear transactions from internal store so they'll not be available by GetMonitorTransactionsV1 anymore.",
        operationId = "clearMonitorTransactionsV1",
        description = """""",
        responses = [
            ApiResponse(responseCode = "200", description = "OK", content = [Content(schema = Schema(implementation = ClearMonitorTransactionsV1Response::class))]) ]
    )
    @RequestMapping(
        method = [RequestMethod.DELETE],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/clear-monitor-transactions"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    fun clearMonitorTransactionsV1(@Parameter(description = "") @Valid @RequestBody(required = false) clearMonitorTransactionsV1Request: ClearMonitorTransactionsV1Request?): ResponseEntity<ClearMonitorTransactionsV1Response> {
        return ResponseEntity(service.clearMonitorTransactionsV1(clearMonitorTransactionsV1Request), HttpStatus.valueOf(200))
    }

    @Operation(
        summary = "Deploys a set of jar files (Cordapps, e.g. the contracts in Corda speak).",
        operationId = "deployContractJarsV1",
        description = """""",
        responses = [
            ApiResponse(responseCode = "200", description = "OK", content = [Content(schema = Schema(implementation = DeployContractJarsSuccessV1Response::class))]),
            ApiResponse(responseCode = "400", description = "Bad Request", content = [Content(schema = Schema(implementation = DeployContractJarsBadRequestV1Response::class))]) ]
    )
    @RequestMapping(
        method = [RequestMethod.POST],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/deploy-contract-jars"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    fun deployContractJarsV1(@Parameter(description = "") @Valid @RequestBody(required = false) deployContractJarsV1Request: DeployContractJarsV1Request?): ResponseEntity<DeployContractJarsSuccessV1Response> {
        return ResponseEntity(service.deployContractJarsV1(deployContractJarsV1Request), HttpStatus.valueOf(200))
    }

    @Operation(
        summary = "",
        operationId = "diagnoseNodeV1",
        description = """Responds with diagnostic information about the Corda node""",
        responses = [
            ApiResponse(responseCode = "200", description = "OK", content = [Content(schema = Schema(implementation = DiagnoseNodeV1Response::class))]) ]
    )
    @RequestMapping(
        method = [RequestMethod.POST],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/diagnose-node"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    fun diagnoseNodeV1(@Parameter(description = "") @Valid @RequestBody(required = false) diagnoseNodeV1Request: DiagnoseNodeV1Request?): ResponseEntity<DiagnoseNodeV1Response> {
        return ResponseEntity(service.diagnoseNodeV1(diagnoseNodeV1Request), HttpStatus.valueOf(200))
    }

    @Operation(
        summary = "This method gets the current status of the specified flow instance.",
        operationId = "flowStatusResponse",
        description = """""",
        responses = [
            ApiResponse(responseCode = "200", description = "OK", content = [Content(schema = Schema(implementation = FlowStatusV5Response::class))]),
            ApiResponse(responseCode = "401", description = "Unauthorized"),
            ApiResponse(responseCode = "403", description = "Forbidden") ]
    )
    @RequestMapping(
        method = [RequestMethod.GET],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/flow/{holdingIDShortHash}/{clientRequestID}"],
        produces = ["text/plain"]
    )
    fun flowStatusResponse(@Parameter(description = "Holding identity short hash", required = true) @PathVariable("holdingIDShortHash") holdingIDShortHash: kotlin.String,@Parameter(description = "Client request ID", required = true) @PathVariable("clientRequestID") clientRequestID: kotlin.String): ResponseEntity<FlowStatusV5Response> {
        return ResponseEntity(service.flowStatusResponse(holdingIDShortHash, clientRequestID), HttpStatus.valueOf(200))
    }

    @Operation(
        summary = "This method returns an array containing the statuses of all flows running for a specified holding identity. An empty array is returned if there are no flows running.",
        operationId = "flowStatusResponses",
        description = """""",
        responses = [
            ApiResponse(responseCode = "200", description = "OK", content = [Content(schema = Schema(implementation = FlowStatusV5Responses::class))]),
            ApiResponse(responseCode = "401", description = "Unauthorized"),
            ApiResponse(responseCode = "403", description = "Forbidden") ]
    )
    @RequestMapping(
        method = [RequestMethod.GET],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/flow/{holdingIDShortHash}"],
        produces = ["text/plain"]
    )
    fun flowStatusResponses(@Parameter(description = "Holding identity short hash", required = true) @PathVariable("holdingIDShortHash") holdingIDShortHash: kotlin.String): ResponseEntity<FlowStatusV5Responses> {
        return ResponseEntity(service.flowStatusResponses(holdingIDShortHash), HttpStatus.valueOf(200))
    }

    @Operation(
        summary = "List all CPIs uploaded to the cluster",
        operationId = "getCPIResponse",
        description = """""",
        responses = [
            ApiResponse(responseCode = "200", description = "OK", content = [Content(schema = Schema(implementation = CPIV5Response::class))]) ]
    )
    @RequestMapping(
        method = [RequestMethod.GET],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/cpi"],
        produces = ["application/json"]
    )
    fun getCPIResponse(): ResponseEntity<CPIV5Response> {
        return ResponseEntity(service.getCPIResponse(), HttpStatus.valueOf(200))
    }

    @Operation(
        summary = "Get transactions for monitored state classes.",
        operationId = "getMonitorTransactionsV1",
        description = """""",
        responses = [
            ApiResponse(responseCode = "200", description = "OK", content = [Content(schema = Schema(implementation = GetMonitorTransactionsV1Response::class))]) ]
    )
    @RequestMapping(
        method = [RequestMethod.GET],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/get-monitor-transactions"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    fun getMonitorTransactionsV1(@Parameter(description = "") @Valid @RequestBody(required = false) getMonitorTransactionsV1Request: GetMonitorTransactionsV1Request?): ResponseEntity<GetMonitorTransactionsV1Response> {
        return ResponseEntity(service.getMonitorTransactionsV1(getMonitorTransactionsV1Request), HttpStatus.valueOf(200))
    }

    @Operation(
        summary = "Get the Prometheus Metrics",
        operationId = "getPrometheusMetricsV1",
        description = """""",
        responses = [
            ApiResponse(responseCode = "200", description = "OK", content = [Content(schema = Schema(implementation = kotlin.String::class))]) ]
    )
    @RequestMapping(
        method = [RequestMethod.GET],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/get-prometheus-exporter-metrics"],
        produces = ["text/plain"]
    )
    fun getPrometheusMetricsV1(): ResponseEntity<kotlin.String> {
        return ResponseEntity(service.getPrometheusMetricsV1(), HttpStatus.valueOf(200))
    }

    @Operation(
        summary = "Invokes a contract on a Corda ledger (e.g. a flow)",
        operationId = "invokeContractV1",
        description = """""",
        responses = [
            ApiResponse(responseCode = "200", description = "OK", content = [Content(schema = Schema(implementation = InvokeContractV1Response::class))]) ]
    )
    @RequestMapping(
        method = [RequestMethod.POST],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/invoke-contract"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    fun invokeContractV1(@Parameter(description = "") @Valid @RequestBody(required = false) invokeContractV1Request: InvokeContractV1Request?): ResponseEntity<InvokeContractV1Response> {
        return ResponseEntity(service.invokeContractV1(invokeContractV1Request), HttpStatus.valueOf(200))
    }

    @Operation(
        summary = "",
        operationId = "listFlowsV1",
        description = """Responds with a list of the flows on the Corda node.""",
        responses = [
            ApiResponse(responseCode = "200", description = "OK", content = [Content(schema = Schema(implementation = ListFlowsV1Response::class))]) ]
    )
    @RequestMapping(
        method = [RequestMethod.POST],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/list-flows"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    fun listFlowsV1(@Parameter(description = "") @Valid @RequestBody(required = false) listFlowsV1Request: ListFlowsV1Request?): ResponseEntity<ListFlowsV1Response> {
        return ResponseEntity(service.listFlowsV1(listFlowsV1Request), HttpStatus.valueOf(200))
    }

    @Operation(
        summary = "",
        operationId = "networkMapV1",
        description = """Responds with a snapshot of the network map as provided by the Corda RPC call: net.corda.core.messaging.CordaRPCOps public abstract fun networkMapSnapshot(): List<NodeInfo>""",
        responses = [
            ApiResponse(responseCode = "200", description = "OK", content = [Content(schema = Schema(implementation = NodeInfo::class))]) ]
    )
    @RequestMapping(
        method = [RequestMethod.POST],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/network-map"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    fun networkMapV1(@Parameter(description = "") @Valid @RequestBody(required = false) body: kotlin.Any?): ResponseEntity<List<NodeInfo>> {
        return ResponseEntity(service.networkMapV1(body), HttpStatus.valueOf(200))
    }

    @Operation(
        summary = "This method starts a new instance for the specified flow for the specified holding identity.",
        operationId = "startFlowParameters",
        description = """""",
        responses = [
            ApiResponse(responseCode = "200", description = "OK", content = [Content(schema = Schema(implementation = FlowStatusV5Response::class))]) ]
    )
    @RequestMapping(
        method = [RequestMethod.POST],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/flow/{holdingIDShortHash}"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    fun startFlowParameters(@Parameter(description = "Holding identity short hash", required = true) @PathVariable("holdingIDShortHash") holdingIDShortHash: kotlin.String,@Parameter(description = "Request body for starting a flow", required = true) @Valid @RequestBody startFlowV5Request: StartFlowV5Request): ResponseEntity<FlowStatusV5Response> {
        return ResponseEntity(service.startFlowParameters(holdingIDShortHash, startFlowV5Request), HttpStatus.valueOf(200))
    }

    @Operation(
        summary = "Start monitoring corda changes (transactions) of given state class",
        operationId = "startMonitorV1",
        description = """""",
        responses = [
            ApiResponse(responseCode = "200", description = "OK", content = [Content(schema = Schema(implementation = StartMonitorV1Response::class))]) ]
    )
    @RequestMapping(
        method = [RequestMethod.POST],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/start-monitor"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    fun startMonitorV1(@Parameter(description = "") @Valid @RequestBody(required = false) startMonitorV1Request: StartMonitorV1Request?): ResponseEntity<StartMonitorV1Response> {
        return ResponseEntity(service.startMonitorV1(startMonitorV1Request), HttpStatus.valueOf(200))
    }

    @Operation(
        summary = "Stop monitoring corda changes (transactions) of given state class",
        operationId = "stopMonitorV1",
        description = """""",
        responses = [
            ApiResponse(responseCode = "200", description = "OK", content = [Content(schema = Schema(implementation = StopMonitorV1Response::class))]) ]
    )
    @RequestMapping(
        method = [RequestMethod.DELETE],
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/stop-monitor"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    fun stopMonitorV1(@Parameter(description = "") @Valid @RequestBody(required = false) stopMonitorV1Request: StopMonitorV1Request?): ResponseEntity<StopMonitorV1Response> {
        return ResponseEntity(service.stopMonitorV1(stopMonitorV1Request), HttpStatus.valueOf(200))
    }
}
