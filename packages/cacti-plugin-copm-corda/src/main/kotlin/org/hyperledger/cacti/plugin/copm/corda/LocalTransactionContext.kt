package org.hyperledger.cacti.plugin.copm.corda
import arrow.core.Either
import org.hyperledger.cacti.plugin.copm.types.DLAccount
import org.hyperledger.cacti.plugin.copm.types.DLTransactionParams
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import net.corda.core.CordaRuntimeException
import net.corda.core.flows.FlowLogic
import org.hyperledger.cacti.plugin.copm.types.DLTransactionContext


class LocalTransactionContext(private val account: DLAccount, private val rpc: NodeRPCConnection) : DLTransactionContext {

    override suspend fun invoke(cmd: DLTransactionParams) : Any? {
        val cordaParams = this.cordaParams(cmd.args).toTypedArray()
        @Suppress("UNCHECKED_CAST")
        val cordaFlow = Class.forName("${cmd.contract}.${cmd.method}") as Class<out FlowLogic<*>>
        try {
            val result = withContext(Dispatchers.IO) {
                rpc.proxy.startFlowDynamic(
                    cordaFlow,
                    *cordaParams
                ).returnValue.get()
            }
            when (result) {
                is Either.Left<*> -> {
                    throw IllegalStateException("Corda Error: ${result.a.toString()}\n")
                }
                is Either.Right<*> -> {
                    return result.b.toString()
                }
            }
            throw IllegalStateException("Corda did not return an EITHER\n")
        } catch (e: CordaRuntimeException) {
            throw IllegalStateException("Corda Runtime Exception:" + e.message)
        }
    }

    private fun cordaParams(params: List<Any>) : List<Any> {
        return params.map {
            when (it) {
                is CordaType -> it.toCordaParam(this.rpc)
                is List<*> -> this.cordaParams(it.map { it as Any})
                else -> it
            }
        }
    }

}