package org.hyperledger.cacti.plugin.copm.validators

import org.hyperledger.cacti.plugin.copm.types.DLAccount
import org.hyperledger.cacti.plugin.copm.types.DLAsset
import org.hyperledger.cacti.plugin.copm.server.validators.validateAccount
import org.hyperledger.cacti.plugin.copm.server.validators.validateAsset
import org.hyperledger.cacti.plugin.copm.server.validators.validateRequiredString
import org.hyperledger.cacti.plugin.copm.core.services.defaultservice.DefaultServiceOuterClass.ClaimPledgedAssetV1Request

class ValidatedClaimPledgedAssetV1Request(val asset: DLAsset,
                                          val sourceAccount: DLAccount,
                                          val destinationAccount: DLAccount,
                                          val sourceCert: String,
                                          val destCert: String,
                                          val pledgeId: String) {

    constructor(request: ClaimPledgedAssetV1Request) : this(
        validateAsset(request.assetPledgeClaimV1Pb.asset,"asset"),
        validateAccount(request.assetPledgeClaimV1Pb.source, "source"),
        validateAccount(request.assetPledgeClaimV1Pb.destination, "destination"),
        request.assetPledgeClaimV1Pb.sourceCertificate ?: "",
        request.assetPledgeClaimV1Pb.destCertificate ?: "",
        validateRequiredString( request.assetPledgeClaimV1Pb.pledgeId, "pledgeId")
    )

}
