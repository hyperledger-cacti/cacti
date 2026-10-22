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
        validateAsset(req.assetLockV1Pb.asset, "asset"),
        validateAccount(req.assetLockV1Pb.source, "source"),
        validateAccount(req.assetLockV1Pb.dest, "dest"),
        validateHash(req.assetLockV1Pb.hashInfo, "hashInfo"),
        req.assetLockV1Pb.sourceCertificate ?: "",
        req.assetLockV1Pb.destinationCertificate ?: "",
        1,
        req.assetLockV1Pb.expirySecs)

}