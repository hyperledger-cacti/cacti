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
import co.paralleluniverse.fibers.Suspendable
import java.io.ByteArrayInputStream
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.util.Base64

/**
 * The parseAddress function takes the address field of a Query sent from an external network at parses it into its
 * local, securityDomain and view segments.
 *
 * @param address The address string passed as a part of a Query.
 * @return Returns an Either with an Error if the address was not properly formed, or an instance of [Address].
 */
fun parseAddress(address: String): Either<Error, Address> = try {
    // The address has the form <location-segment>/<network-name>/<view-segment>.
    // Split the address into location, securityDomain, and view segments.
    val segments = address.split("/")
    if (segments.size != 3) {
        println("Error parsing address. Should consist of a location segment, network name and view segment.\n")
        Left(Error("Parse Error: Address should consist of a location segment, network name and view segment, separated by '/'."))
    } else {
       Right(Address(segments[0].split(";"), segments[1], segments[2]))
    }
} catch(e: Exception) {
    println("Parse Error: Failed to parse address: ${e.message}\n")
    Left(Error("Parse Error: Failed to parse address: ${e.message}"))
}

/**
 * The parseViewAddress function is used to create a [CordaViewAddress] class from the address
 * query string provided by the requesting network.
 *
 * @param address The address string provided by the requesting network.
 * @return The parsed [CordaViewAddress] class containing the node addresses, flow name and flow args.
 */
fun parseCordaViewAddress(address: String): Either<Error, CordaViewAddress> {
    try {
        // The viewSegment contains the address to the view in the Corda ledger. It has the form 'party-a-address;party-b-address#FlowName:flowArg1:flowArg2'.

        // First parse the address into its location, securityDomain and view address segments.
        return parseAddress(address).flatMap {
            // Split the view segment into its components
            val viewSegment = it.viewSegment.split("#")
            if (viewSegment.size != 2) {
                println("Parse Error: View segment should have format 'party-a-address;party-b-address#FlowName:flowArg1:flowArg2'.\n")
                Left(Error("Parse Error: View segment should have format 'party-a-address;party-b-address#FlowName:flowArg1:flowArg2'."))
            } else {
                val nodeAddresses: List<RpcAddress> = viewSegment[0].split(";").map {
                    RpcAddress(
                        it.split(":")[0],
                        it.split(":").getOrNull(1)?.toInt()
                                ?: return@flatMap Left(Error("The view segment must include a host and port separated by ':'."))
                    )
                }
                val flowInfo = viewSegment[1].split(":")
                val flowName = flowInfo.first()
                val flowArgs = flowInfo.drop(1)
                Right(CordaViewAddress(nodeAddresses, flowName, flowArgs))
            }
        }
    } catch (e: Exception) {
        println("Parse Error: Error parsing the address: $address.\n")
        return Left(Error("Parse Error: Error parsing view address: ${e.message}"))
    }
}

/**
 * The parseFabricViewAddress function is used to create a [FabricViewAddress]
 * class from the view address string provided by the requesting network.
 *
 * Note that only the viewSegment of the address should be provided to this function.
 *
 * @param viewAddress The view address string provided by the requesting
 * network.
 * @return The parsed [FabricViewAddress] class containing the channelId,
 * chaincodeId, chaincodeFn and chaincodeArgs
 */
fun parseFabricViewAddress(viewAddress: String): Either<Error, FabricViewAddress> = try {
    val segments = viewAddress.split(":")
    if (segments.size < 3) {
        println("Parse Error: Fabric view address requires channelId, chaincodeId, chaincodeFn separated by ':'\n")
        Left(Error("Parse Error: Fabric view address requires channelId, chaincodeId, chaincodeFn separated by ':'\n"))
    } else {
        Right(FabricViewAddress(
                channelId = segments[0],
                chaincodeId = segments[1],
                chaincodeFn = segments[2],
                chaincodeArgs = if (segments.size > 3) { segments.subList(3, segments.size) } else { listOf() }
        ))
    }
} catch (e: Exception) {
    println("Parse Error: Error parsing Fabric view address: ${e.message}\n")
    Left(Error("Parse Error: Error parsing Fabric view address: ${e.message}\n"))
}

/**
 * The convertCertificateToBase64Pem function takes a certificate encoded as a Base64 ByteArray
 * and converts it to a Base64-encoded string.
 *
 * It converts the certificate from the format provided by the FlowLogic property
 * ourIdentityAndCert.certificate.encoded to a PEM string that is used commonly throughout the
 * interoperability protocol.
 *
 * @param certificateByteArray The Base64 ByteArray certificate.
 * @return Returns the certificate string in PEM format with begin and end tags and line breaks every 64 characters.
 */
fun convertCertificateToBase64Pem(certificateByteArray: ByteArray) : String {
    val certificateWithLineBreaks = Base64.getMimeEncoder(64, "\n".toByteArray())
            .encodeToString(certificateByteArray)
    return "-----BEGIN CERTIFICATE-----\n$certificateWithLineBreaks\n-----END CERTIFICATE-----"
}

/**
 * The getCertificateFromString function takes a string representation of an X509 certificate
 * in PEM format, and generates a X509 Certificate instance of it.
 *
 * @param certificateString The string representation of an X509 certificate in PEM format.
 * @return Returns an Either with the X509 Certificate if it was generated successfully, or
 * an Error.
 */
fun getCertificateFromString(certificateString: String) : Either<Error, X509Certificate> = try {
    val certificateFactory = CertificateFactory.getInstance("X.509")
    Right(certificateFactory.generateCertificate(ByteArrayInputStream(
            Base64.getDecoder().decode(
                    certificateString.replace("\\n".toRegex(), "")
                            .removePrefix("-----BEGIN CERTIFICATE-----")
                            .removeSuffix("-----END CERTIFICATE-----")
                            .toByteArray())
    )) as X509Certificate)
} catch (e: Exception) {
    println("Parse Error: failed to parse requester certificate: ${e.message}.\n")
    Left(Error("Parse Error: failed to parse requester certificate: ${e.message}"))
}

/**
 * The validPatternString function checks whether an address pattern is a valid one.
 * A valid pattern may only contain at most one star and the star must be at the end
 * of the pattern, as defined in the rfc's
 *
 * @param pattern The pattern to be validated
 * @return Returns a boolean of whether the pattern is valid
 */
fun validPatternString(pattern: String) : Boolean {
    // count number of stars in pattern
    val numStars = pattern.sumBy { c -> if (c == '*') 1 else 0 }

    // check if 0 or 1 stars
    if (numStars <= 1) {
        // if 0 stars, return true, if 1 star, make sure its at the end
        return numStars == 0 || pattern.endsWith('*')
    }

    return false
}

/**
 * The isPatternAndAddressMatch function checks whether an address pattern matches an address
 *
 * @param pattern The pattern to be validated
 * @param address The address to be checked against the pattern
 * @return Returns a boolean of whether the pattern and address match
 */
fun isPatternAndAddressMatch(pattern: String, address: String) : Boolean {
    // make sure the pattern is valid
    if (!validPatternString(pattern)) {
        return false
    }

    // count number of stars in pattern
    val numStars = pattern.sumBy { c -> if (c == '*') 1 else 0 }

    // if 0 stars and exact match, return true
    return if (numStars == 0 && pattern == address) {
        true
        // if 1 star and pattern is a substring of address, return true
    } else numStars == 1 && address.contains(pattern.removeSuffix("*"))
}