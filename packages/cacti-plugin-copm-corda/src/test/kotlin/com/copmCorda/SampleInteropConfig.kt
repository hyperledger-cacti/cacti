package com.copmCorda

import org.hyperledger.cacti.plugin.copm.interfaces.InteropConfig
import org.hyperledger.cacti.plugin.copm.interop.RelayConfig
import org.hyperledger.cacti.plugin.copm.interop.RemoteCopmContract
import org.hyperledger.cacti.plugin.copm.interop.RemoteOrgConfig
import org.hyperledger.cacti.plugin.copm.interop.ViewAddressFormat
import org.hyperledger.cacti.plugin.copm.interop.fabric.ViewAddressFabric
import org.hyperledger.cacti.plugin.copm.interop.corda.ViewAddressCorda
import org.hyperledger.cacti.plugin.copm.types.DLAsset
import com.copmCorda.interop.corda.RemoteCopmContractCordaFungible
import com.copmCorda.interop.corda.RemoteCopmContractCordaNFT
import com.copmCorda.interop.fabric.RemoteCopmContractFabricFungible
import com.copmCorda.interop.fabric.RemoteCopmContractFabricNFT
import org.hyperledger.cacti.weaver.sdk.corda.RelayOptions
import org.json.JSONObject
import org.springframework.stereotype.Component
import net.corda.core.utilities.loggerFor
import kotlin.reflect.KClass

@Component
class SampleInteropConfig : InteropConfig {

    companion object {
        val logger = loggerFor<InteropConfig>()
        val remoteCopmContracts = listOf(
            RemoteCopmContractFabricNFT(),
            RemoteCopmContractFabricFungible(),
            RemoteCopmContractCordaNFT(),
            RemoteCopmContractCordaFungible()
        )
        val viewAddressFormats:  Map<String, KClass<*>> = mapOf(
            "corda" to ViewAddressCorda::class,
            "fabric" to ViewAddressFabric::class
        )
    }

    override fun getRelayConfig(localOrgKey: String): RelayConfig {
        val relayConfigJSON = JSONObject(System.getenv("COPM_RELAY_CONFIG"))
            
        if (!relayConfigJSON.has(localOrgKey)) {
            throw IllegalStateException("env var COPM_RELAY_CONFIG doesn't contain the configuration of networkID $localOrgKey.")
        }

        val netConfigJson = relayConfigJSON.getJSONObject(localOrgKey)
        val localRelayEndpoint: String = netConfigJson.getString("relayEndpoint")
        logger.debug("messages from ${localOrgKey} will be sent to ${localRelayEndpoint}")
        return RelayConfig(localRelayEndpoint, this.relayOptions())
    }

    override fun getViewAddressFormat(remoteOrgKey: String) : ViewAddressFormat {
        val networkConfig = this.getRemoteOrgConfig(remoteOrgKey)
        if (! viewAddressFormats.contains(networkConfig.networkType)) {
            throw IllegalStateException("no view address formatter found for $remoteOrgKey")
        }
        val clazz = viewAddressFormats[networkConfig.networkType]
        return clazz!!.constructors.first().call(networkConfig) as ViewAddressFormat;
    }

    override fun getRemoteCopmContract(remoteOrgKey: String, asset: DLAsset) : RemoteCopmContract {
        val networkConfig = this.getRemoteOrgConfig(remoteOrgKey)
        for (contract in remoteCopmContracts) {
            if (contract.matchesNetworkTypeAndAsset(networkConfig.networkType, asset)) {
                return contract
            }
        }
        throw IllegalStateException("no contract found for $remoteOrgKey matching asset ${asset.assetType}")
    }

    override fun getRemoteOrgConfig(remoteOrgKey: String): RemoteOrgConfig {
        val netConfigJson = remoteNetworkJson(remoteOrgKey)
        logger.debug("getting configuration for $remoteOrgKey")
        logger.debug(netConfigJson.toString())
        val relayEndpoint: String = netConfigJson.getString("relayEndpoint")
        val networkType: String = netConfigJson.getString("type")
        logger.debug("$remoteOrgKey is of type $networkType")

        if (networkType == "corda") {
            return RemoteOrgConfig(
                remoteOrgKey,
                networkType,
                relayEndpoint,
                "",
                listOf(netConfigJson.getString("partyEndPoint"))
            )
        } else {
            return RemoteOrgConfig(
                remoteOrgKey,
                networkType,
                relayEndpoint,
                netConfigJson.getString("channelName"),
                emptyList()
            )
        }
    }

    private fun remoteNetworkJson(networkID: String): JSONObject {
        val networksConfigJSON = JSONObject(System.getenv("COPM_REMOTE_CONFIG"))
            
        // throw exception if the networkID is not present in the file
        if (!networksConfigJSON.has(networkID)) {
            throw IllegalStateException("env var COPM_REMOTE_CONFIG doesn't contain the configuration of networkID $networkID.")
        }
        return networksConfigJSON.getJSONObject(networkID)
    }

    private fun relayOptions(): RelayOptions {
        val relayTLS = System.getenv("RELAY_TLS") ?: "false"
        val relayTrustStore = System.getenv("RELAY_TLSCA_TRUST_STORE") ?: ""
        val relayTrustStorePassword = System.getenv("RELAY_TLSCA_TRUST_STORE_PASSWORD") ?: ""
        val relayCertPaths = System.getenv("RELAY_TLSCA_CERT_PATHS") ?: ""
        return RelayOptions(
            useTlsForRelay = relayTLS.toBoolean(),
            relayTlsTrustStorePath = relayTrustStore,
            relayTlsTrustStorePassword = relayTrustStorePassword,
            tlsCACertPathsForRelay = relayCertPaths
        )
    }
}
