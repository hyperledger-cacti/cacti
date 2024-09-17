package org.hyperledger.cacti.plugin.copm.corda
import org.hyperledger.cacti.plugin.copm.validators.ValidatedPledgeAssetV1Request
import net.corda.core.contracts.CommandData
import org.hyperledger.cacti.weaver.imodule.corda.states.AssetPledgeParameters

class CordaAssetPledge(private val data: ValidatedPledgeAssetV1Request,
                       private val getStateAndRef: String,
                       private val assetBurn : CommandData,
                       private val issuer: CordaParty,
                       private val observers: List<CordaParty>)
    : CordaType {

    override fun toCordaParam(rpc: NodeRPCConnection): Any {
        return AssetPledgeParameters(
            data.asset.assetType, // @property assetType
            data.asset.assetIdOrQuantity(),
            data.sourceAccount.organization, // @property localNetworkId
            data.destinationAccount.organization, // @property remoteNetworkId
            data.destinationCertificate, // @property recipientCert
            data.timeout, // @property expiryTimeSecs
            this.getStateAndRef,
            this.assetBurn,
            this.issuer.toCordaParam(rpc),
            this.observers.map { it.toCordaParam(rpc) }
        )
    }
}