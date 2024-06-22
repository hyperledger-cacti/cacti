package org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl

import net.corda.core.crypto.keys
import net.corda.core.node.NodeInfo
import net.corda.core.utilities.toBase58String
import net.corda.nodeapi.internal.config.toConfig

// org.bouncycastle.math.ec.custom.sec.SecP256R1Curve["infinity"]

/**
 * We need this to avoid the serialization exception of the Corda Network map in Corda v4.12 where without this, the
 * Jackson serialization of the network map will crash with the following error:
 *
 * ```sh
 * com.fasterxml.jackson.databind.JsonMappingException:
 * Document nesting depth (1001) exceeds the maximum allowed (1000, from `StreamWriteConstraints.getMaxNestingDepth()`)
 * (through reference chain:
 * net.corda.core.node.NodeInfo["legalIdentitiesAndCerts"]
 * ->java.util.Collections$UnmodifiableRandomAccessList[0]
 * ->net.corda.core.identity.PartyAndCertificate["certPath"]
 * ->sun.security.provider.certpath.X509CertPath["certificates"]
 * ->java.util.Collections$UnmodifiableRandomAccessList[1]
 * ->sun.security.x509.X509CertImpl["publicKey"]
 * ->org.bouncycastle.jcajce.provider.asymmetric.ec.BCECPublicKey["parameters"]
 * ->org.bouncycastle.jce.spec.ECNamedCurveParameterSpec["curve"]
 * ->org.bouncycastle.math.ec.custom.sec.SecP256R1Curve["infinity"]
 * ->org.bouncycastle.math.ec.custom.sec.SecP256R1Point["curve"]
 * ->org.bouncycastle.math.ec.custom.sec.SecP256R1Curve["infinity"]
 * ->org.bouncycastle.math.ec.custom.sec.SecP256R1Point["curve"]
 * ...
 * ```
 *
 */
class CordaNetworkMapSnapshotJsonSerializer(private val data: List<NodeInfo>) {
    fun asListOfMaps(): List<Map<String, Any>> {
        return data.map { nodeInfo -> asMap(nodeInfo) };
    }

    private fun asMap(ni: NodeInfo): Map<String, Any> {
        ni.legalIdentitiesAndCerts
        return mapOf(
                "legalIdentitiesAndCerts" to ni.legalIdentitiesAndCerts.map { pac ->
                    mapOf(
                            "name" to pac.name,
                            "certificate" to pac.certificate,
                            "party" to pac.party,
                            "owningKey" to pac.owningKey,
                            "certPath" to mapOf(
                                    "type" to pac.certPath.type,
                                    "certificates" to pac.certPath.certificates.map { c ->
                                        mapOf(
                                                "type" to c.type,
                                                "publicKey" to mapOf(
                                                        "algorithm" to c.publicKey.algorithm,
                                                        "format" to c.publicKey.format,
                                                        "toBase58String" to c.publicKey.toBase58String(),
                                                        "keys" to c.publicKey.keys.map { k ->
                                                            mapOf(
                                                                    "algorithm" to k.algorithm,
                                                                    "format" to k.format,
                                                                    "toBase58String" to k.toBase58String()
                                                            )
                                                        }
                                                ),
                                        )
                                    }
                            )
                    )
                },
                "serial" to ni.serial,
                "legalIdentities" to ni.legalIdentities,
                "addresses" to ni.addresses,
                "platformVersion" to ni.platformVersion,
        );
    }
}