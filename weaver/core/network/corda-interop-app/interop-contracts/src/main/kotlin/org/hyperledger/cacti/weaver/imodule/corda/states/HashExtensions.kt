/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package org.hyperledger.cacti.weaver.imodule.corda.states

import net.corda.core.utilities.OpaqueBytes
import java.security.MessageDigest

fun OpaqueBytes.sha512(): OpaqueBytes {
    return OpaqueBytes(MessageDigest.getInstance("SHA-512").digest(this.bytes))
}