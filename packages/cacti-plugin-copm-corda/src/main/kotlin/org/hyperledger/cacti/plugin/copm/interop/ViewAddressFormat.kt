package org.hyperledger.cacti.plugin.copm.interop

import org.hyperledger.cacti.plugin.copm.types.DLTransactionParams

interface ViewAddressFormat {
    fun address(cmd: DLTransactionParams) : String
}