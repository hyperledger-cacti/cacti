package org.hyperledger.cacti.plugin.copm.interop.corda

import org.hyperledger.cacti.plugin.copm.types.DLTransactionParams
import org.hyperledger.cacti.plugin.copm.interop.RemoteOrgConfig
import org.hyperledger.cacti.plugin.copm.interop.ViewAddressFormat
import org.hyperledger.cacti.weaver.sdk.corda.InteroperableHelper

class ViewAddressCorda(private val remoteOrgConfig: RemoteOrgConfig): ViewAddressFormat {
    override fun address(cmd: DLTransactionParams): String {
        return InteroperableHelper.createCordaViewAddress(
            this.remoteOrgConfig.networkId,
            this.remoteOrgConfig.relayEndpoint,
            this.remoteOrgConfig.partyEndpoints,
            cmd.contract + "." + cmd.method,
            cmd.args.joinToString(separator=":") { it.toString() })
    }

}