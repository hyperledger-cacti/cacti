package org.hyperledger.cacti.plugin.copm.server.validators 

import org.hyperledger.cacti.plugin.copm.core.HashInfoV1Pb.HashInfoV1PB
import org.hyperledger.cacti.plugin.copm.core.TransferrableAssetV1Pb.TransferrableAssetV1PB
import org.hyperledger.cacti.plugin.copm.core.AssetAccountV1Pb.AssetAccountV1PB
import org.hyperledger.cacti.plugin.copm.core.ViewAddressV1Pb.ViewAddressV1PB

import org.hyperledger.cacti.plugin.copm.types.DLAsset;
import org.hyperledger.cacti.plugin.copm.types.DLAccount;
import org.hyperledger.cacti.plugin.copm.types.DLTransactionParams
import org.hyperledger.cacti.weaver.sdk.corda.HashFunctions

fun validateRequiredString(str: String?, label: String) : String {
    if ( str.isNullOrBlank() ) throw Exception("$label is required")
    return str
}

fun validateHash(hashInfo: HashInfoV1PB?, label: String) : HashFunctions.Hash {
    if (hashInfo == null) {
        throw Exception("$label is required")
    }
    val hash : HashFunctions.Hash = if( hashInfo.hashFcn == "SHA512")
        HashFunctions.SHA512()
    else
        HashFunctions.SHA256()

    validateRequiredString(hashInfo.secret, "$label.secret")
    hash.setPreimage(hashInfo.secret);
    return hash;
}

fun validateAccount(account: AssetAccountV1PB?, label: String) : DLAccount {
    if (account == null) { throw Exception("$label is required") }
    validateRequiredString(account.organization, "$label.network")
    validateRequiredString(account.userId, "$label.userId")
    return DLAccount(account.organization, account.userId);
}

fun validateAsset(asset: TransferrableAssetV1PB?, label: String) : DLAsset {
    if(asset == null) throw Exception("$label is required")

    if ( asset.assetId.isNullOrBlank() && asset.assetQuantity == 0) {
        throw Exception("Either ${label}.assetId or ${label}.assetQuantity must be set");
    }
    return DLAsset(asset);
}

fun validateViewRequest(viewAddress: ViewAddressV1PB?, label: String) : DLTransactionParams {
    if( viewAddress == null) throw Exception("$label is required");
    validateRequiredString(viewAddress.contractId, "$label.contractId")
    validateRequiredString(viewAddress.function, "$label.function")
    if( viewAddress.inputList == null) throw Exception("$label.input is required");
    return DLTransactionParams(viewAddress.contractId, viewAddress.function, viewAddress.inputList)
}
