package org.hyperledger.cacti.plugin.copm.types

interface DLTransactionContext {
    suspend fun invoke(cmd: DLTransactionParams) : Any?
}