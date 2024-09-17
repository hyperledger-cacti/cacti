package org.hyperledger.cacti.plugin.copm.corda
import net.corda.core.contracts.CommandData

class CordaAssetContract(
    val getStateAndRefCmdStr: String,
    val getStateAndContractIdCmdStr: String,
    val updateAssetOwnerCmdStr: String,
    val issueAssetCmd: CommandData,
    val burnAssetCmd: CommandData) {
}

