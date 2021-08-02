/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows.customSerializers

import com.google.protobuf.ByteString
import com.weaver.protos.common.state.State
import net.corda.core.serialization.SerializationCustomSerializer

class ViewSerializer: SerializationCustomSerializer<State.View, ViewSerializer.Proxy> {

    /**
     * The Proxy class is a serializable counterpart of the Query class.
     */
    data class Proxy(
            val meta: State.Meta,
            val data: ByteArray)

    /**
     * The function toProxy describes how the Query class should be converted to a Proxy
     * class so that it can be serialized and transferred across the wire.
     */
    override fun toProxy(obj: State.View) = Proxy(
            meta = obj.meta,
            data = obj.data.toByteArray())

    /** The function fromProxy describes how the Proxy class should be converted back to a
     * Query class when it is received from across the wire.
     */
    override fun fromProxy(proxy: Proxy) : State.View {
        return State.View.newBuilder()
                .setMeta(proxy.meta)
                .setData(ByteString.copyFrom(proxy.data))
                .build()
    }
}
