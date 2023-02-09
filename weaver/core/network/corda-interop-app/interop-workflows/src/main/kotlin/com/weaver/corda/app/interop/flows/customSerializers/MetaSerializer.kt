/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows.customSerializers

import com.weaver.protos.common.state.State.Meta
import com.weaver.protos.common.state.State.Meta.Protocol
import net.corda.core.serialization.SerializationCustomSerializer

/**
 * The MetaSerializer class defines how the Meta class generated from the proto files
 * should be serialized and deserialized in order to be passed across the wire.
 *
 * This is necessary because the instances of the generated classes from the proto files
 * need to be created using a Builder instead of a public constructor. Therefore, it is
 * not possible to merely include these classes on the [CustomSerializationWhitelist] as
 * is possible with other classes.
 *
 * The MetaSerializer has a Proxy class with a public constructor that can be serialized,
 * and two methods, toProxy and fromProxy that describe how the Meta class should be
 * converted to a Proxy class to be passed across the wire, and then from a Proxy class
 * back to a Meta class on the receiving end.
 *
 */
class MetaSerializer : SerializationCustomSerializer<Meta, MetaSerializer.Proxy> {

    /**
     * The Proxy class is a serializable counterpart of the Meta class.
     */
    data class Proxy(
            val protocol: Protocol,
            val timestamp: String,
            val proofType: String,
            val serializationFormat: String)

    /**
     * The function toProxy describes how the Meta class should be converted to a Proxy
     * class so that it can be serialized and transferred across the wire.
     */
    override fun fromProxy(proxy: Proxy): Meta {
        return Meta.newBuilder()
                .setProtocol(proxy.protocol)
                .setTimestamp(proxy.timestamp)
                .setProofType(proxy.proofType)
                .setSerializationFormat(proxy.serializationFormat)
                .build()
    }

    /** The function fromProxy describes how the Proxy class should be converted back to a
     * Meta class when it is received from across the wire.
     */
    override fun toProxy(obj: Meta): Proxy {
       return Proxy(obj.protocol, obj.timestamp, obj.proofType, obj.serializationFormat)
    }
}
