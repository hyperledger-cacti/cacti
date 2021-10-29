/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop

import com.weaver.corda.app.interop.flows.*
import com.weaver.corda.app.interop.states.*
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

class WriteExternalStateTest {
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
    
    val fabricNetwork = "network1"
    val fabricRelayEndpoint = "relay-network1:9080"
    val fabricViewAddress = "mychannel:simplestate:Read:a"

    val b64FabricView = "CjIIAxIYMjAyMS0wOC0wOVQxMToxOToxNC41OTJaGgxOb3Rhcml6YXRpb24iBlNUUklORxKBDApKCMgBGkUKCEFyY3R1cnVzEjlyZWxheS1uZXR3b3JrMTo5MDgwL25ldHdvcmsxL215Y2hhbm5lbDpzaW1wbGVzdGF0ZTpSZWFkOmEaigMKIFDt2MRSUeTYAeOVPLZH7N+xPQ+ayZ2KwTWB2AlSLsXsEuUCCogCEmYKCl9saWZlY3ljbGUSWAooCiJuYW1lc3BhY2VzL2ZpZWxkcy9pbnRlcm9wL1NlcXVlbmNlEgIIBgosCiZuYW1lc3BhY2VzL2ZpZWxkcy9zaW1wbGVzdGF0ZS9TZXF1ZW5jZRICCAMSagoHaW50ZXJvcBJfCiMKHQBhY2Nlc3NDb250cm9sAENvcmRhX05ldHdvcmsAEgIICwogChoAbWVtYmVyc2hpcABDb3JkYV9OZXR3b3JrABICCA0KFgoQAPSPv79pbml0aWFsaXplZBICCAcSMgoLc2ltcGxlc3RhdGUSIwoWChAA9I+/v2luaXRpYWxpemVkEgIIBAoJCgFhEgQICRABGkoIyAEaRQoIQXJjdHVydXMSOXJlbGF5LW5ldHdvcmsxOjkwODAvbmV0d29yazEvbXljaGFubmVsOnNpbXBsZXN0YXRlOlJlYWQ6YSIMEgdpbnRlcm9wGgExIqUICtkHCgdPcmcxTVNQEs0HLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNvakNDQWttZ0F3SUJBZ0lVTWN4Y1FNWENUcThpVmlCZFUrRFNidTVjM2Rzd0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEl4TURjek1EQTFORGN3TUZvWERUSXlNRGN6TURBMU5USXdNRm93V3pFTE1Ba0cKQTFVRUJoTUNWVk14RnpBVkJnTlZCQWdURGs1dmNuUm9JRU5oY205c2FXNWhNUlF3RWdZRFZRUUtFd3RJZVhCbApjbXhsWkdkbGNqRU5NQXNHQTFVRUN4TUVjR1ZsY2pFT01Bd0dBMVVFQXhNRmNHVmxjakF3V1RBVEJnY3Foa2pPClBRSUJCZ2dxaGtqT1BRTUJCd05DQUFUWk1uU1hRbyswcWhxTW5yYmxROTRsaExsdW9BeUxsMUQ1K2JPTkRmRXYKUU9IVU9HKy9XL0pqOUV1M1UwTCtNZTRzd1c1M3ZGYmJHNGtWLzZYQzFZMlFvNEhkTUlIYU1BNEdBMVVkRHdFQgovd1FFQXdJSGdEQU1CZ05WSFJNQkFmOEVBakFBTUIwR0ExVWREZ1FXQkJSZXp2K3cyM1F3aWFYcGVYSUhBVGovCmJRSjByakFmQmdOVkhTTUVHREFXZ0JSeWh2V0Mramd2T3N1UlNGNmFyWHUyemwwZy9EQWlCZ05WSFJFRUd6QVoKZ2hkd1pXVnlNQzV2Y21jeExtNWxkSGR2Y21zeExtTnZiVEJXQmdncUF3UUZCZ2NJQVFSS2V5SmhkSFJ5Y3lJNgpleUpvWmk1QlptWnBiR2xoZEdsdmJpSTZJaUlzSW1obUxrVnVjbTlzYkcxbGJuUkpSQ0k2SW5CbFpYSXdJaXdpCmFHWXVWSGx3WlNJNkluQmxaWElpZlgwd0NnWUlLb1pJemowRUF3SURSd0F3UkFJZ09yVmZvbmJCOHh2RU8zYjcKbk1OOHdMK3VhNVV2RmVoSnlHS0RISFN0YURZQ0lHNURWdE42Wm03Q0J0dG1xQlJ6dWt5UzBpZ2p6cE9NMXNxTwpTZS94QS94eAotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tChJHMEUCIQCwTtxvaQhZmLWuBXJFtI0RUaBOxBB5O2ItCjekFUyMUwIgTrOPxQ/PSKDsj+mJTLfEcrK5+f80sqQoQFJr+qBLy2k="

