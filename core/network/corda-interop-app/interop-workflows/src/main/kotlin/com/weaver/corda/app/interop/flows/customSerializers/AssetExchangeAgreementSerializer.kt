/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows.customSerializers

import com.google.protobuf.ByteString
import com.weaver.protos.common.asset_locks.AssetLocks
import net.corda.core.serialization.SerializationCustomSerializer

class AssetExchangeAgreementSerializer: SerializationCustomSerializer<AssetLocks.AssetExchangeAgreement, AssetExchangeAgreementSerializer.Proxy> {

    /**
     * The Proxy class is a serializable counterpart of the AssetLocks.AssetExchangeAgreement class.
     */
    data class Proxy(
        val assetType: String,
        val id: String,
        val locker: String,
        val recipient: String
    )

    /**
     * The function toProxy describes how the Query class should be converted to a Proxy
     * class so that it can be serialized and transferred across the wire.
     */
    override fun toProxy(obj: AssetLocks.AssetExchangeAgreement) = Proxy(
            assetType = obj.assetType,
            id = obj.id,
            locker = obj.locker,
            recipient = obj.recipient
    )

    /** The function fromProxy describes how the Proxy class should be converted back to a
     * Query class when it is received from across the wire.
     */
    override fun fromProxy(proxy: Proxy) : AssetLocks.AssetExchangeAgreement {
        return AssetLocks.AssetExchangeAgreement.newBuilder()
                .setAssetType(proxy.assetType)
                .setId(proxy.id)
                .setLocker(proxy.locker)
                .setRecipient(proxy.recipient)
                .build()
    }
}