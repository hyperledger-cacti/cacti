package org.hyperledger.cacti.plugin.copm.interfaces
import org.hyperledger.cacti.plugin.copm.interop.RelayConfig
import org.hyperledger.cacti.plugin.copm.interop.RemoteCopmContract
import org.hyperledger.cacti.plugin.copm.interop.RemoteOrgConfig
import org.hyperledger.cacti.plugin.copm.interop.ViewAddressFormat
import org.hyperledger.cacti.plugin.copm.types.DLAsset

interface InteropConfig {
    fun getRelayConfig(localOrgKey: String): RelayConfig;
    fun getViewAddressFormat(remoteOrgKey: String) : ViewAddressFormat;
    fun getRemoteCopmContract(remoteOrgKey: String, asset: DLAsset) : RemoteCopmContract;
    fun getRemoteOrgConfig(remoteOrgKey: String): RemoteOrgConfig;
}
