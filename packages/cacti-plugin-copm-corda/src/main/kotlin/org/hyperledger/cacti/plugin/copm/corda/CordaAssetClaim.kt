package org.hyperledger.cacti.plugin.copm.corda
import org.hyperledger.cacti.plugin.copm.validators.ValidatedClaimPledgedAssetV1Request
import net.corda.core.contracts.CommandData
import org.hyperledger.cacti.weaver.imodule.corda.states.AssetClaimParameters

class CordaAssetClaim(private var data: ValidatedClaimPledgedAssetV1Request,
                      private var pledgeStatusLinearId: String,
                      private var issueCmd : CommandData,
                      private var getStateAndContract: String,
                      private var issuer: CordaParty,
                      private var observers: List< CordaParty >) : CordaType {

    override fun toCordaParam(rpc: NodeRPCConnection): Any {
        return AssetClaimParameters(data.pledgeId,
            this.issueCmd,
            this.pledgeStatusLinearId,
            this.getStateAndContract,
            data.asset.assetType,
            data.asset.assetIdOrQuantity(),
            data.sourceCert,
            data.destCert,
            this.issuer.toCordaParam(rpc),
            this.observers.map { it.toCordaParam(rpc) }
        )
    }
}