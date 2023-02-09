/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows.customSerializers

import arrow.core.Either
import net.corda.core.serialization.SerializationWhitelist

/**
 * The CustomSerializationWhitelist class is used to define classes that should be
 * serializable by the Corda's wire protocol (based on AMQP 1.0).
 *
 * It extends the SerializationWhitelist interface and therefore overrides the whitelist
 * property. This method of specifying whitelisted classes is need for the classes defined
 * here because they are from a third party library and therefore cannot be modified to
 * include the @CordaSerializable annotation, which is otherwise the preferred method for
 * whitelisting.
 *
 * @property whitelist The list of classes that are whitelisted for serialization.
 */
class CustomSerializationWhitelist : SerializationWhitelist {
    override val whitelist: List<Class<*>> = listOf(
            Either::class.java,
            Either.Right::class.java,
            Either.Left::class.java
            )
}