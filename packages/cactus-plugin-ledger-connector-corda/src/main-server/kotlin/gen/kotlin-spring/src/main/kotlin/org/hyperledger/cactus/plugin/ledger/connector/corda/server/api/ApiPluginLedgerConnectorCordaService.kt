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

interface ApiPluginLedgerConnectorCordaService {

    /**
     * DELETE /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/clear-monitor-transactions : Clear transactions from internal store so they&#39;ll not be available by GetMonitorTransactionsV1 anymore.
     *
     * @param clearMonitorTransactionsV1Request  (optional)
     * @return OK (status code 200)
     * @see ApiPluginLedgerConnectorCorda#clearMonitorTransactionsV1
     */
    fun clearMonitorTransactionsV1(clearMonitorTransactionsV1Request: ClearMonitorTransactionsV1Request?): ClearMonitorTransactionsV1Response

    /**
     * POST /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/deploy-contract-jars : Deploys a set of jar files (Cordapps, e.g. the contracts in Corda speak).
     *
     * @param deployContractJarsV1Request  (optional)
     * @return OK (status code 200)
     *         or Bad Request (status code 400)
     * @see ApiPluginLedgerConnectorCorda#deployContractJarsV1
     */
    fun deployContractJarsV1(deployContractJarsV1Request: DeployContractJarsV1Request?): DeployContractJarsSuccessV1Response

    /**
     * POST /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/diagnose-node
     * Responds with diagnostic information about the Corda node
     *
     * @param diagnoseNodeV1Request  (optional)
     * @return OK (status code 200)
     * @see ApiPluginLedgerConnectorCorda#diagnoseNodeV1
     */
    fun diagnoseNodeV1(diagnoseNodeV1Request: DiagnoseNodeV1Request?): DiagnoseNodeV1Response

    /**
     * GET /api/v1/flow/{holdingIDShortHash}/{clientRequestID} : This method gets the current status of the specified flow instance.
     *
     * @param holdingIDShortHash Holding identity short hash (required)
     * @param clientRequestID Client request ID (required)
     * @return OK (status code 200)
     *         or Unauthorized (status code 401)
     *         or Forbidden (status code 403)
     * @see ApiPluginLedgerConnectorCorda#flowStatusResponse
     */
    fun flowStatusResponse(holdingIDShortHash: kotlin.String, clientRequestID: kotlin.String): FlowStatusV5Response

    /**
     * GET /api/v1/flow/{holdingIDShortHash} : This method returns an array containing the statuses of all flows running for a specified holding identity. An empty array is returned if there are no flows running.
     *
     * @param holdingIDShortHash Holding identity short hash (required)
     * @return OK (status code 200)
     *         or Unauthorized (status code 401)
     *         or Forbidden (status code 403)
     * @see ApiPluginLedgerConnectorCorda#flowStatusResponses
     */
    fun flowStatusResponses(holdingIDShortHash: kotlin.String): FlowStatusV5Responses

    /**
     * GET /api/v1/cpi : List all CPIs uploaded to the cluster
     *
     * @return OK (status code 200)
     * @see ApiPluginLedgerConnectorCorda#getCPIResponse
     */
    fun getCPIResponse(): CPIV5Response

    /**
     * GET /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/get-monitor-transactions : Get transactions for monitored state classes.
     *
     * @param getMonitorTransactionsV1Request  (optional)
     * @return OK (status code 200)
     * @see ApiPluginLedgerConnectorCorda#getMonitorTransactionsV1
     */
    fun getMonitorTransactionsV1(getMonitorTransactionsV1Request: GetMonitorTransactionsV1Request?): GetMonitorTransactionsV1Response

    /**
     * GET /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/get-prometheus-exporter-metrics : Get the Prometheus Metrics
     *
     * @return OK (status code 200)
     * @see ApiPluginLedgerConnectorCorda#getPrometheusMetricsV1
     */
    fun getPrometheusMetricsV1(): kotlin.String

    /**
     * POST /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/invoke-contract : Invokes a contract on a Corda ledger (e.g. a flow)
     *
     * @param invokeContractV1Request  (optional)
     * @return OK (status code 200)
     * @see ApiPluginLedgerConnectorCorda#invokeContractV1
     */
    fun invokeContractV1(invokeContractV1Request: InvokeContractV1Request?): InvokeContractV1Response

    /**
     * POST /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/list-flows
     * Responds with a list of the flows on the Corda node.
     *
     * @param listFlowsV1Request  (optional)
     * @return OK (status code 200)
     * @see ApiPluginLedgerConnectorCorda#listFlowsV1
     */
    fun listFlowsV1(listFlowsV1Request: ListFlowsV1Request?): ListFlowsV1Response

    /**
     * POST /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/network-map
     * Responds with a snapshot of the network map as provided by the Corda RPC call: net.corda.core.messaging.CordaRPCOps public abstract fun networkMapSnapshot(): List&lt;NodeInfo&gt;
     *
     * @param body  (optional)
     * @return OK (status code 200)
     * @see ApiPluginLedgerConnectorCorda#networkMapV1
     */
    fun networkMapV1(body: kotlin.Any?): List<NodeInfo>

    /**
     * POST /api/v1/flow/{holdingIDShortHash} : This method starts a new instance for the specified flow for the specified holding identity.
     *
     * @param holdingIDShortHash Holding identity short hash (required)
     * @param startFlowV5Request Request body for starting a flow (required)
     * @return OK (status code 200)
     * @see ApiPluginLedgerConnectorCorda#startFlowParameters
     */
    fun startFlowParameters(holdingIDShortHash: kotlin.String, startFlowV5Request: StartFlowV5Request): FlowStatusV5Response

    /**
     * POST /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/start-monitor : Start monitoring corda changes (transactions) of given state class
     *
     * @param startMonitorV1Request  (optional)
     * @return OK (status code 200)
     * @see ApiPluginLedgerConnectorCorda#startMonitorV1
     */
    fun startMonitorV1(startMonitorV1Request: StartMonitorV1Request?): StartMonitorV1Response

    /**
     * DELETE /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/stop-monitor : Stop monitoring corda changes (transactions) of given state class
     *
     * @param stopMonitorV1Request  (optional)
     * @return OK (status code 200)
     * @see ApiPluginLedgerConnectorCorda#stopMonitorV1
     */
    fun stopMonitorV1(stopMonitorV1Request: StopMonitorV1Request?): StopMonitorV1Response
}
