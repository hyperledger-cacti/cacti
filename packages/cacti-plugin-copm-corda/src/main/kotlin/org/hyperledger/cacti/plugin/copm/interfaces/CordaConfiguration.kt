package org.hyperledger.cacti.plugin.copm.interfaces
import org.hyperledger.cacti.plugin.copm.corda.CordaAssetContract
import org.hyperledger.cacti.plugin.copm.corda.CordaParty
import org.hyperledger.cacti.plugin.copm.corda.NodeRPCConnection
import org.hyperledger.cacti.plugin.copm.types.DLAccount
import org.hyperledger.cacti.plugin.copm.types.DLAsset

interface CordaConfiguration {
    /**
     * The local chaincode containing the COPM functions
     */
    val copmContract: String

    /**
     * Given an asset, return the Corda contract information for the asset
     */
    fun assetContract(asset: DLAsset) : CordaAssetContract

    /**
     * Return the RPC connection for a given account
     */
    fun getRPC(account: DLAccount) : NodeRPCConnection

    /**
     * Given an asset, return the issuer
     */
    fun getIssuer(asset: DLAsset) : CordaParty

    /**
     * return a list of observer parties who may be interested
     */
    fun getObservers(account: DLAccount) : List<CordaParty>
}