package org.hyperledger.cacti.plugin.copm.validators

import org.hyperledger.cacti.plugin.copm.types.DLAccount
import org.hyperledger.cacti.plugin.copm.types.DLTransactionParams
import org.hyperledger.cacti.plugin.copm.server.validators.validateAccount
import org.hyperledger.cacti.plugin.copm.server.validators.validateRequiredString
import org.hyperledger.cacti.plugin.copm.server.validators.validateViewRequest
import org.hyperledger.cacti.plugin.copm.core.services.defaultservice.DefaultServiceOuterClass

class ValidatedGetVerifiedViewV1Request(val account : DLAccount, val cmd : DLTransactionParams, val remoteNetwork: String) {
   constructor(request: DefaultServiceOuterClass.GetVerifiedViewV1Request) : this (
       validateAccount(request.getVerifiedViewV1RequestPB.account, "account"),
       validateViewRequest(request.getVerifiedViewV1RequestPB.view?.viewAddress, "view.viewAddress"),
       validateRequiredString(request.getVerifiedViewV1RequestPB.view.organization, "view.organization"))
   {
   }
}