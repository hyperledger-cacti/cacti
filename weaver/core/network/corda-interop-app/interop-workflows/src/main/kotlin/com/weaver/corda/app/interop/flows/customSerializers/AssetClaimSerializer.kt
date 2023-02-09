/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows.customSerializers

import com.google.protobuf.ByteString
import com.weaver.protos.common.asset_locks.AssetLocks
import net.corda.core.serialization.SerializationCustomSerializer

class AssetClaimSerializer: SerializationCustomSerializer<AssetLocks.AssetClaim, AssetClaimSerializer.Proxy> {

    /**
     * The Proxy class is a serializable counterpart of the AssetLocks.AssetClaim class.
     */
    data class Proxy(
        val lockMechanism: AssetLocks.LockMechanism,
        val claimInfo: ByteArray
    )

    /**
     * The function toProxy describes how the Query class should be converted to a Proxy
     * class so that it can be serialized and transferred across the wire.
     */
    override fun toProxy(obj: AssetLocks.AssetClaim) = Proxy(
        lockMechanism = obj.lockMechanism,
        claimInfo = obj.claimInfo.toByteArray()
    )

    /** The function fromProxy describes how the Proxy class should be converted back to a
     * Query class when it is received from across the wire.
     */
    override fun fromProxy(proxy: Proxy) : AssetLocks.AssetClaim {
        return AssetLocks.AssetClaim.newBuilder()
                .setLockMechanism(proxy.lockMechanism)
                .setClaimInfo(ByteString.copyFrom(proxy.claimInfo))
                .build()
    }
}
