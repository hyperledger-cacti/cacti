package org.hyperledger.cacti.plugin.copm.validators

import org.hyperledger.cacti.plugin.copm.types.DLAccount
import org.hyperledger.cacti.plugin.copm.types.DLAsset
import org.hyperledger.cacti.plugin.copm.server.validators.validateAccount
import org.hyperledger.cacti.plugin.copm.server.validators.validateAsset
import org.hyperledger.cacti.plugin.copm.server.validators.validateHash
import org.hyperledger.cacti.plugin.copm.server.validators.validateRequiredString
import org.hyperledger.cacti.plugin.copm.core.services.defaultservice.DefaultServiceOuterClass.ClaimLockedAssetV1Request
import org.hyperledger.cacti.weaver.sdk.corda.HashFunctions

class ValidatedClaimLockedAssetV1Request(val asset: DLAsset,
                                         val contractId: String,
                                         val recipient: DLAccount,
                                         val hash: HashFunctions.Hash ) {

    constructor(request: ClaimLockedAssetV1Request) : this(
        validateAsset(request.assetLockClaimV1PB.asset, "asset"),
        validateRequiredString(request.assetLockClaimV1PB.lockId, "lockId"),
        validateAccount(request.assetLockClaimV1PB.destination, "destination"),
        validateHash(request.assetLockClaimV1PB.hashInfo, "hashInfo")
    ) {
    }
}