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

    val b64FabricView = "CjIIAxIYMjAyMi0wOC0wNFQxODo1ODo1MS40MTNaGgxOb3Rhcml6YXRpb24iBlNUUklORxKVGgrHBwjIARrBBwoIQXJjdHVydXMSOXJlbGF5LW5ldHdvcmsxOjkwODAvbmV0d29yazEvbXljaGFubmVsOnNpbXBsZXN0YXRlOlJlYWQ6YSLTBi0tLS0tQkVHSU4gQ0VSVElGSUNBVEUtLS0tLQpNSUlDUnpDQ0FlMmdBd0lCQWdJVUpqWlFQbFA2UlhZditYZkxJNjZnQko0ZHhtSXdDZ1lJS29aSXpqMEVBd0l3CmFERUxNQWtHQTFVRUJoTUNWVk14RnpBVkJnTlZCQWdURGs1dmNuUm9JRU5oY205c2FXNWhNUlF3RWdZRFZRUUsKRXd0SWVYQmxjbXhsWkdkbGNqRVBNQTBHQTFVRUN4TUdSbUZpY21sak1Sa3dGd1lEVlFRREV4Qm1ZV0p5YVdNdApZMkV0YzJWeWRtVnlNQjRYRFRJeU1EZ3dOREU0TWpnd01Gb1hEVE15TURnd05EQTJNek13TUZvd0lURVBNQTBHCkExVUVDeE1HWTJ4cFpXNTBNUTR3REFZRFZRUURFd1YxYzJWeU1UQlpNQk1HQnlxR1NNNDlBZ0VHQ0NxR1NNNDkKQXdFSEEwSUFCRU9VTUR3UE9PTGpzMlVHdkloV2lNTHV3QytHb0ROVjJuejZzdDlHenVhMmgwMU04bzk1SWlvNgptemRsbjlMNHBabS8ySHpNbkJveVBLcnJqWVJtY2lhamdic3dnYmd3RGdZRFZSMFBBUUgvQkFRREFnZUFNQXdHCkExVWRFd0VCL3dRQ01BQXdIUVlEVlIwT0JCWUVGQ0NZWk1oaC9GSU9XNnprQkJCSU53Qm9iZHBETUI4R0ExVWQKSXdRWU1CYUFGT0U0MXdFZkJnSGYrY2ZqUXpheUUvUThwbTJiTUZnR0NDb0RCQVVHQndnQkJFeDdJbUYwZEhKegpJanA3SW1obUxrRm1abWxzYVdGMGFXOXVJam9pSWl3aWFHWXVSVzV5YjJ4c2JXVnVkRWxFSWpvaWRYTmxjakVpCkxDSm9aaTVVZVhCbElqb2lZMnhwWlc1MEluMTlNQW9HQ0NxR1NNNDlCQU1DQTBnQU1FVUNJUUR5VXZOWHQ2bk0KbDAvN0cvb0pqZUJ5d3NRZUw0SVUyUURCU21pN1prMW9PUUlnSWtRdHNnK2R1SE9XQ1g2MHpVRVRoWGVac2c5VQpkUUhGWFZuY0xCV1FoTGs9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0KKiQwMDVkMDg2Yy1iYjc0LTRkZDctOWM1My0wYjkyYTAzNmMxNTAanAoKIMJ+2a8Uja1yb9fSYl8ChORWohrjHGeEbcqPvbbeTteBEvcJCpwCEmYKCl9saWZlY3ljbGUSWAooCiJuYW1lc3BhY2VzL2ZpZWxkcy9pbnRlcm9wL1NlcXVlbmNlEgIIBgosCiZuYW1lc3BhY2VzL2ZpZWxkcy9zaW1wbGVzdGF0ZS9TZXF1ZW5jZRICCAMSfgoHaW50ZXJvcBJzCh4KGABhY2Nlc3NDb250cm9sAG5ldHdvcmsyABICCBcKGwoVAG1lbWJlcnNoaXAAbmV0d29yazIAEgIIGQoWChAA9I+/v2luaXRpYWxpemVkEgIIBwocChZlMmVDb25maWRlbnRpYWxpdHlGbGFnEgIIBxIyCgtzaW1wbGVzdGF0ZRIjChYKEAD0j7+/aW5pdGlhbGl6ZWQSAggECgkKAWESBAgJEAYaxwcIyAEawQcKCEFyY3R1cnVzEjlyZWxheS1uZXR3b3JrMTo5MDgwL25ldHdvcmsxL215Y2hhbm5lbDpzaW1wbGVzdGF0ZTpSZWFkOmEi0wYtLS0tLUJFR0lOIENFUlRJRklDQVRFLS0tLS0KTUlJQ1J6Q0NBZTJnQXdJQkFnSVVKalpRUGxQNlJYWXYrWGZMSTY2Z0JKNGR4bUl3Q2dZSUtvWkl6ajBFQXdJdwphREVMTUFrR0ExVUVCaE1DVlZNeEZ6QVZCZ05WQkFnVERrNXZjblJvSUVOaGNtOXNhVzVoTVJRd0VnWURWUVFLCkV3dEllWEJsY214bFpHZGxjakVQTUEwR0ExVUVDeE1HUm1GaWNtbGpNUmt3RndZRFZRUURFeEJtWVdKeWFXTXQKWTJFdGMyVnlkbVZ5TUI0WERUSXlNRGd3TkRFNE1qZ3dNRm9YRFRNeU1EZ3dOREEyTXpNd01Gb3dJVEVQTUEwRwpBMVVFQ3hNR1kyeHBaVzUwTVE0d0RBWURWUVFERXdWMWMyVnlNVEJaTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5CkF3RUhBMElBQkVPVU1Ed1BPT0xqczJVR3ZJaFdpTUx1d0MrR29ETlYybno2c3Q5R3p1YTJoMDFNOG85NUlpbzYKbXpkbG45TDRwWm0vMkh6TW5Cb3lQS3JyallSbWNpYWpnYnN3Z2Jnd0RnWURWUjBQQVFIL0JBUURBZ2VBTUF3RwpBMVVkRXdFQi93UUNNQUF3SFFZRFZSME9CQllFRkNDWVpNaGgvRklPVzZ6a0JCQklOd0JvYmRwRE1COEdBMVVkCkl3UVlNQmFBRk9FNDF3RWZCZ0hmK2NmalF6YXlFL1E4cG0yYk1GZ0dDQ29EQkFVR0J3Z0JCRXg3SW1GMGRISnoKSWpwN0ltaG1Ma0ZtWm1sc2FXRjBhVzl1SWpvaUlpd2lhR1l1Ulc1eWIyeHNiV1Z1ZEVsRUlqb2lkWE5sY2pFaQpMQ0pvWmk1VWVYQmxJam9pWTJ4cFpXNTBJbjE5TUFvR0NDcUdTTTQ5QkFNQ0EwZ0FNRVVDSVFEeVV2Tlh0Nm5NCmwwLzdHL29KamVCeXdzUWVMNElVMlFEQlNtaTdaazFvT1FJZ0lrUXRzZytkdUhPV0NYNjB6VUVUaFhlWnNnOVUKZFFIRlhWbmNMQldRaExrPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCiokMDA1ZDA4NmMtYmI3NC00ZGQ3LTljNTMtMGI5MmEwMzZjMTUwIgwSB2ludGVyb3AaATEiqQgK3QcKB09yZzFNU1AS0QctLS0tLUJFR0lOIENFUlRJRklDQVRFLS0tLS0KTUlJQ296Q0NBa21nQXdJQkFnSVVFQ2QzSnNnWHBVRTJ3TWc1NVAxdi9EWnpvaXd3Q2dZSUtvWkl6ajBFQXdJdwphREVMTUFrR0ExVUVCaE1DVlZNeEZ6QVZCZ05WQkFnVERrNXZjblJvSUVOaGNtOXNhVzVoTVJRd0VnWURWUVFLCkV3dEllWEJsY214bFpHZGxjakVQTUEwR0ExVUVDeE1HUm1GaWNtbGpNUmt3RndZRFZRUURFeEJtWVdKeWFXTXQKWTJFdGMyVnlkbVZ5TUI0WERUSXlNRGd3TkRFNE1qSXdNRm9YRFRNeU1EZ3dOREEyTWpjd01Gb3dXekVMTUFrRwpBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRS0V3dEllWEJsCmNteGxaR2RsY2pFTk1Bc0dBMVVFQ3hNRWNHVmxjakVPTUF3R0ExVUVBeE1GY0dWbGNqQXdXVEFUQmdjcWhrak8KUFFJQkJnZ3Foa2pPUFFNQkJ3TkNBQVJpTlc0YXhVUWw4WS81NjFoYVU3eFkzUTk2OTM0QkgwMnAyOE9RZFM0awprUmdOb1JwMWIrS0d6MGNJSXZnRFROaENJcmswTFF6bmFYZkhZaTErK01HZG80SGRNSUhhTUE0R0ExVWREd0VCCi93UUVBd0lIZ0RBTUJnTlZIUk1CQWY4RUFqQUFNQjBHQTFVZERnUVdCQlJkQ2hKRnhEVHFSVG5TTm1tamJWbm8KUnBkcVR6QWZCZ05WSFNNRUdEQVdnQlRPeHd6SG9ZaDVmRy9ka0VqRGVFTlJRZXlWUHpBaUJnTlZIUkVFR3pBWgpnaGR3WldWeU1DNXZjbWN4TG01bGRIZHZjbXN4TG1OdmJUQldCZ2dxQXdRRkJnY0lBUVJLZXlKaGRIUnljeUk2CmV5Sm9aaTVCWm1acGJHbGhkR2x2YmlJNklpSXNJbWhtTGtWdWNtOXNiRzFsYm5SSlJDSTZJbkJsWlhJd0lpd2kKYUdZdVZIbHdaU0k2SW5CbFpYSWlmWDB3Q2dZSUtvWkl6ajBFQXdJRFNBQXdSUUloQU9ra0tUMFpoYm9oMTZONQpOcjFpU2hYa085RkZrRmF3U3VCLzA2cUZzSXhLQWlCZ3d0YWhwTTliNjJqbFIrbnFsaHg2eTJDQnUrUzFYRkpuCkwwTzZoVVVMQ3c9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tChJHMEUCIQD7ubwSdS/lUNt1m+0P7HgsdVsinZJkZXzAkNzQm/jMVQIgA3QCOcbkotaKtY/t+ntyYS3jaX/1X71Bwv9xxtRoj6I="

    val fabricCert = "-----BEGIN CERTIFICATE-----\nMIICFjCCAb2gAwIBAgIUYxHjCF1HdZexrgAM73ec4jdHy8owCgYIKoZIzj0EAwIw\naDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMRQwEgYDVQQK\nEwtIeXBlcmxlZGdlcjEPMA0GA1UECxMGRmFicmljMRkwFwYDVQQDExBmYWJyaWMt\nY2Etc2VydmVyMB4XDTIyMDgwNDE4MjIwMFoXDTM3MDczMTE4MjIwMFowaDELMAkG\nA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMRQwEgYDVQQKEwtIeXBl\ncmxlZGdlcjEPMA0GA1UECxMGRmFicmljMRkwFwYDVQQDExBmYWJyaWMtY2Etc2Vy\ndmVyMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE76ubZH/VHJszsYLHVKaUwKBR\nUZv8P+Jq6Op5PeBf02JUKPM15DSF9n56RJq+7mrM9zBzPvBsUySFd+rr/BrsW6NF\nMEMwDgYDVR0PAQH/BAQDAgEGMBIGA1UdEwEB/wQIMAYBAf8CAQEwHQYDVR0OBBYE\nFM7HDMehiHl8b92QSMN4Q1FB7JU/MAoGCCqGSM49BAMCA0cAMEQCIH4UJq+qY2OP\n7DzBAwY7woYuy4zoT2kxyiexlix38aY4AiAo+8OKE1wFM+XKLUqI4zzgq2bpg1qb\nU5aIsTpdz3N2tg==\n-----END CERTIFICATE-----\n"

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
