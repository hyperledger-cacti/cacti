package org.hyperledger.cactus.plugin.ledger.connector.corda.server.api

import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DeployContractJarsBadRequestV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DeployContractJarsSuccessV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DeployContractJarsV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.InvokeContractV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.InvokeContractV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.NodeInfo
interface ApiPluginLedgerConnectorCordaService {

	fun deployContractJarsV1(deployContractJarsV1Request: DeployContractJarsV1Request?): DeployContractJarsSuccessV1Response

	fun invokeContractV1(invokeContractV1Request: InvokeContractV1Request?): InvokeContractV1Response

	fun networkMapV1(body: kotlin.Any?): List<NodeInfo>
}
