package org.hyperledger.cacti.plugin.copm.validators

import org.hyperledger.cacti.plugin.copm.types.DLAccount
import org.hyperledger.cacti.plugin.copm.types.DLAsset
import org.hyperledger.cacti.plugin.copm.server.validators.validateAccount
import org.hyperledger.cacti.plugin.copm.server.validators.validateAsset
import org.hyperledger.cacti.plugin.copm.core.services.defaultservice.DefaultServiceOuterClass.PledgeAssetV1Request
import java.util.Calendar

class ValidatedPledgeAssetV1Request(val asset: DLAsset,
                                    val sourceAccount: DLAccount,
                                    val destinationAccount: DLAccount,
                                    val destinationCertificate: String,
                                    val timeout: Long) {

    constructor(request: PledgeAssetV1Request) : this(
        validateAsset(request.assetPledgeV1PB.asset,"asset"),
        validateAccount(request.assetPledgeV1PB.source, "source"),
        validateAccount(request.assetPledgeV1PB.destination, "destination"),
        request.assetPledgeV1PB.destinationCertificate ?: "",
        (Calendar.getInstance().timeInMillis / 1000) + (request.assetPledgeV1PB.expirySecs)
    )

}

