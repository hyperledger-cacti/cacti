package com.accenture.interoperability.contracts

import net.corda.core.utilities.parseAsHex
import org.bouncycastle.asn1.sec.SECNamedCurves
import org.bouncycastle.crypto.params.ECDomainParameters
import org.bouncycastle.crypto.params.ECPublicKeyParameters
import org.bouncycastle.crypto.signers.ECDSASigner
import org.bouncycastle.jce.provider.BouncyCastleProvider
import java.math.BigInteger
import java.security.MessageDigest
import java.security.Security

/**
 * Utilities for working with external public keys.
 */
object ForeignPubKey {

    private val CURVE: ECDomainParameters

    init {
        Security.addProvider(BouncyCastleProvider())
        try {
            Class.forName("org.bouncycastle.asn1.sec.SECNamedCurves")
        } catch (e: ClassNotFoundException) {
            throw IllegalStateException(
                "BouncyCastle is not available on the classpath, see https://www.bouncycastle.org/latest_releases.html")
        }
        CURVE = with(SECNamedCurves.getByName("secp256k1")) {
            ECDomainParameters(curve, g, n, h)
        }
    }

    private fun bytesFromString(jsonString: String) = (
        if (jsonString.startsWith("0x"))
            jsonString.substring(2)
        else
            jsonString
        ).parseAsHex()

    fun verifyPubKey(jsonString: String): String {
        decodePublicKeyAsPointOnCurve(jsonString)
        return jsonString
    }

    fun decodePublicKeyAsPointOnCurve(jsonString: String) = CURVE.curve
        .decodePoint(
            bytesFromString(jsonString)
        )!!

    private fun bytes32(bytes: ByteArray, offset: Int): ByteArray {
        val bytes32 = ByteArray(32)
        System.arraycopy(bytes, offset, bytes32, 0, 32)
        return bytes32
    }

    fun parse256k1Signature(jsonString: String): Secp256k1Signature {
        val bytes = bytesFromString(jsonString)
        require(bytes.size.let { it == 64 || it == 65 })
        { "Signature must be 64 or 65 bytes, but got ${bytes.size} instead" }

        return Secp256k1Signature(
            v = if (bytes.size == 65) { // Quorum
                // must be 1 or 0 but for Quorum it is 27 or 28
                bytes[64].toInt().let { if (it >= 27) it - 27 else it }
            } else {
                0
            },
            r = BigInteger(1, bytes32(bytes, 0)),
            s = BigInteger(1, bytes32(bytes, 32))
        )
    }

    /**
     * Return a hash of message.
     */
    fun messageHash(message: String): ByteArray =
        with(MessageDigest.getInstance("KECCAK-256", "BC")) {
            update(message.toByteArray())
            val bytes = digest()
            if (bytes.size != 32)
                throw IllegalArgumentException("Expected 32 bytes but got ${bytes.size}")
            return bytes
        }

    /**
     * A SECP256K1 digital signature.
     */
    data class Secp256k1Signature(
        /*
     * Parameter v is the recovery id to reconstruct the public key used to create the signature. It must be in
     * the range 0 to 3 and indicates which of the 4 possible keys is the correct one. Because the key recovery
     * operation yields multiple potential keys, the correct key must either be stored alongside the signature,
     * or you must be willing to try each recovery id in turn until you find one that outputs the key you are
     * expecting.
     */
        // The v-value (recovery id) of the signature.
        val v: Int,
        // The r-value of the signature.
        val r: BigInteger,
        // The s-value of the signature.
        val s: BigInteger
    ) {
        init {
            val n = CURVE.n
            require(v == 0 || v == 1)
            { "Invalid v-value, should be 0 or 1, got $v" }
            require(r >= BigInteger.ONE && r < n)
            { "Invalid r-value, should be >= 1 and < $n, got $r" }
            require(s >= BigInteger.ONE && r < n)
            { "Invalid s-value, should be >= 1 and < $n, got $s" }
        }
    }

    fun verify256k1Signature(hash: ByteArray, signature: String, pubKey: String) =
        verify256k1Signature(hash, parse256k1Signature(signature), pubKey)

    fun verify256k1Signature(hash: ByteArray, signature: Secp256k1Signature, pubKey: String) =
        verify256k1Signature(hash, signature, decodePublicKeyAsPointOnCurve(pubKey).getEncoded(false))

    fun verify256k1Signature(hash: ByteArray, signature: Secp256k1Signature, pointBytes: ByteArray) = try {
        with(ECDSASigner()) {
            init(false, ECPublicKeyParameters(CURVE.curve.decodePoint(pointBytes), CURVE))
            verifySignature(hash, signature.r, signature.s)
        }
    } catch (e: NullPointerException) {
        // Bouncy Castle contains a bug that can cause NPEs given specially crafted signatures. Those signatures
        // are inherently invalid/attack sigs so we just fail them here rather than crash the thread.
        false
    }

}
