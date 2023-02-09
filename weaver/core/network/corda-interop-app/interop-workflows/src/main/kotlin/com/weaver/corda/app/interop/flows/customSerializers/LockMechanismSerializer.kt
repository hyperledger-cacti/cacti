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

class LockMechanismSerializer : SerializationCustomSerializer<AssetLocks.LockMechanism, LockMechanismSerializer.Proxy> {

   /**
    * The ProxyLockMechanism enum is a serializable counterpart of the LockMechanism enum defined in the
    * State proto file.
    */
   @CordaSerializable
   enum class ProxyLockMechanism {
       HTLC, UNRECOGNIZED
   }

   /**
    * The Proxy class is a serializable counterpart of the LockMechanism class.
    */
   data class Proxy(val lockMechanism: ProxyLockMechanism)

   /**
    * The function toProxy describes how the LockMechanism class should be converted to a Proxy
    * class so that it can be serialized and transferred across the wire.
    */
   override fun fromProxy(proxy: Proxy): AssetLocks.LockMechanism {
      return when(proxy.lockMechanism) {
          ProxyLockMechanism.HTLC -> AssetLocks.LockMechanism.HTLC
          else -> AssetLocks.LockMechanism.UNRECOGNIZED
      }
   }

   /** The function fromProxy describes how the Proxy class should be converted back to a
    * LockMechanism class when it is received from across the wire.
    */
   override fun toProxy(obj: AssetLocks.LockMechanism): Proxy {
       return when(obj) {
           AssetLocks.LockMechanism.HTLC -> Proxy(ProxyLockMechanism.HTLC)
           else -> Proxy(ProxyLockMechanism.UNRECOGNIZED)
       }
   }
}