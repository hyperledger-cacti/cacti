package org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl

import net.corda.core.utilities.loggerFor
import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import jakarta.annotation.PreDestroy

private const val SessionExpireMinutes = "cactus.sessionExpireMinutes"
private const val SessionExpireMinutesDefault = "30"
private const val SessionExpireCheckInterval: Long = 60 * 1000 // every minute

/**
 * Client session manager for corda state monitoring.
 *
 * Manages monitoring session for each client calling this connector.
 * Endpoint handlers can use withClient function to execute monitoring-session code in context of particular client.
 * Sessions of clients who do not perform any operation for specified amount of time (cactus.sessionExpireMinutes) are removed periodically.
 *
 * @param sessionExpireMinutes How long to wait for action until removing the client session (config: cactus.sessionExpireMinutes)
 * @param rpc The Corda RPC connection
 *
 * @property clientSessions Map of client sessions. Should not be accessed directly - it's public only because `withClient` is inlined in caller code.
 *
 * @author michal.bajer@fujitsu.com
 */
@Component
class StateMonitorSessionsManager(
    @Value("\${$SessionExpireMinutes:${SessionExpireMinutesDefault}}") val sessionExpireMinutes: Long,
    val rpc: NodeRPCConnection
) : AutoCloseable {
    companion object {
        val logger = loggerFor<StateMonitorSessionsManager>()
    }

    val clientSessions = mutableMapOf<String, StateMonitorClientSession>()

    /**
     * Remove all client sessions that has no state monitors running or are expired (there was no action on them for some time)
     *
     * It's executed periodically by the framework, but can be run manually as well when needed.
     * Polling period taken from const `$SessionExpireCheckInterval`
     */
    @Scheduled(fixedDelay = SessionExpireCheckInterval)
    fun cleanInvalidClientSessions() {
        synchronized (this.clientSessions) {
            logger.info("Remove all invalid client sessions. Before - {}", clientSessions.size)
            clientSessions.entries.removeAll { !it.value.hasMonitorRunning() || it.value.isExpired() }
            logger.info("Remove all invalid client sessions. After - {}", clientSessions.size)
        }
    }

    /**
     * Remove all running client monitors.
     */
    @PreDestroy
    override fun close() {
        logger.info("StateMonitorQueuesManager close - stop all running monitors.")
        clientSessions.forEach { it.value.close() }
    }

    /**
     * Run StateMonitorClientSession functions in specified client session context.
     *
     * When client with specified ID is not found, then new client session is created.
     * Function is inlined in callers code, it's possible to return values from this block.
     * After each call the access time for given client is refreshed.
     * If client has no running monitors after the user-defined block, then it's session is removed.
     *
     * @param clientAppId string representation of client ID
     * @param block lambda function to be executed in given client session context
     */
    final inline fun <T> withClient(clientAppId: String, block: StateMonitorClientSession.() -> T): T {
        synchronized (this.clientSessions) {
            // Get client session and update it's expire time
            val clientSession =
                this.clientSessions
                    .getOrPut(clientAppId) { StateMonitorClientSession(rpc, sessionExpireMinutes) }
                    .also { it.refreshExpireTime() }

            // Run the caller logic on specific client session
            val results = clientSession.block()
            logger.debug("Monitor withClient block response: {}", results)

            // Check if client session still valid
            if (!clientSession.hasMonitorRunning()) {
                logger.info("Client session {} not valid anymore - remove.", clientAppId)
                this.clientSessions.remove(clientAppId)
            }

            return results
        }
    }
}