    val fabricCert = "-----BEGIN CERTIFICATE-----\nMIICFjCCAb2gAwIBAgIUYyc2soSqUtWVHTOtud7D1FbCHp0wCgYIKoZIzj0EAwIw\naDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMRQwEgYDVQQK\nEwtIeXBlcmxlZGdlcjEPMA0GA1UECxMGRmFicmljMRkwFwYDVQQDExBmYWJyaWMt\nY2Etc2VydmVyMB4XDTIxMDczMDA1NDYwMFoXDTM2MDcyNjA1NDYwMFowaDELMAkG\nA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMRQwEgYDVQQKEwtIeXBl\ncmxlZGdlcjEPMA0GA1UECxMGRmFicmljMRkwFwYDVQQDExBmYWJyaWMtY2Etc2Vy\ndmVyMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEM/GelSlifY6+rMOE3G95SXF+\ndTHpG8j5cYK82EVCaLCSvNlCKgpupuQnbkLy+V6dgf9tKSnEsZgiHeB6AyJK/6NF\nMEMwDgYDVR0PAQH/BAQDAgEGMBIGA1UdEwEB/wQIMAYBAf8CAQEwHQYDVR0OBBYE\nFHKG9YL6OC86y5FIXpqte7bOXSD8MAoGCCqGSM49BAMCA0cAMEQCIA9iMqQ/aJiC\na++ft4tN7io83jB17/fzG3BRC9soRR3bAiALgWNYk5118DKTkhFdJVQ0VIoopEtq\nGzi+/j4j7fu/wQ==\n-----END CERTIFICATE-----\n"

    val fabricVerificationPolicy = VerificationPolicyState(
            securityDomain = fabricNetwork,
            identifiers = listOf(Identifier(
                    fabricViewAddress,
                    Policy("signature", listOf("Org1MSP"))
            ))
    )

    val fabricMembership = MembershipState(
            securityDomain = fabricNetwork,
            members = mapOf("Org1MSP" to Member(
                    value = fabricCert,
                    type = "ca",
                    chain = listOf("")
            ))
    )

