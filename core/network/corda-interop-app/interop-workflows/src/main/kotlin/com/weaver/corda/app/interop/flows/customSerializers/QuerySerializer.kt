/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows.customSerializers

import com.weaver.protos.common.query.QueryOuterClass.Query
import net.corda.core.serialization.SerializationCustomSerializer

/**
 * The QuerySerializer class defines how the Query class generated from the proto files
 * should be serialized and deserialized in order to be passed across the wire.
 *
 * This is necessary because the instances of the generated classes from the proto files
 * need to be created using a Builder instead of a public constructor. Therefore, it is
 * not possible to merely include these classes on the [CustomSerializationWhitelist] as
 * is possible with other classes.
 *
 * The QuerySerializer has a Proxy class with a public constructor that can be serialized,
 * and two methods, toProxy and fromProxy that describe how the Query class should be
 * converted to a Proxy class to be passed across the wire, and then from a Proxy class
 * back to a Query class on the receiving end.
 *
 */
class QuerySerializer: SerializationCustomSerializer<Query, QuerySerializer.Proxy> {

    /**
     * The Proxy class is a serializable counterpart of the Query class.
     */
    data class Proxy(
            val policy: List<String>,
            val address: String,
            val requestingRelay: String,
            val requestingNetwork: String,
            val certificate: String,
            val requestorSignature: String,
            val nonce: String,
            val requestId: String,
            val requestingOrg: String)

    /**
     * The function toProxy describes how the Query class should be converted to a Proxy
     * class so that it can be serialized and transferred across the wire.
     */
    override fun toProxy(obj: Query) = Proxy(
            policy = obj.policyList,
            address = obj.address,
            requestingRelay = obj.requestingRelay,
            requestingNetwork =  obj.requestingNetwork,
            certificate = obj.certificate,
            requestorSignature = obj.requestorSignature,
            nonce = obj.nonce,
            requestId = obj.requestId,
            requestingOrg = obj.requestingOrg)

    /** The function fromProxy describes how the Proxy class should be converted back to a
     * Query class when it is received from across the wire.
    */
    override fun fromProxy(proxy: Proxy) : Query {
        return Query.newBuilder()
                .addAllPolicy(proxy.policy)
                .setAddress(proxy.address)
                .setRequestingRelay(proxy.requestingRelay)
                .setRequestingNetwork(proxy.requestingNetwork)
                .setCertificate(proxy.certificate)
                .setRequestorSignature(proxy.requestorSignature)
                .setNonce(proxy.nonce)
                .setRequestId(proxy.requestId)
                .setRequestingOrg(proxy.requestingOrg)
                .build()
    }
}
