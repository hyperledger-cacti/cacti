/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows.customSerializers

import com.google.protobuf.ByteString
import com.weaver.protos.common.asset_locks.AssetLocks
import net.corda.core.serialization.SerializationCustomSerializer

class AssetClaimHTLCSerializer: SerializationCustomSerializer<AssetLocks.AssetClaimHTLC, AssetClaimHTLCSerializer.Proxy> {

    /**
     * The Proxy class is a serializable counterpart of the AssetLocks.AssetClaimHTLC class.
     */
    data class Proxy(
        val hashMechanism: AssetLocks.HashMechanism,
        val hashPreimageBase64: ByteArray
    )

    /**
     * The function toProxy describes how the Query class should be converted to a Proxy
     * class so that it can be serialized and transferred across the wire.
     */
    override fun toProxy(obj: AssetLocks.AssetClaimHTLC) = Proxy(
        hashMechanism = obj.hashMechanism,
        hashPreimageBase64 = obj.hashPreimageBase64.toByteArray()
    )

    /** The function fromProxy describes how the Proxy class should be converted back to a
     * Query class when it is received from across the wire.
     */
    override fun fromProxy(proxy: Proxy) : AssetLocks.AssetClaimHTLC {
        return AssetLocks.AssetClaimHTLC.newBuilder()
                .setHashMechanism(proxy.hashMechanism)
                .setHashPreimageBase64(ByteString.copyFrom(proxy.hashPreimageBase64))
                .build()
    }
}