    val cordaB64View = "CjQIBBIcVHVlIE5vdiAxNyAwMDoxMzo0NiBHTVQgMjAyMBoMTm90YXJpemF0aW9uIgRKU09OEtYHCoQGClhhMjZHVW9WYythenlIMENUYjN2K2pTdmp3Y255M0hFd3AyMlJrdDkvZC9GcXN4WVVvYXhVWTdUOWNKRk9TVTZiVW42UFIwNmFVckxxdjZLbzZ1NG5CUT09Ep8FLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJ3akNDQVYrZ0F3SUJBZ0lJVUprUXZtS20zNVl3RkFZSUtvWkl6ajBFQXdJR0NDcUdTTTQ5QXdFSE1DOHgKQ3pBSkJnTlZCQVlUQWtkQ01ROHdEUVlEVlFRSERBWk1iMjVrYjI0eER6QU5CZ05WQkFvTUJsQmhjblI1UVRBZQpGdzB5TURBM01qUXdNREF3TURCYUZ3MHlOekExTWpBd01EQXdNREJhTUM4eEN6QUpCZ05WQkFZVEFrZENNUTh3CkRRWURWUVFIREFaTWIyNWtiMjR4RHpBTkJnTlZCQW9NQmxCaGNuUjVRVEFxTUFVR0F5dGxjQU1oQU1NS2FSRUsKaGNUZ1NCTU16Szgxb1BVU1BvVm1HL2ZKTUxYcS91alNtc2U5bzRHSk1JR0dNQjBHQTFVZERnUVdCQlJNWHREcwpLRlp6VUxkUTNjMkRDVUV4M1QxQ1VEQVBCZ05WSFJNQkFmOEVCVEFEQVFIL01Bc0dBMVVkRHdRRUF3SUNoREFUCkJnTlZIU1VFRERBS0JnZ3JCZ0VGQlFjREFqQWZCZ05WSFNNRUdEQVdnQlI0aHdMdUxnZklaTUVXekc0bjNBeHcKZmdQYmV6QVJCZ29yQmdFRUFZT0tZZ0VCQkFNQ0FRWXdGQVlJS29aSXpqMEVBd0lHQ0NxR1NNNDlBd0VIQTBjQQpNRVFDSUM3SjQ2U3hERHozTGpETnJFUGpqd1AycHJnTUVNaDdyL2dKcG91UUhCaytBaUErS3pYRDBkNW1pSTg2CkQybVlLNEMzdFJsaTNYM1ZnbkNlOENPcWZZeXVRZz09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0aBlBhcnR5QRLMAQpsW1NpbXBsZVN0YXRlKGtleT1ILCB2YWx1ZT0xLCBvd25lcj1PPVBhcnR5QSwgTD1Mb25kb24sIEM9R0IsIGxpbmVhcklkPTIzMTRkNmI3LTFlY2EtNDg5Mi04OGY4LTc2ZDg1YjhhODVjZCldElxsb2NhbGhvc3Q6OTA4MC9Db3JkYV9OZXR3b3JrL2xvY2FsaG9zdDoxMDAwNiNjb20uY29yZGFTaW1wbGVBcHBsaWNhdGlvbi5mbG93LkdldFN0YXRlQnlLZXk6SA=="

    val cordaVerificationPolicy = VerificationPolicyState(
            securityDomain = "Corda_Network",
            identifiers = listOf(Identifier(
                    "localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:*",
                    Policy("signature", listOf("PartyA"))
            ))
    )

