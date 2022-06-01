/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.states.customSerializers

import com.google.protobuf.ByteString
import com.weaver.protos.common.asset_locks.AssetLocks
import net.corda.core.serialization.CordaSerializable
import net.corda.core.serialization.SerializationCustomSerializer

class HashMechanismSerializer : SerializationCustomSerializer<AssetLocks.HashMechanism, HashMechanismSerializer.Proxy> {

   /**
    * The ProxyHashMechanism enum is a serializable counterpart of the HashMechanism enum defined in the
    * State proto file.
    */
   @CordaSerializable
   enum class ProxyHashMechanism {
       SHA256, SHA512, UNRECOGNIZED
   }

   /**
    * The Proxy class is a serializable counterpart of the HashMechanism class.
    */
   data class Proxy(val lockMechanism: ProxyHashMechanism)

   /**
    * The function toProxy describes how the HashMechanism class should be converted to a Proxy
    * class so that it can be serialized and transferred across the wire.
    */
   override fun fromProxy(proxy: Proxy): AssetLocks.HashMechanism {
      return when(proxy.lockMechanism) {
          ProxyHashMechanism.SHA256 -> AssetLocks.HashMechanism.SHA256
          ProxyHashMechanism.SHA512 -> AssetLocks.HashMechanism.SHA512
          else -> AssetLocks.HashMechanism.UNRECOGNIZED
      }
   }

   /** The function fromProxy describes how the Proxy class should be converted back to a
    * HashMechanism class when it is received from across the wire.
    */
   override fun toProxy(obj: AssetLocks.HashMechanism): Proxy {
       return when(obj) {
           AssetLocks.HashMechanism.SHA256 -> Proxy(ProxyHashMechanism.SHA256)
           AssetLocks.HashMechanism.SHA512 -> Proxy(ProxyHashMechanism.SHA512)
           else -> Proxy(ProxyHashMechanism.UNRECOGNIZED)
       }
   }
}