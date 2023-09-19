/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package org.hyperledger.cacti.weaver.imodule.corda.test

import co.paralleluniverse.fibers.Suspendable
import net.corda.core.flows.*
import net.corda.core.contracts.UniqueIdentifier

/*
 * Example of user flow for WriteExternalState
 */
@StartableByRPC
class UserFlow(
    val externalStateLinearIds: Array<UniqueIdentifier>
) : FlowLogic<Boolean>() {
    @Suspendable
    override fun call(): Boolean {
        if (externalStateLinearIds.size > 0)
            return true
        return false
    }
}