    val certChain = listOf(
            "-----BEGIN CERTIFICATE-----\nMIICCTCCAbCgAwIBAgIIcFe0qctqSucwCgYIKoZIzj0EAwIwWDEbMBkGA1UEAwwS\nQ29yZGEgTm9kZSBSb290IENBMQswCQYDVQQKDAJSMzEOMAwGA1UECwwFY29yZGEx\nDzANBgNVBAcMBkxvbmRvbjELMAkGA1UEBhMCVUswHhcNMTcwNTIyMDAwMDAwWhcN\nMjcwNTIwMDAwMDAwWjBYMRswGQYDVQQDDBJDb3JkYSBOb2RlIFJvb3QgQ0ExCzAJ\nBgNVBAoMAlIzMQ4wDAYDVQQLDAVjb3JkYTEPMA0GA1UEBwwGTG9uZG9uMQswCQYD\nVQQGEwJVSzBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABGlm6LFHrVkzfuUHin36\nJrm1aUMarX/NUZXw8n8gSiJmsZPlUEplJ+f/lzZMky5EZPTtCciG34pnOP0eiMd/\nJTCjZDBiMB0GA1UdDgQWBBR8rqnfuUgBKxOJC5rmRYUcORcHczALBgNVHQ8EBAMC\nAYYwIwYDVR0lBBwwGgYIKwYBBQUHAwEGCCsGAQUFBwMCBgRVHSUAMA8GA1UdEwEB\n/wQFMAMBAf8wCgYIKoZIzj0EAwIDRwAwRAIgDaL4SguKsNeTT7SeUkFdoCBACeG8\nGqO4M1KlfimphQwCICiq00hDanT5W8bTLqE7GIGuplf/O8AABlpWrUg6uiUB\n-----END CERTIFICATE-----",
            "-----BEGIN CERTIFICATE-----\nMIICXjCCAfugAwIBAgIIHVb6wd3RHhIwFAYIKoZIzj0EAwIGCCqGSM49AwEHMFgx\nGzAZBgNVBAMMEkNvcmRhIE5vZGUgUm9vdCBDQTELMAkGA1UECgwCUjMxDjAMBgNV\nBAsMBWNvcmRhMQ8wDQYDVQQHDAZMb25kb24xCzAJBgNVBAYTAlVLMB4XDTE4MDcx\nMDAwMDAwMFoXDTI3MDUyMDAwMDAwMFowYzELMAkGA1UEBhMCVVMxETAPBgNVBAcT\nCE5ldyBZb3JrMQ4wDAYDVQQLEwVDb3JkYTEWMBQGA1UEChMNUjMgSG9sZENvIExM\nQzEZMBcGA1UEAxMQQ29yZGEgRG9vcm1hbiBDQTBZMBMGByqGSM49AgEGCCqGSM49\nAwEHA0IABAPL3qAm4WZms5ciBVoxMQXfK7uTmHRVvWfWQ+QVYP3bMHSguHZRzB3v\n7EOE8RZpGDan+w007Xj7XR0+xG9SxmCjgZkwgZYwHQYDVR0OBBYEFOvuLjAVKUCu\nGZge2G/jfX8HosITMA8GA1UdEwEB/wQFMAMBAf8wCwYDVR0PBAQDAgGGMCMGA1Ud\nJQQcMBoGCCsGAQUFBwMBBggrBgEFBQcDAgYEVR0lADAfBgNVHSMEGDAWgBR8rqnf\nuUgBKxOJC5rmRYUcORcHczARBgorBgEEAYOKYgEBBAMCAQEwFAYIKoZIzj0EAwIG\nCCqGSM49AwEHA0cAMEQCIBmzQXpnCo9eAxkhwMt0bBr1Q0APJXF0KuBRsFBWAa6S\nAiBgx6G8G9Ij7B8+y65ItLKVcs7Kh6Rdnr5/1zB/yPwfrg==\n-----END CERTIFICATE-----",
            "-----BEGIN CERTIFICATE-----\nMIICbTCCAgmgAwIBAgIIYRljUiZaGSkwFAYIKoZIzj0EAwIGCCqGSM49AwEHMGMx\nCzAJBgNVBAYTAlVTMREwDwYDVQQHEwhOZXcgWW9yazEOMAwGA1UECxMFQ29yZGEx\nFjAUBgNVBAoTDVIzIEhvbGRDbyBMTEMxGTAXBgNVBAMTEENvcmRhIERvb3JtYW4g\nQ0EwHhcNMjAwNzI0MDAwMDAwWhcNMjcwNTIwMDAwMDAwWjAvMQswCQYDVQQGEwJH\nQjEPMA0GA1UEBwwGTG9uZG9uMQ8wDQYDVQQKDAZQYXJ0eUEwWTATBgcqhkjOPQIB\nBggqhkjOPQMBBwNCAASFze6k3tINqGLsKTi0a50RpOUCysno1/1lwIfEqaboauuj\no6Ecfu8X1WnW92VrEZGKslIJzR8R0deOEJvBs0rzo4HQMIHNMB0GA1UdDgQWBBR4\nhwLuLgfIZMEWzG4n3AxwfgPbezAPBgNVHRMBAf8EBTADAQH/MAsGA1UdDwQEAwIB\nhjATBgNVHSUEDDAKBggrBgEFBQcDAjAfBgNVHSMEGDAWgBTr7i4wFSlArhmYHthv\n431/B6LCEzARBgorBgEEAYOKYgEBBAMCAQQwRQYDVR0eAQH/BDswOaA1MDOkMTAv\nMQswCQYDVQQGEwJHQjEPMA0GA1UEBwwGTG9uZG9uMQ8wDQYDVQQKDAZQYXJ0eUGh\nADAUBggqhkjOPQQDAgYIKoZIzj0DAQcDSAAwRQIhANXBVAebUsY9AMfjZedNYN14\nWy76Ru5vMSta3Av1d08lAiAi2GZWk5XwJoEYuhQHXsHQLZbXphAVk+Q5tVgMgywj\ntQ==\n-----END CERTIFICATE-----")
            
