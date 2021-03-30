package org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl

import java.lang.RuntimeException


open class InstantiationException(override val message: String, override val cause: Throwable? = null)
    : RuntimeException(message, cause)

open class ConstructorLookupException(override val message: String, override val cause: Throwable? = null)
    : InstantiationException(message, cause)
