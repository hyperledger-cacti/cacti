/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows

import arrow.core.Either
import arrow.core.Left
import arrow.core.Right
import arrow.core.flatMap
import com.google.protobuf.ByteString
import net.corda.core.crypto.Crypto
import net.corda.core.flows.FlowLogic
import net.corda.core.serialization.CordaSerializable
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.util.Base64
import javax.xml.bind.DatatypeConverter

/**
 * The CreateNodeSignatureFlow is used to sign data as a Corda node. The signature is provided as a
 * Base64 encoded string.
 *
 * @property data The data as a string to be signed.
 */
class CreateNodeSignatureFlow(val data: ByteArray): FlowLogic<Either<Error, String>>() {

    /**
     * The call() method runs the flow logic. For this flow, this involves converting the data to a ByteArray,
     * signing the data, and then converting the resulting hexadecimal string signature into a Base64-encoded
     * string.
     *
     * @return returns an Either with an Error or the signature as a Base64-encoded string.
     */
    override fun call(): Either<Error, String> = try {
        // Create the signature for the request and remove square brackets
        // NOTE: This sign also hashes the data
        val signatureHexString = serviceHub.keyManagementService.sign(data, ourIdentity.owningKey)
                .toString()
        // Remove square brackets around the signature then convert to Base64 byte array
        val signatureWithoutBrackets = signatureHexString.substring(1, signatureHexString.length - 1)
        val signatureBase64ByteArray = DatatypeConverter.parseHexBinary(signatureWithoutBrackets)
        println(Base64.getEncoder().encodeToString(signatureBase64ByteArray))
        Right(Base64.getEncoder().encodeToString(signatureBase64ByteArray))
    } catch (e: Exception) {
        println("Error signing data: ${e.message}")
        Left(Error("Error signing data: ${e.message}"))
    }
}

/**
 * The verifyNodeSignature function is used to verify signatures.
 *
 * @param certificate The certificate of the entity that provided the signature.
 * @param signature The signature to be verified, provided as a Base64 encoded string.
 * @param data The data the signature was created over, provided as a Base64 encoded string.
 */
fun verifyNodeSignature(
        certificate: String,
        signature: String,
        data: ByteArray) : Either<Error, Boolean> = try {
    println("Validating signature.")
    // TODO: This shouldn't need to be base64 encoded
    val signatureBytes = Base64.getDecoder().decode(signature)

    getCertificateFromString(certificate).flatMap {
        // Signature verification using the isValid method from Corda's Crypto library. Throws an
        // exception if the signature scheme could not be identified and returns false if signature is invalid.
        // NOTE: This isValid call also hashes the data before it performing validation
        if (Crypto.isValid(it.publicKey, signatureBytes, data)) {
            println("Signature for ${it.subjectX500Principal.name} is valid.\n")
            Right(true)
        } else {
            println("Signature verification failed for ${it.subjectX500Principal.name}\n")
            Left(Error("Signature Verification Error for certificate for ${it.subjectX500Principal}"))
        }
    }
} catch (e: Exception) {
    println("Verification Error: Error verifying signature: ${e.message}.\n")
    Left(Error("Verification Error: Error verifying signature: ${e.message}"))
}
