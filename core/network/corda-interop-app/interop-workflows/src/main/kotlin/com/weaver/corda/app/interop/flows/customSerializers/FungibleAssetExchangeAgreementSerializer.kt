/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows.customSerializers

import com.google.protobuf.ByteString
import com.weaver.protos.common.asset_locks.AssetLocks
import net.corda.core.serialization.SerializationCustomSerializer

class FungibleAssetExchangeAgreementSerializer: SerializationCustomSerializer<AssetLocks.FungibleAssetExchangeAgreement, FungibleAssetExchangeAgreementSerializer.Proxy> {

    /**
     * The Proxy class is a serializable counterpart of the AssetLocks.FungibleAssetExchangeAgreement class.
     */
    data class Proxy(
        val assetType: String,
        val numUnits: Long,
        val locker: String,
        val recipient: String
    )

    /**
     * The function toProxy describes how the Query class should be converted to a Proxy
     * class so that it can be serialized and transferred across the wire.
     */
    override fun toProxy(obj: AssetLocks.FungibleAssetExchangeAgreement) = Proxy(
            assetType = obj.assetType,
            numUnits = obj.numUnits,
            locker = obj.locker,
            recipient = obj.recipient
    )

    /** The function fromProxy describes how the Proxy class should be converted back to a
     * Query class when it is received from across the wire.
     */
    override fun fromProxy(proxy: Proxy) : AssetLocks.FungibleAssetExchangeAgreement {
        return AssetLocks.FungibleAssetExchangeAgreement.newBuilder()
                .setAssetType(proxy.assetType)
                .setNumUnits(proxy.numUnits)
                .setLocker(proxy.locker)
                .setRecipient(proxy.recipient)
                .build()
    }
}