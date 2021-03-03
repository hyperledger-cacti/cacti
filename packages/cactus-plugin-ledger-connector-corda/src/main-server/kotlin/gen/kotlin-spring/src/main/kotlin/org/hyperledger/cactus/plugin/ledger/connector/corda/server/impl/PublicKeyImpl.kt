package org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl

import java.security.PublicKey
import java.util.*

data class PublicKeyImpl(
    private val _algorithm: String,
    private val _format: String,
    private val _base64Value: String
) : PublicKey {

    private var _byteArray: ByteArray = Base64.getDecoder().decode(_base64Value);

    override fun getAlgorithm(): String {
        return _algorithm
    }

    override fun getFormat(): String {
        return _format
    }

    override fun getEncoded(): ByteArray {
        return _byteArray
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as PublicKeyImpl

        if (_algorithm != other._algorithm) return false
        if (_format != other._format) return false
        if (!_byteArray.contentEquals(other._byteArray)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = _algorithm.hashCode()
        result = 31 * result + _format.hashCode()
        result = 31 * result + _byteArray.contentHashCode()
        return result
    }
}
