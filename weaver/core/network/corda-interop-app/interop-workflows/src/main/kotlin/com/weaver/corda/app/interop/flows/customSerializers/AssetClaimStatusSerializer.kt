/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows.customSerializers

import com.google.protobuf.ByteString
import com.weaver.protos.common.asset_transfer.AssetTransfer
import net.corda.core.serialization.SerializationCustomSerializer

class AssetClaimStatusSerializer: SerializationCustomSerializer<AssetTransfer.AssetClaimStatus, AssetClaimStatusSerializer.Proxy> {

    /**
     * The Proxy class is a serializable counterpart of the AssetTransfer.AssetClaimStatus class.
     */
    data class Proxy(
        val assetDetails: ByteArray,
        val localNetworkID: String,
        val remoteNetworkID: String,
        val recipient: String,
        val claimStatus: Boolean,
        val expiryTimeSecs: Long,
        val expirationStatus: Boolean
    )

    /**
     * The function toProxy describes how the Query class should be converted to a Proxy
     * class so that it can be serialized and transferred across the wire.
     */
    override fun toProxy(obj: AssetTransfer.AssetClaimStatus) = Proxy(
            assetDetails = obj.assetDetails.toByteArray(),
            localNetworkID = obj.localNetworkID,
            remoteNetworkID = obj.remoteNetworkID,
            recipient = obj.recipient,
            claimStatus = obj.claimStatus,
            expiryTimeSecs = obj.expiryTimeSecs,
            expirationStatus = obj.expirationStatus
    )

    /** The function fromProxy describes how the Proxy class should be converted back to a
     * Query class when it is received from across the wire.
     */
    override fun fromProxy(proxy: Proxy) : AssetTransfer.AssetClaimStatus {
        return AssetTransfer.AssetClaimStatus.newBuilder()
                .setAssetDetails(ByteString.copyFrom(proxy.assetDetails))
                .setLocalNetworkID(proxy.localNetworkID)
                .setRemoteNetworkID(proxy.remoteNetworkID)
                .setRecipient(proxy.recipient)
                .setClaimStatus(proxy.claimStatus)
                .setExpiryTimeSecs(proxy.expiryTimeSecs)
                .setExpirationStatus(proxy.expirationStatus)
                .build()
    }
}