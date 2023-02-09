/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows.customSerializers

import com.google.protobuf.ByteString
import com.weaver.protos.common.asset_locks.AssetLocks
import net.corda.core.serialization.CordaSerializable
import net.corda.core.serialization.SerializationCustomSerializer

class TimeSpecSerializer : SerializationCustomSerializer<AssetLocks.TimeSpec, TimeSpecSerializer.Proxy> {

   /**
    * The ProxyTimeSpec enum is a serializable counterpart of the TimeSpec enum defined in the
    * State proto file.
    */
   @CordaSerializable
   enum class ProxyTimeSpec {
       EPOCH, DURATION, UNRECOGNIZED
   }

   /**
    * The Proxy class is a serializable counterpart of the TimeSpec class.
    */
   data class Proxy(val timeSpec: ProxyTimeSpec)

   /**
    * The function toProxy describes how the TimeSpec class should be converted to a Proxy
    * class so that it can be serialized and transferred across the wire.
    */
   override fun fromProxy(proxy: Proxy): AssetLocks.TimeSpec {
      return when(proxy.timeSpec) {
          ProxyTimeSpec.EPOCH -> AssetLocks.TimeSpec.EPOCH
          ProxyTimeSpec.DURATION -> AssetLocks.TimeSpec.DURATION
          else -> AssetLocks.TimeSpec.UNRECOGNIZED
      }
   }

   /** The function fromProxy describes how the Proxy class should be converted back to a
    * TimeSpec class when it is received from across the wire.
    */
   override fun toProxy(obj: AssetLocks.TimeSpec): Proxy {
       return when(obj) {
           AssetLocks.TimeSpec.EPOCH -> Proxy(ProxyTimeSpec.EPOCH)
           AssetLocks.TimeSpec.DURATION -> Proxy(ProxyTimeSpec.DURATION)
           else -> Proxy(ProxyTimeSpec.UNRECOGNIZED)
       }
   }
}