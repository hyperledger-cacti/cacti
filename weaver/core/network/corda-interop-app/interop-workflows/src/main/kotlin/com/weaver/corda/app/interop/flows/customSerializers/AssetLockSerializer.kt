/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows.customSerializers

import com.google.protobuf.ByteString
import com.weaver.protos.common.asset_locks.AssetLocks
import net.corda.core.serialization.SerializationCustomSerializer

class AssetLockSerializer: SerializationCustomSerializer<AssetLocks.AssetLock, AssetLockSerializer.Proxy> {

    /**
     * The Proxy class is a serializable counterpart of the AssetLocks.AssetLock class.
     */
    data class Proxy(
        val lockMechanism: AssetLocks.LockMechanism,
        val lockInfo: ByteArray
    )

    /**
     * The function toProxy describes how the Query class should be converted to a Proxy
     * class so that it can be serialized and transferred across the wire.
     */
    override fun toProxy(obj: AssetLocks.AssetLock) = Proxy(
            lockMechanism = obj.lockMechanism,
            lockInfo = obj.lockInfo.toByteArray()
    )

    /** The function fromProxy describes how the Proxy class should be converted back to a
     * Query class when it is received from across the wire.
     */
    override fun fromProxy(proxy: Proxy) : AssetLocks.AssetLock {
        return AssetLocks.AssetLock.newBuilder()
                .setLockMechanism(proxy.lockMechanism)
                .setLockInfo(ByteString.copyFrom(proxy.lockInfo))
                .build()
    }
}