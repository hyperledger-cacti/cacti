package org.hyperledger.cacti.plugin.copm.interop

class RemoteOrgConfig(val networkId: String,
                          val networkType: String,
                          val relayEndpoint: String,
                          val channelName: String, // fabric-specific
                          val partyEndpoints: List<String> // corda-specific
    )
{
}

