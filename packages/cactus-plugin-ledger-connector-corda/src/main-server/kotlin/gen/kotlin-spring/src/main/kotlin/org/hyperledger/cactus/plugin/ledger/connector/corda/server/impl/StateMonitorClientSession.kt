package org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl

import net.corda.core.contracts.ContractState
import net.corda.core.node.services.Vault
import net.corda.core.node.services.vault.DEFAULT_PAGE_NUM
import net.corda.core.node.services.vault.PageSpecification
import net.corda.core.node.services.vault.QueryCriteria
import net.corda.core.utilities.loggerFor
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.GetMonitorTransactionsV1ResponseTxInner
import rx.Subscription
import java.math.BigInteger
import java.time.LocalDateTime
import jakarta.annotation.PreDestroy

/**
 * Monitoring session for single client, can track multiple state changes.
 *
 * @param rpc The Corda RPC connection
 * @param sessionExpireMinutes Period after which the session will become expired
 *
 * @author michal.bajer@fujitsu.com
 */
class StateMonitorClientSession(private val rpc: NodeRPCConnection, private val sessionExpireMinutes: Long) :
    AutoCloseable {
    /**
     * Simple data class for monitor reactive `subscription`, and queue of `stateChanges` received from corda
     */
    private data class StateMonitor(
        val stateChanges: MutableSet<GetMonitorTransactionsV1ResponseTxInner>,
        val subscription: Subscription
    )

    private val monitors = mutableMapOf<String, StateMonitor>()
    private var sessionExpireTime = LocalDateTime.now().plusMinutes(sessionExpireMinutes)

    companion object {
        val logger = loggerFor<StateMonitorClientSession>()
    }

    /**
     * Start monitoring of corda state changes.
     *
     * Changes can be later read by `getTransactions`.
     * When monitoring is already running, this function does nothing.
     *
     * @param stateName String representation of corda state to monitor.
     * @param cordaState ContractState object of state to monitor.
     */
    fun startMonitor(stateName: String, cordaState: Class<out ContractState>) {
        if (monitors.containsKey(stateName)) {
            logger.info("Monitoring of state {} is already running", stateName)
            return
        }

        val criteria = QueryCriteria.VaultQueryCriteria(status = Vault.StateStatus.UNCONSUMED)
        val pagingSpec = PageSpecification(DEFAULT_PAGE_NUM, 1)
        val stateUpdates = this.rpc.proxy.vaultTrackByWithPagingSpec(cordaState, criteria, pagingSpec).updates

        var indexCounter = BigInteger.valueOf(0)
        val stateChanges = mutableSetOf<GetMonitorTransactionsV1ResponseTxInner>()
        val monitorSub = stateUpdates.subscribe { update ->
            update.produced.forEach { change ->
                val txResponse = GetMonitorTransactionsV1ResponseTxInner(indexCounter.toString(), change.toString())
                indexCounter = indexCounter.add(BigInteger.valueOf(1))
                logger.debug("Pushing new transaction for state '{}', index {}", stateName, indexCounter)
                stateChanges.add(txResponse)
            }
        }
        monitors[stateName] = StateMonitor(stateChanges, monitorSub)
        logger.info("Monitoring for changes of state '{}' started.", stateName)
    }

    /**
     * Get transactions (state changes) from internal buffer.
     *
     * Throws an error if there's no monitor for specified state. Make sure startMonitor was already called first.
     *
     * @param stateName String representation of corda state to monitor.
     * @return Set of corda state changes
     */
    fun getTransactions(stateName: String): MutableSet<GetMonitorTransactionsV1ResponseTxInner> {
        if (!monitors.containsKey(stateName)) {
            throw Exception("No monitor running for corda state $stateName on requested client")
        }

        return monitors[stateName]?.stateChanges ?: mutableSetOf()
    }

    /**
     * Remove transactions with specified indexes from internal buffer.
     *
     * Throws an error if there's no monitor for specified state. Make sure startMonitor was already called first.
     *
     * @param stateName String representation of corda state to monitor.
     * @param indexesToRemove List of string indexes of transactions to remove.
     */
    fun clearTransactions(stateName: String, indexesToRemove: List<String>) {
        val transactions = this.getTransactions(stateName)
        logger.debug("Transactions before remove: {}", transactions.size)
        transactions.removeAll { it.index in indexesToRemove }
        logger.debug("Transactions after remove: {}", transactions.size)
    }

    /**
     * Stop monitoring of corda state changes.
     *
     * Clears the transactions that were not read yet.
     * When there is no monitor running for specified state, it does nothing.
     *
     * @param stateName String representation of corda state to monitor.
     */
    fun stopMonitor(stateName: String) {
        monitors[stateName]?.subscription?.unsubscribe()
        monitors.remove(stateName)
        logger.info("Monitoring for state '{}' stopped.", stateName)
    }

    /**
     * Removes all active monitors from this session
     */
    @PreDestroy
    override fun close() {
        monitors.forEach { it.value.subscription.unsubscribe() }
        monitors.clear()
    }

    /**
     * Increase time until this session is marked as expired.
     * Make sure to call from time to time when the session is still in use.
     */
    fun refreshExpireTime() {
        this.sessionExpireTime = LocalDateTime.now().plusMinutes(sessionExpireMinutes)
    }

    /**
     * Return true if this session is expired
     */
    fun isExpired() = LocalDateTime.now().isAfter(sessionExpireTime)

    /**
     * Return true if there are active monitors in this session
     */
    fun hasMonitorRunning() = monitors.isNotEmpty()
}