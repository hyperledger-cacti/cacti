/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows.customSerializers

import com.google.protobuf.ByteString
import com.weaver.protos.common.asset_transfer.AssetTransfer
import net.corda.core.serialization.SerializationCustomSerializer

class AssetPledgeSerializer: SerializationCustomSerializer<AssetTransfer.AssetPledge, AssetPledgeSerializer.Proxy> {

    /**
     * The Proxy class is a serializable counterpart of the AssetTransfer.AssetPledge class.
     */
    data class Proxy(
        val assetDetails: ByteArray,
        val localNetworkID: String,
        val remoteNetworkID: String,
        val recipient: String,
        val expiryTimeSecs: Long
    )

    /**
     * The function toProxy describes how the Query class should be converted to a Proxy
     * class so that it can be serialized and transferred across the wire.
     */
    override fun toProxy(obj: AssetTransfer.AssetPledge) = Proxy(
            assetDetails = obj.assetDetails.toByteArray(),
            localNetworkID = obj.localNetworkID,
            remoteNetworkID = obj.remoteNetworkID,
            recipient = obj.recipient,
            expiryTimeSecs = obj.expiryTimeSecs
    )

    /** The function fromProxy describes how the Proxy class should be converted back to a
     * Query class when it is received from across the wire.
     */
    override fun fromProxy(proxy: Proxy) : AssetTransfer.AssetPledge {
        return AssetTransfer.AssetPledge.newBuilder()
                .setAssetDetails(ByteString.copyFrom(proxy.assetDetails))
                .setLocalNetworkID(proxy.localNetworkID)
                .setRemoteNetworkID(proxy.remoteNetworkID)
                .setRecipient(proxy.recipient)
                .setExpiryTimeSecs(proxy.expiryTimeSecs)
                .build()
    }
}