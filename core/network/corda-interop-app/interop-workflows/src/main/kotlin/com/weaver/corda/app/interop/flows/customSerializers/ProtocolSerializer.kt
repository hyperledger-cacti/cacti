/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows.customSerializers

import com.weaver.protos.common.state.State.Meta.Protocol
import net.corda.core.serialization.CordaSerializable
import net.corda.core.serialization.SerializationCustomSerializer

/**
 * The ProtocolSerializer class defines how the Protocol class generated from the proto files
 * should be serialized and deserialized in order to be passed across the wire.
 *
 * This is necessary because the instances of the generated classes from the proto files
 * need to be created using a Builder instead of a public constructor. Therefore, it is
 * not possible to merely include these classes on the [CustomSerializationWhitelist] as
 * is possible with other classes.
 *
 * The ProtocolSerializer has a Proxy class with a public constructor that can be serialized,
 * and two methods, toProxy and fromProxy that describe how the Protocol class should be
 * converted to a Proxy class to be passed across the wire, and then from a Proxy class
 * back to a Protocol class on the receiving end.
 *
 */class ProtocolSerializer : SerializationCustomSerializer<Protocol, ProtocolSerializer.Proxy> {

    /**
     * The ProxyProtocol enum is a serializable counterpart of the Protocol enum defined in the
     * State proto file.
     */
    @CordaSerializable
    enum class ProxyProtocol {
        BITCOIN, ETHEREUM, FABRIC, CORDA, UNRECOGNIZED
    }

    /**
     * The Proxy class is a serializable counterpart of the Protocol class.
     */
    data class Proxy(val protocol: ProxyProtocol)

    /**
     * The function toProxy describes how the Protocol class should be converted to a Proxy
     * class so that it can be serialized and transferred across the wire.
     */
    override fun fromProxy(proxy: Proxy): Protocol {
       return when(proxy.protocol) {
           ProxyProtocol.BITCOIN -> Protocol.BITCOIN
           ProxyProtocol.ETHEREUM -> Protocol.ETHEREUM
           ProxyProtocol.FABRIC -> Protocol.FABRIC
           ProxyProtocol.CORDA -> Protocol.CORDA
           else -> Protocol.UNRECOGNIZED
       }
    }

    /** The function fromProxy describes how the Proxy class should be converted back to a
     * Protocol class when it is received from across the wire.
     */
    override fun toProxy(obj: Protocol): Proxy {
        return when(obj) {
            Protocol.BITCOIN -> Proxy(ProxyProtocol.BITCOIN)
            Protocol.ETHEREUM -> Proxy(ProxyProtocol.ETHEREUM)
            Protocol.FABRIC -> Proxy(ProxyProtocol.FABRIC)
            Protocol.CORDA -> Proxy(ProxyProtocol.CORDA)
            else -> Proxy(ProxyProtocol.UNRECOGNIZED)
        }
    }
}