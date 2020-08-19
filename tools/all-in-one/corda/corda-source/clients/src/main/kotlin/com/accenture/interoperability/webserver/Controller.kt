package com.accenture.interoperability.webserver

import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * API endpoints that connects to a Corda node via RPC.
 */
@RestController
@RequestMapping("/api/v1")
class Controller(rpc: NodeRPCConnection) {

    companion object {
        private val logger = LoggerFactory.getLogger(RestController::class.java)
    }

    private val proxy = rpc.proxy

    /**
     * Endpoint for server health check. Return the legal identities of the Corda node.
     */
    @GetMapping("/node-info", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun getNodeInfo() = ResponseEntity.ok(
        mapOf("nodeInfo" to mapOf("legalIdentities" to proxy.nodeInfo().legalIdentities.map { it.name.toString() }))
    )

}