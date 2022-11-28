/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows.customSerializers

import com.google.protobuf.ByteString
import com.weaver.protos.common.asset_locks.AssetLocks
import net.corda.core.serialization.SerializationCustomSerializer

class AssetLockHTLCSerializer: SerializationCustomSerializer<AssetLocks.AssetLockHTLC, AssetLockHTLCSerializer.Proxy> {

    /**
     * The Proxy class is a serializable counterpart of the AssetLocks.AssetLockHTLC class.
     */
    data class Proxy(
        val hashMechanism: AssetLocks.HashMechanism,
        val hashBase64: ByteArray,
        val expiryTimeSecs: Long,
        val timeSpec: AssetLocks.TimeSpec
    )

    /**
     * The function toProxy describes how the Query class should be converted to a Proxy
     * class so that it can be serialized and transferred across the wire.
     */
    override fun toProxy(obj: AssetLocks.AssetLockHTLC) = Proxy(
            hashMechanism = obj.hashMechanism,
            hashBase64 = obj.hashBase64.toByteArray(),
            expiryTimeSecs = obj.expiryTimeSecs,
            timeSpec = obj.timeSpec
    )

    /** The function fromProxy describes how the Proxy class should be converted back to a
     * Query class when it is received from across the wire.
     */
    override fun fromProxy(proxy: Proxy) : AssetLocks.AssetLockHTLC {
        return AssetLocks.AssetLockHTLC.newBuilder()
                .setHashMechanism(proxy.hashMechanism)
                .setHashBase64(ByteString.copyFrom(proxy.hashBase64))
                .setExpiryTimeSecs(proxy.expiryTimeSecs)
                .setTimeSpec(proxy.timeSpec)
                .build()
    }
}