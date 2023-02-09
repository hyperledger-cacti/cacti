/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop

import arrow.core.Left
import arrow.core.identity
import com.weaver.corda.app.interop.flows.CreateNodeSignatureFlow
import com.weaver.corda.app.interop.flows.CreateAccessControlPolicy
import com.weaver.corda.app.interop.flows.CreateMembershipState
import com.weaver.corda.app.interop.flows.HandleExternalRequest
import com.weaver.corda.app.interop.states.AccessControlPolicyState
import com.weaver.corda.app.interop.states.Member
import com.weaver.corda.app.interop.states.MembershipState
import com.weaver.corda.app.interop.states.Rule
import com.weaver.protos.common.query.QueryOuterClass
import net.corda.core.utilities.getOrThrow
import net.corda.testing.node.MockNetwork
import net.corda.testing.node.MockNetworkParameters
import net.corda.testing.node.StartedMockNode
import net.corda.testing.node.TestCordapp
import org.junit.AfterClass
import org.junit.BeforeClass
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class HandleExternalRequestTests {
    companion object {
        lateinit var network: MockNetwork
        lateinit var partyA: StartedMockNode

        @BeforeClass
        @JvmStatic
        fun setup() {
            network = MockNetwork(MockNetworkParameters(cordappsForAllNodes = listOf(
                    TestCordapp.findCordapp("com.weaver.corda.app.interop.contracts"),
                    TestCordapp.findCordapp("com.weaver.corda.app.interop.flows")
            )))
            partyA = network.createPartyNode()
            network.runNetwork()
        }

        @AfterClass
        @JvmStatic
        fun tearDown() {
            network.stopNodes()
            System.setProperty("net.corda.node.dbtransactionsresolver.InMemoryResolutionLimit", "0")
        }
    }

    val cert = "-----BEGIN CERTIFICATE-----\nMIIBwjCCAV+gAwIBAgIIUJkQvmKm35YwFAYIKoZIzj0EAwIGCCqGSM49AwEHMC8x\nCzAJBgNVBAYTAkdCMQ8wDQYDVQQHDAZMb25kb24xDzANBgNVBAoMBlBhcnR5QTAe\nFw0yMDA3MjQwMDAwMDBaFw0yNzA1MjAwMDAwMDBaMC8xCzAJBgNVBAYTAkdCMQ8w\nDQYDVQQHDAZMb25kb24xDzANBgNVBAoMBlBhcnR5QTAqMAUGAytlcAMhAMMKaREK\nhcTgSBMMzK81oPUSPoVmG/fJMLXq/ujSmse9o4GJMIGGMB0GA1UdDgQWBBRMXtDs\nKFZzULdQ3c2DCUEx3T1CUDAPBgNVHRMBAf8EBTADAQH/MAsGA1UdDwQEAwIChDAT\nBgNVHSUEDDAKBggrBgEFBQcDAjAfBgNVHSMEGDAWgBR4hwLuLgfIZMEWzG4n3Axw\nfgPbezARBgorBgEEAYOKYgEBBAMCAQYwFAYIKoZIzj0EAwIGCCqGSM49AwEHA0cA\nMEQCIC7J46SxDDz3LjDNrEPjjwP2prgMEMh7r/gJpouQHBk+AiA+KzXD0d5miI86\nD2mYK4C3tRli3X3VgnCe8COqfYyuQg==\n-----END CERTIFICATE-----"

    val query = QueryOuterClass.Query.newBuilder()
            .addAllPolicy(listOf())
            .setAddress("localhost:9080/Corda_Network/localhost:10006#com.weaver.corda.app.interop.flows.QueryState")
            .setRequestingRelay("")
            .setRequestingNetwork("Corda_Network")
            .setCertificate(cert)
            .setRequestorSignature("yOwu/27WufivBV8j4DsKVDUI5o760ezwgYg/Zl1B6f6i8gqGuNbO/w8QIyFTO2Rt4v5ri7fbTzL8bHc9KQRUBg==")
            .setNonce("830fee2e-41ff-41b3-9534-7fcb3a0aae72")
            .setRequestId("")
            .setRequestingOrg("PartyA")
            .build()

    val certChain = listOf(
            "-----BEGIN CERTIFICATE-----\nMIICCTCCAbCgAwIBAgIIcFe0qctqSucwCgYIKoZIzj0EAwIwWDEbMBkGA1UEAwwS\nQ29yZGEgTm9kZSBSb290IENBMQswCQYDVQQKDAJSMzEOMAwGA1UECwwFY29yZGEx\nDzANBgNVBAcMBkxvbmRvbjELMAkGA1UEBhMCVUswHhcNMTcwNTIyMDAwMDAwWhcN\nMjcwNTIwMDAwMDAwWjBYMRswGQYDVQQDDBJDb3JkYSBOb2RlIFJvb3QgQ0ExCzAJ\nBgNVBAoMAlIzMQ4wDAYDVQQLDAVjb3JkYTEPMA0GA1UEBwwGTG9uZG9uMQswCQYD\nVQQGEwJVSzBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABGlm6LFHrVkzfuUHin36\nJrm1aUMarX/NUZXw8n8gSiJmsZPlUEplJ+f/lzZMky5EZPTtCciG34pnOP0eiMd/\nJTCjZDBiMB0GA1UdDgQWBBR8rqnfuUgBKxOJC5rmRYUcORcHczALBgNVHQ8EBAMC\nAYYwIwYDVR0lBBwwGgYIKwYBBQUHAwEGCCsGAQUFBwMCBgRVHSUAMA8GA1UdEwEB\n/wQFMAMBAf8wCgYIKoZIzj0EAwIDRwAwRAIgDaL4SguKsNeTT7SeUkFdoCBACeG8\nGqO4M1KlfimphQwCICiq00hDanT5W8bTLqE7GIGuplf/O8AABlpWrUg6uiUB\n-----END CERTIFICATE-----",
            "-----BEGIN CERTIFICATE-----\nMIICXjCCAfugAwIBAgIIHVb6wd3RHhIwFAYIKoZIzj0EAwIGCCqGSM49AwEHMFgx\nGzAZBgNVBAMMEkNvcmRhIE5vZGUgUm9vdCBDQTELMAkGA1UECgwCUjMxDjAMBgNV\nBAsMBWNvcmRhMQ8wDQYDVQQHDAZMb25kb24xCzAJBgNVBAYTAlVLMB4XDTE4MDcx\nMDAwMDAwMFoXDTI3MDUyMDAwMDAwMFowYzELMAkGA1UEBhMCVVMxETAPBgNVBAcT\nCE5ldyBZb3JrMQ4wDAYDVQQLEwVDb3JkYTEWMBQGA1UEChMNUjMgSG9sZENvIExM\nQzEZMBcGA1UEAxMQQ29yZGEgRG9vcm1hbiBDQTBZMBMGByqGSM49AgEGCCqGSM49\nAwEHA0IABAPL3qAm4WZms5ciBVoxMQXfK7uTmHRVvWfWQ+QVYP3bMHSguHZRzB3v\n7EOE8RZpGDan+w007Xj7XR0+xG9SxmCjgZkwgZYwHQYDVR0OBBYEFOvuLjAVKUCu\nGZge2G/jfX8HosITMA8GA1UdEwEB/wQFMAMBAf8wCwYDVR0PBAQDAgGGMCMGA1Ud\nJQQcMBoGCCsGAQUFBwMBBggrBgEFBQcDAgYEVR0lADAfBgNVHSMEGDAWgBR8rqnf\nuUgBKxOJC5rmRYUcORcHczARBgorBgEEAYOKYgEBBAMCAQEwFAYIKoZIzj0EAwIG\nCCqGSM49AwEHA0cAMEQCIBmzQXpnCo9eAxkhwMt0bBr1Q0APJXF0KuBRsFBWAa6S\nAiBgx6G8G9Ij7B8+y65ItLKVcs7Kh6Rdnr5/1zB/yPwfrg==\n-----END CERTIFICATE-----",
            "-----BEGIN CERTIFICATE-----\nMIICbTCCAgmgAwIBAgIIYRljUiZaGSkwFAYIKoZIzj0EAwIGCCqGSM49AwEHMGMx\nCzAJBgNVBAYTAlVTMREwDwYDVQQHEwhOZXcgWW9yazEOMAwGA1UECxMFQ29yZGEx\nFjAUBgNVBAoTDVIzIEhvbGRDbyBMTEMxGTAXBgNVBAMTEENvcmRhIERvb3JtYW4g\nQ0EwHhcNMjAwNzI0MDAwMDAwWhcNMjcwNTIwMDAwMDAwWjAvMQswCQYDVQQGEwJH\nQjEPMA0GA1UEBwwGTG9uZG9uMQ8wDQYDVQQKDAZQYXJ0eUEwWTATBgcqhkjOPQIB\nBggqhkjOPQMBBwNCAASFze6k3tINqGLsKTi0a50RpOUCysno1/1lwIfEqaboauuj\no6Ecfu8X1WnW92VrEZGKslIJzR8R0deOEJvBs0rzo4HQMIHNMB0GA1UdDgQWBBR4\nhwLuLgfIZMEWzG4n3AxwfgPbezAPBgNVHRMBAf8EBTADAQH/MAsGA1UdDwQEAwIB\nhjATBgNVHSUEDDAKBggrBgEFBQcDAjAfBgNVHSMEGDAWgBTr7i4wFSlArhmYHthv\n431/B6LCEzARBgorBgEEAYOKYgEBBAMCAQQwRQYDVR0eAQH/BDswOaA1MDOkMTAv\nMQswCQYDVQQGEwJHQjEPMA0GA1UEBwwGTG9uZG9uMQ8wDQYDVQQKDAZQYXJ0eUGh\nADAUBggqhkjOPQQDAgYIKoZIzj0DAQcDSAAwRQIhANXBVAebUsY9AMfjZedNYN14\nWy76Ru5vMSta3Av1d08lAiAi2GZWk5XwJoEYuhQHXsHQLZbXphAVk+Q5tVgMgywj\ntQ==\n-----END CERTIFICATE-----")

    val membership = MembershipState(
            securityDomain = "Corda_Network",
            members = mapOf("PartyA" to Member(
                    value = "",
            type = "certificate",
            chain = certChain))
    )

    val accessControlPolicy = AccessControlPolicyState(
            securityDomain = "Corda_Network",
            rules = listOf(
                    Rule(
                            principal = cert,
                            principalType = "certificate",
                            resource = "localhost:10006#com.weaver.corda.app.interop.flows.QueryState",
                            read = true
                    ))
    )

    @Test
    fun `HandleExternalRequest happy case`() {
        
        // Create membership and access control in vault
        val future = partyA.startFlow(CreateAccessControlPolicy(accessControlPolicy))
        network.runNetwork()
        val linearId = future.getOrThrow()
        assert(linearId.isRight()) { "CreateAccessControlPolicy should return a Right(UniqueIdentifier)" }

        val future2 = partyA.startFlow(CreateMembershipState(membership))
        network.runNetwork()
        val linearId2 = future2.getOrThrow()
        assert(linearId2.isRight()) { "CreateMembershipState should return a Right(UniqueIdentifier)" }

        val happyFuture = partyA.startFlow(HandleExternalRequest(query))
        network.runNetwork()
        val happyLinearId = happyFuture.getOrThrow()
        assertTrue(happyLinearId.isRight())
    }

    @Test
    fun `HandleExternalRequest unhappy signature tests`() {
        // Unhappy case where certificate is incorrect
        val invalidCertificateQuery = query.toBuilder().setCertificate("invalidCertificate").build()
        val invalidCertificateFuture = partyA.startFlow(HandleExternalRequest(invalidCertificateQuery))
        network.runNetwork()
        val invalidCertificateError = invalidCertificateFuture.getOrThrow()
        assertTrue(invalidCertificateError.isLeft())
        assertEquals("Parse Error: failed to parse requester certificate: Could not parse certificate: java.io.IOException: Empty input", invalidCertificateError.fold({ it.message }, { "" }))

        // Unhappy case where signature is incorrect
        val invalidSignatureQuery = query.toBuilder().setRequestorSignature("invalidSignature").build()
        val invalidSignatureFuture = partyA.startFlow(HandleExternalRequest(invalidSignatureQuery))
        network.runNetwork()
        val invalidSignatureError = invalidSignatureFuture.getOrThrow()
        assertTrue(invalidSignatureError.isLeft())
        assertEquals("Verification Error: Error verifying signature: signature length is wrong", invalidSignatureError.fold({ it.message }, { "" }))

        // Unhappy case where query address is incorrect
        val invalidAddressQuery = query.toBuilder().setAddress("invalidAddress").build()
        val invalidAddressFuture = partyA.startFlow(HandleExternalRequest(invalidAddressQuery))
        network.runNetwork()
        val invalidAddressError = invalidAddressFuture.getOrThrow()
        assertTrue(invalidAddressError.isLeft())
        assertEquals("Signature Verification Error for certificate for O=PartyA, L=London, C=GB", invalidAddressError.fold({ it.message }, { "" }))

        // Unhappy case where nonce is incorrect
        val invalidNonceQuery = query.toBuilder().setNonce("invalidNonce").build()
        val invalidNonceFuture = partyA.startFlow(HandleExternalRequest(invalidNonceQuery))
        network.runNetwork()
        val invalidNonceError = invalidNonceFuture.getOrThrow()
        assertTrue(invalidNonceError.isLeft())
        assertEquals("Signature Verification Error for certificate for O=PartyA, L=London, C=GB", invalidNonceError.fold({ it.message }, { "" }))
    }

    @Test
    fun `HandleExternalRequest unhappy membership tests`() {
        // Unhappy case where no membership exists for given securityDomain
        val invalidRequestingNetworkQuery = query.toBuilder().setRequestingNetwork("blah").build()
        val noMembershipFuture = partyA.startFlow(HandleExternalRequest(invalidRequestingNetworkQuery))
        network.runNetwork()
        val noMembershipError = noMembershipFuture.getOrThrow()
        assertTrue(noMembershipError.isLeft())
        assertEquals("Membership for securityDomain blah not found", noMembershipError.fold({ it.message }, { "" }))
    }

    @Test
    fun `HandleExternalRequest unhappy access control tests`() {
        // Unhappy case where no access control policy exists
        val membership = MembershipState(
                securityDomain = "Corda_Network2",
                members = mapOf("PartyA" to Member(
                        value = "",
                        type = "certificate",
                        chain = certChain))
        )
        val future = partyA.startFlow(CreateMembershipState(membership))
        network.runNetwork()
        val linearId = future.getOrThrow()
        assert(linearId.isRight()) { "CreateMembershipState should return a Right(UniqueIdentifier)" }

        val requestingNetworkQuery = query.toBuilder().setRequestingNetwork("Corda_Network2").build()
        val noAccessControlPolicyFuture = partyA.startFlow(HandleExternalRequest(requestingNetworkQuery))
        network.runNetwork()
        val noACPError = noAccessControlPolicyFuture.getOrThrow()
        assertTrue(noACPError.isLeft())
        assertEquals("Error verifying access for PartyA for the address: localhost:9080/Corda_Network/localhost:10006#com.weaver.corda.app.interop.flows.QueryState with error: List is empty.", noACPError.fold({ it.message }, { "" }))
    }

    @Test
    fun `HandleExternalRequest unhappy address and flow tests`() {
        
        // Unhappy case where address is invalid

        // Unhappy case where Corda view segment of address is invalid

        // Unhappy case where Corda view contains a flow name that doesn't exist

        // Unhappy case where Corda view contains a flow with wrong number of arguments
    }
}