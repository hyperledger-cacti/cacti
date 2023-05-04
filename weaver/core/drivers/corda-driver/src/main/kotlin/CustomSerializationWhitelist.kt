/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package org.hyperledger.cacti.weaver.driver.corda

import arrow.core.Either
import net.corda.core.serialization.SerializationWhitelist

// TODO: Documentation
class CustomSerializationWhitelist : SerializationWhitelist {
    override val whitelist: List<Class<*>> = listOf(
            Either::class.java,
            Either.Right::class.java,
            Either.Left::class.java
    )
}