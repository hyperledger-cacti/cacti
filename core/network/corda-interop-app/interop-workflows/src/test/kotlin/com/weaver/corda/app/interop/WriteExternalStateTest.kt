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

    val b64FabricView = "CjIIAxIYMjAyMi0wOC0wNFQxMDoyNDo0Ny42MDVaGgxOb3Rhcml6YXRpb24iBlNUUklORxKLGgrFBwjIARq/BwoGMTcuNjcxEjlyZWxheS1uZXR3b3JrMTo5MDgwL25ldHdvcmsxL215Y2hhbm5lbDpzaW1wbGVzdGF0ZTpSZWFkOmEi0wYtLS0tLUJFR0lOIENFUlRJRklDQVRFLS0tLS0KTUlJQ1JqQ0NBZTJnQXdJQkFnSVVSUlJDZGJaNjNpNTlNM3c2OFA1STI1cnoyTEF3Q2dZSUtvWkl6ajBFQXdJdwphREVMTUFrR0ExVUVCaE1DVlZNeEZ6QVZCZ05WQkFnVERrNXZjblJvSUVOaGNtOXNhVzVoTVJRd0VnWURWUVFLCkV3dEllWEJsY214bFpHZGxjakVQTUEwR0ExVUVDeE1HUm1GaWNtbGpNUmt3RndZRFZRUURFeEJtWVdKeWFXTXQKWTJFdGMyVnlkbVZ5TUI0WERUSXlNRGd3TkRBMk5USXdNRm9YRFRJek1EZ3dOREEyTlRjd01Gb3dJVEVQTUEwRwpBMVVFQ3hNR1kyeHBaVzUwTVE0d0RBWURWUVFERXdWMWMyVnlNVEJaTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5CkF3RUhBMElBQk5PZ29SYnJndGZYeHFhL21iQlFObXl4MVBJWExBdWFNV3BxQUl1MUx3MUxNMjh0SnRoT0pxWFUKejZFd0hMR2VMbGJ2U0VUNnhtb1hyZ0l2QkIxWndHNmpnYnN3Z2Jnd0RnWURWUjBQQVFIL0JBUURBZ2VBTUF3RwpBMVVkRXdFQi93UUNNQUF3SFFZRFZSME9CQllFRk1zWFA3QmpNc21mVXVLZnVlVXNyWTc0cFgwR01COEdBMVVkCkl3UVlNQmFBRlB3ZTFMck51STMzVm0rRWRnTy9FL2pKaWhVMU1GZ0dDQ29EQkFVR0J3Z0JCRXg3SW1GMGRISnoKSWpwN0ltaG1Ma0ZtWm1sc2FXRjBhVzl1SWpvaUlpd2lhR1l1Ulc1eWIyeHNiV1Z1ZEVsRUlqb2lkWE5sY2pFaQpMQ0pvWmk1VWVYQmxJam9pWTJ4cFpXNTBJbjE5TUFvR0NDcUdTTTQ5QkFNQ0EwY0FNRVFDSUJCLzY4MVdmQlIrClFXSUdmaVlLT2szSHVSdE84SkZ3YlRpRWpuQWdDUnZuQWlCYTY5d1dZYVoyNVpSK0dheTY5ZVYrdkRaa1BNSFMKZ2RSakFJdGNLR3N0Rmc9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCiokZWE3OWU2NjQtYTJmMi00YzlmLTg2NDMtZTYwNjAwODhmYzlhGpgKCiBVNNh9oMmGr6mjpkClfw32G8jILQMdz9o0hFOMbTk7vRLzCQqaAhJmCgpfbGlmZWN5Y2xlElgKKAoibmFtZXNwYWNlcy9maWVsZHMvaW50ZXJvcC9TZXF1ZW5jZRICCAYKLAombmFtZXNwYWNlcy9maWVsZHMvc2ltcGxlc3RhdGUvU2VxdWVuY2USAggDEn4KB2ludGVyb3AScwoeChgAYWNjZXNzQ29udHJvbABuZXR3b3JrMgASAggUChsKFQBtZW1iZXJzaGlwAG5ldHdvcmsyABICCBYKFgoQAPSPv79pbml0aWFsaXplZBICCAcKHAoWZTJlQ29uZmlkZW50aWFsaXR5RmxhZxICCAcSMAoLc2ltcGxlc3RhdGUSIQoWChAA9I+/v2luaXRpYWxpemVkEgIIBAoHCgFhEgIIGhrFBwjIARq/BwoGMTcuNjcxEjlyZWxheS1uZXR3b3JrMTo5MDgwL25ldHdvcmsxL215Y2hhbm5lbDpzaW1wbGVzdGF0ZTpSZWFkOmEi0wYtLS0tLUJFR0lOIENFUlRJRklDQVRFLS0tLS0KTUlJQ1JqQ0NBZTJnQXdJQkFnSVVSUlJDZGJaNjNpNTlNM3c2OFA1STI1cnoyTEF3Q2dZSUtvWkl6ajBFQXdJdwphREVMTUFrR0ExVUVCaE1DVlZNeEZ6QVZCZ05WQkFnVERrNXZjblJvSUVOaGNtOXNhVzVoTVJRd0VnWURWUVFLCkV3dEllWEJsY214bFpHZGxjakVQTUEwR0ExVUVDeE1HUm1GaWNtbGpNUmt3RndZRFZRUURFeEJtWVdKeWFXTXQKWTJFdGMyVnlkbVZ5TUI0WERUSXlNRGd3TkRBMk5USXdNRm9YRFRJek1EZ3dOREEyTlRjd01Gb3dJVEVQTUEwRwpBMVVFQ3hNR1kyeHBaVzUwTVE0d0RBWURWUVFERXdWMWMyVnlNVEJaTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5CkF3RUhBMElBQk5PZ29SYnJndGZYeHFhL21iQlFObXl4MVBJWExBdWFNV3BxQUl1MUx3MUxNMjh0SnRoT0pxWFUKejZFd0hMR2VMbGJ2U0VUNnhtb1hyZ0l2QkIxWndHNmpnYnN3Z2Jnd0RnWURWUjBQQVFIL0JBUURBZ2VBTUF3RwpBMVVkRXdFQi93UUNNQUF3SFFZRFZSME9CQllFRk1zWFA3QmpNc21mVXVLZnVlVXNyWTc0cFgwR01COEdBMVVkCkl3UVlNQmFBRlB3ZTFMck51STMzVm0rRWRnTy9FL2pKaWhVMU1GZ0dDQ29EQkFVR0J3Z0JCRXg3SW1GMGRISnoKSWpwN0ltaG1Ma0ZtWm1sc2FXRjBhVzl1SWpvaUlpd2lhR1l1Ulc1eWIyeHNiV1Z1ZEVsRUlqb2lkWE5sY2pFaQpMQ0pvWmk1VWVYQmxJam9pWTJ4cFpXNTBJbjE5TUFvR0NDcUdTTTQ5QkFNQ0EwY0FNRVFDSUJCLzY4MVdmQlIrClFXSUdmaVlLT2szSHVSdE84SkZ3YlRpRWpuQWdDUnZuQWlCYTY5d1dZYVoyNVpSK0dheTY5ZVYrdkRaa1BNSFMKZ2RSakFJdGNLR3N0Rmc9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCiokZWE3OWU2NjQtYTJmMi00YzlmLTg2NDMtZTYwNjAwODhmYzlhIgwSB2ludGVyb3AaATEipQgK2QcKB09yZzFNU1ASzQctLS0tLUJFR0lOIENFUlRJRklDQVRFLS0tLS0KTUlJQ29qQ0NBa21nQXdJQkFnSVVHeDlQUksyN0ZOR0RVN012S3V3eGFRZXRaMTh3Q2dZSUtvWkl6ajBFQXdJdwphREVMTUFrR0ExVUVCaE1DVlZNeEZ6QVZCZ05WQkFnVERrNXZjblJvSUVOaGNtOXNhVzVoTVJRd0VnWURWUVFLCkV3dEllWEJsY214bFpHZGxjakVQTUEwR0ExVUVDeE1HUm1GaWNtbGpNUmt3RndZRFZRUURFeEJtWVdKeWFXTXQKWTJFdGMyVnlkbVZ5TUI0WERUSXlNRGd3TkRBMk1ESXdNRm9YRFRJek1EZ3dOREEyTURjd01Gb3dXekVMTUFrRwpBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRS0V3dEllWEJsCmNteGxaR2RsY2pFTk1Bc0dBMVVFQ3hNRWNHVmxjakVPTUF3R0ExVUVBeE1GY0dWbGNqQXdXVEFUQmdjcWhrak8KUFFJQkJnZ3Foa2pPUFFNQkJ3TkNBQVF5ZmFPOFJSUW1JNzY1MXBlOUliU0diSGc5dHh0QUpQS1F6cHIzYzBmQgpZV0tFWmZTR2hUYWVnb21jNkhUVCtGNXhpMkV1YVZkZFo2cTBwMlh4MmRKRm80SGRNSUhhTUE0R0ExVWREd0VCCi93UUVBd0lIZ0RBTUJnTlZIUk1CQWY4RUFqQUFNQjBHQTFVZERnUVdCQlNNVDJ2c0xQVm1xV0xMbEFwbVpmSGIKSnFEamlEQWZCZ05WSFNNRUdEQVdnQlFxRWRTWmIzMEYzckFLWjRsRnJYSXRYRjRqakRBaUJnTlZIUkVFR3pBWgpnaGR3WldWeU1DNXZjbWN4TG01bGRIZHZjbXN4TG1OdmJUQldCZ2dxQXdRRkJnY0lBUVJLZXlKaGRIUnljeUk2CmV5Sm9aaTVCWm1acGJHbGhkR2x2YmlJNklpSXNJbWhtTGtWdWNtOXNiRzFsYm5SSlJDSTZJbkJsWlhJd0lpd2kKYUdZdVZIbHdaU0k2SW5CbFpYSWlmWDB3Q2dZSUtvWkl6ajBFQXdJRFJ3QXdSQUlnWlE1YTNtekpaK3pmUDlyTwpjWU9vWEQ5UDVqeE1oUmNMQlBQZ0dnL2JLbllDSUNyM3FlSmdzeFgrRWlBV2drSjNHeFdjK1pRRnNzbTlqTWJBCnIxWGJmK0tJCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0KEkcwRQIhAM1Gyv7e+SYniXLgB8iBuRqS4C/A9D36SLl4Zj/AkxrpAiByAoaBFpRIMEJsmGasggaQ4AUST+M2n8ctBZCHjDwRxQ=="

    val fabricCert = "-----BEGIN CERTIFICATE-----\nMIICFzCCAb2gAwIBAgIUPB3O2Bl2ZRliIeSEesdgX0WDahwwCgYIKoZIzj0EAwIw\naDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMRQwEgYDVQQK\nEwtIeXBlcmxlZGdlcjEPMA0GA1UECxMGRmFicmljMRkwFwYDVQQDExBmYWJyaWMt\nY2Etc2VydmVyMB4XDTIyMDgwNDA2MDIwMFoXDTM3MDczMTA2MDIwMFowaDELMAkG\nA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMRQwEgYDVQQKEwtIeXBl\ncmxlZGdlcjEPMA0GA1UECxMGRmFicmljMRkwFwYDVQQDExBmYWJyaWMtY2Etc2Vy\ndmVyMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEpn9XxzOTE3QD0G6q5i9dEnbR\nynT6X5YaFVEwAsdgQylYK7MbmmlkS2ZHBP4Qi5krf+Zwz9yU6zYAPqEZCemLFaNF\nMEMwDgYDVR0PAQH/BAQDAgEGMBIGA1UdEwEB/wQIMAYBAf8CAQEwHQYDVR0OBBYE\nFCoR1JlvfQXesApniUWtci1cXiOMMAoGCCqGSM49BAMCA0gAMEUCIQCiBaH7Javq\nm2FVNqBXsVn1uwbKYZVHxXH9CE7ANnUF3wIgJ4gjBRrPK4pwHFCd5Yg9Pn383pbd\nzQkhznMIF4SBF4k=\n-----END CERTIFICATE-----\n"

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