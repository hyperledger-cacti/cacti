package org.hyperledger.cacti.plugin.copm

import org.hyperledger.cacti.plugin.copm.interfaces.CordaConfiguration
import org.hyperledger.cacti.plugin.copm.corda.LocalTransactionContext
import org.hyperledger.cacti.plugin.copm.interfaces.InteropConfig
import org.hyperledger.cacti.plugin.copm.types.DLAccount
import org.hyperledger.cacti.plugin.copm.types.DLTransactionContext
import org.hyperledger.cacti.plugin.copm.interop.RemoteTransactionContext
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Component

@Component
class DLTransactionContextFactory {

    lateinit var cordaConfig: CordaConfiguration
    lateinit var interopConfig: InteropConfig


    @Autowired
    fun setupCordaConfig(config: CordaConfiguration) {
        this.cordaConfig = config
    }

    @Autowired
    fun setupInteropConfig(config: InteropConfig) {
        this.interopConfig = config
    }

    fun getLocalTransactionContext(account: DLAccount) : DLTransactionContext {
        return LocalTransactionContext(account, this.cordaConfig.getRPC(account));
    }

    fun getRemoteTransactionContext(account: DLAccount, remoteNetwork: String): DLTransactionContext {
        return RemoteTransactionContext(
            account.organization,
            this.interopConfig.getRelayConfig(account.organization),
            this.interopConfig.getViewAddressFormat(remoteNetwork),
            this.cordaConfig.getRPC(account),
            this.cordaConfig.getObservers(account)
            );
    }
}