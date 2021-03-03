package org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl


import net.corda.client.rpc.CordaRPCClient
import net.corda.client.rpc.CordaRPCConnection
import net.corda.core.messaging.CordaRPCOps
import net.corda.core.utilities.NetworkHostAndPort
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import javax.annotation.PostConstruct
import javax.annotation.PreDestroy
import javax.validation.Valid

import java.net.InetAddress

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated
import javax.validation.constraints.NotEmpty
import javax.validation.constraints.NotNull


private const val CACTUS_CORDA_RPC_USERNAME = "cactus.corda.rpc.username"
private const val CACTUS_CORDA_RPC_PASSWORD = "cactus.corda.rpc.password"
private const val CACTUS_CORDA_NODE_HOST = "cactus.corda.node.host"
private const val CACTUS_CORDA_RPC_PORT = "cactus.corda.rpc.port"

/**
 * Wraps an RPC connection to a Corda node.
 *
 * The RPC connection is configured using command line arguments.
 *
 * @param host The host of the node we are connecting to.
 * @param rpcPort The RPC port of the node we are connecting to.
 * @param username The username for logging into the RPC client.
 * @param password The password for logging into the RPC client.
 * @property proxy The RPC proxy.
 */
@Component
open class NodeRPCConnection(
    @Value("\${$CACTUS_CORDA_NODE_HOST}") private val host: String,
    @Value("\${$CACTUS_CORDA_RPC_USERNAME}") private val username: String,
    @Value("\${$CACTUS_CORDA_RPC_PASSWORD}") private val password: String,
    @Value("\${$CACTUS_CORDA_RPC_PORT}") private val rpcPort: Int
    ): AutoCloseable {

    final lateinit var rpcConnection: CordaRPCConnection
        private set
    final lateinit var proxy: CordaRPCOps
        private set

    @PostConstruct
    fun initialiseNodeRPCConnection() {
        val rpcAddress = NetworkHostAndPort(host, rpcPort)
        val rpcClient = CordaRPCClient(rpcAddress)
        rpcConnection = rpcClient.start(username, password)
        proxy = rpcConnection.proxy
    }

    @PreDestroy
    override fun close() {
        rpcConnection.notifyServerAndClose()
    }
}