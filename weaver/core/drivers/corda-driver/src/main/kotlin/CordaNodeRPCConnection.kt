/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.driver

import net.corda.client.rpc.CordaRPCClient
import net.corda.core.utilities.NetworkHostAndPort
import javax.annotation.PreDestroy

/**
 * Wraps a Corda node RPC proxy.
 *
 * @property host The host of the node we are connecting to.
 * @property rpcPort The RPC port of the node we are connecting to.
 * @property username The username for logging into the RPC client.
 * @property password The password for logging into the RPC client.
 * @property proxy The RPC proxy.
 * @property rpcAddress The address of the node to connect to
 * @property rpcClient The client for sending RPC calls to the node
 * @property rpcConnection The connection with the node
 */
open class CordaNodeRPCConnection(
    private val host: String,
    private val username: String,
    private val password: String,
    private val rpcPort: Int) {

    val rpcAddress = NetworkHostAndPort(host, rpcPort)
    val rpcClient = CordaRPCClient(rpcAddress)
    val rpcConnection = rpcClient.start(username, password)
    val proxy = rpcConnection.proxy

    @PreDestroy
    fun close() {
        rpcConnection.notifyServerAndClose()
    }
}