package org.hyperledger.cacti.plugin.copm.validators
import org.hyperledger.cacti.plugin.copm.types.DLAccount
import org.hyperledger.cacti.plugin.copm.types.DLAsset
import org.hyperledger.cacti.plugin.copm.server.validators.validateAccount
import org.hyperledger.cacti.plugin.copm.server.validators.validateAsset
import org.hyperledger.cacti.plugin.copm.server.validators.validateHash
import org.hyperledger.cacti.plugin.copm.core.services.defaultservice.DefaultServiceOuterClass.LockAssetV1Request
import org.hyperledger.cacti.weaver.sdk.corda.HashFunctions

class ValidatedLockAssetV1Request(val asset: DLAsset,
                                  val sourceAccount: DLAccount,
                                  val destAccount: DLAccount,
                                  val hash: HashFunctions.Hash,
                                  val sourceCert: String,
                                  val destCert: String,
                                  val expiryTimeFmt: Int,
                                  val expiryTime: Long) {
    constructor(req: LockAssetV1Request) : this(
        validateAsset(req.assetLockV1PB.asset, "asset"),
        validateAccount(req.assetLockV1PB.source, "source"),
        validateAccount(req.assetLockV1PB.dest, "dest"),
        validateHash(req.assetLockV1PB.hashInfo, "hashInfo"),
        req.assetLockV1PB.sourceCertificate ?: "",
        req.assetLockV1PB.destinationCertificate ?: "",
        1,
        req.assetLockV1PB.expirySecs)

}