    val cordaMembership = MembershipState(
            securityDomain = "Corda_Network",
            members = mapOf("PartyA" to Member(
                    value = "",
                    type = "certificate",
                    chain = certChain
            ))
    )

    @Test
    fun `WriteExternalState tests`() {
        // Corda happy case
        // Create corda membership and verificationPolicy in vault
        val future = partyA.startFlow(CreateVerificationPolicyState(cordaVerificationPolicy))
        network.runNetwork()
        val linearId = future.getOrThrow()
        assert(linearId.isRight()) { "CreateVerificationPolicyState should return a Right(UniqueIdentifier)" }

        val future2 = partyA.startFlow(CreateMembershipState(cordaMembership))
        network.runNetwork()
        val linearId2 = future2.getOrThrow()
        assert(linearId2.isRight()) { "CreateMembershipState should return a Right(UniqueIdentifier)" }

        val happyFuture = partyA.startFlow(WriteExternalStateInitiator(cordaB64View, "localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H"))
        network.runNetwork()
        val happyLinearId = happyFuture.getOrThrow()
        assertTrue(happyLinearId.isRight())

        // Fabric happy case
        // Create fabric membership and verificationPolicy in vault
        val future3 = partyA.startFlow(CreateVerificationPolicyState(fabricVerificationPolicy))
        network.runNetwork()
        val linearId3 = future3.getOrThrow()
        assert(linearId3.isRight()) { "CreateVerificationPolicyState should return a Right(UniqueIdentifier)" }

        val future4 = partyA.startFlow(CreateMembershipState(fabricMembership))
        network.runNetwork()
        val linearId4 = future4.getOrThrow()
        assert(linearId4.isRight()) { "CreateMembershipState should return a Right(UniqueIdentifier)" }

        val happyFuture2 = partyA.startFlow(WriteExternalStateInitiator(b64FabricView, "${fabricRelayEndpoint}/${fabricNetwork}/${fabricViewAddress}"))
        network.runNetwork()
        val happyLinearId2 = happyFuture2.getOrThrow()
        assertTrue(happyLinearId2.isRight())

        // Test case: Invalid cert in Membership
        val invalidMembership = cordaMembership.copy(members = mapOf(("PartyA" to Member(
                value = "invalid_cert",
                type = "ca",
                chain = listOf("")
        ))))
        val future5 = partyA.startFlow(UpdateMembershipState(invalidMembership))
        network.runNetwork()
        val linearId5 = future5.getOrThrow()
        assert(linearId5.isRight()) { "UpdateMembershipState should return a Right(UniqueIdentifier)" }

        val unhappyFuture = partyA.startFlow(WriteExternalStateInitiator(cordaB64View, "localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H"))
        network.runNetwork()
        val unhappyLinearId = unhappyFuture.getOrThrow()
        assertTrue(unhappyLinearId.isLeft())
        assertEquals("Parse Error: failed to parse requester certificate: Illegal base64 character 5f", unhappyLinearId.fold({ it.message }, { "" }))


        // Test case: Invalid policy in verification policy


    }
}