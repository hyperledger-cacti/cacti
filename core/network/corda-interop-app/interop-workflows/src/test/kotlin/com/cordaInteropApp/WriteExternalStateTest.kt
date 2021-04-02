/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaInteropApp

import com.cordaInteropApp.flows.*
import com.cordaInteropApp.states.*
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
                    TestCordapp.findCordapp("com.cordaInteropApp.contracts"),
                    TestCordapp.findCordapp("com.cordaInteropApp.flows")
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

    val b64FabricView = "CjIIAxIYMjAyMC0xMC0yMVQwMDo0MzozOC43NDVaGgxOb3Rhcml6YXRpb24iBlNUUklORxKyIgpCCMgBGj0SO2xvY2FsaG9zdDo5MDgwL25ldHdvcmsxL215Y2hhbm5lbDpzaW1wbGVzdGF0ZTpSZWFkOkFyY3R1cnVzErUWCvEICo4BCAMQARoMCLqIvvwFEMCs5tcCIglteWNoYW5uZWwqQDA2ZGZlMjRmYjI0ZjIzNzM0OWQ1NWU4OWYwODlhYWE3YzUwYzNkZTk4YjlkNDk1MTk1Y2RlYjYyZDk3M2RkNWI6CxIJEgdpbnRlcm9wQiA+JS0+CcZf80ezjtkGSZsXyO2J8APik0Jb8+UkTqh/eRLdBwrABwoHT3JnMU1TUBK0By0tLS0tQkVHSU4gQ0VSVElGSUNBVEUtLS0tLQpNSUlDa0RDQ0FqZWdBd0lCQWdJVU9wcW45SDZQVTM2cFNoeG5kc0l1VHVvQ0ZLc3dDZ1lJS29aSXpqMEVBd0l3CmNqRUxNQWtHQTFVRUJoTUNWVk14RnpBVkJnTlZCQWdURGs1dmNuUm9JRU5oY205c2FXNWhNUTh3RFFZRFZRUUgKRXdaRWRYSm9ZVzB4R2pBWUJnTlZCQW9URVc5eVp6RXVibVYwZDI5eWF6RXVZMjl0TVIwd0d3WURWUVFERXhSagpZUzV2Y21jeExtNWxkSGR2Y21zeExtTnZiVEFlRncweU1EQTRNVEV3TmpJNU1EQmFGdzB5TVRBNE1URXdOak0wCk1EQmFNRUl4TURBTkJnTlZCQXNUQm1Oc2FXVnVkREFMQmdOVkJBc1RCRzl5WnpFd0VnWURWUVFMRXd0a1pYQmgKY25SdFpXNTBNVEVPTUF3R0ExVUVBeE1GY21Wc1lYa3dXVEFUQmdjcWhrak9QUUlCQmdncWhrak9QUU1CQndOQwpBQVIyUE84NzBlZVFJMFpPbUJOcEs1bmorMVErbFVrUnZlT0lsVjdZUThaVDVSN1VKdUM3ZlNCa2x4UUtWdm5yCktHajhCNWlXTUozblFXNmhjd2hPa0lFSm80SGFNSUhYTUE0R0ExVWREd0VCL3dRRUF3SUhnREFNQmdOVkhSTUIKQWY4RUFqQUFNQjBHQTFVZERnUVdCQlQ4dmtRK3FzdGFtNUUwQnFqUnBqZUhCdDZBZlRBZkJnTlZIU01FR0RBVwpnQlRXRDYwK2VDSGJEeUQzM1BXYkN4VnVRcU1BcVRCM0JnZ3FBd1FGQmdjSUFRUnJleUpoZEhSeWN5STZleUpvClppNUJabVpwYkdsaGRHbHZiaUk2SW05eVp6RXVaR1Z3WVhKMGJXVnVkREVpTENKb1ppNUZibkp2Ykd4dFpXNTAKU1VRaU9pSnlaV3hoZVNJc0ltaG1MbFI1Y0dVaU9pSmpiR2xsYm5RaUxDSnlaV3hoZVNJNkluUnlkV1VpZlgwdwpDZ1lJS29aSXpqMEVBd0lEUndBd1JBSWdYS3JsN1ZCUXdDcXlWeldhZXJDSEpaMGF2ekxuVjQrc05mV0RYM1VhCjNiMENJSHZCRUhBbzBBNXBvQkZDcll2SnkySjdxbDhKVUxFODhkelVNQ2EvUWxRSgotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tChIY195X6izbE8AzUdxK8mcZD8K+SFVLYdK4Er4NCrsNCrgNCAESCRIHaW50ZXJvcBqoDQoVSGFuZGxlRXh0ZXJuYWxSZXF1ZXN0CowNQ2hWYkltOXlaekV1Ym1WMGQyOXlhekV1WTI5dElsMFNPMnh2WTJGc2FHOXpkRG81TURnd0wyNWxkSGR2Y21zeEwyMTVZMmhoYm01bGJEcHphVzF3YkdWemRHRjBaVHBTWldGa09rRnlZM1IxY25WekdneEdZV0p5YVdOZlVtVnNZWGtpQ0c1bGRIZHZjbXN4S3QwSExTMHRMUzFDUlVkSlRpQkRSVkpVU1VaSlEwRlVSUzB0TFMwdENrMUpTVU55VkVORFFXeFRaMEYzU1VKQlowbFZTRU5YTHpCdFYweGhjMmhJU0c5emQweHhWV2hwSzFGd1JFYzRkME5uV1VsTGIxcEplbW93UlVGM1NYY0tZMnBGVEUxQmEwZEJNVlZGUW1oTlExWldUWGhHZWtGV1FtZE9Wa0pCWjFSRWF6VjJZMjVTYjBsRlRtaGpiVGx6WVZjMWFFMVJPSGRFVVZsRVZsRlJTQXBGZDFwRlpGaEtiMWxYTUhoSGFrRlpRbWRPVmtKQmIxUkZWemw1V25wRmRXSnRWakJrTWpsNVlYcEZkVmt5T1hSTlVqQjNSM2RaUkZaUlVVUkZlRkpxQ2xsVE5YWmpiV040VEcwMWJHUklaSFpqYlhONFRHMU9kbUpVUVdWR2R6QjVUVVJCTTAxcWEzZE9SRTB5VFVSQ1lVWjNNSGxOVkVFelRXcHJkMDVFVVhnS1RVUkNZVTFHTUhoRGVrRktRbWRPVmtKQldWUkJiRlpVVFZKamQwWlJXVVJXVVZGSlJYYzFUMkl6U2pCaFEwSkVXVmhLZG1KSGJIVlpWRVZWVFVKSlJ3cEJNVlZGUTJoTlRGTkliSGRhV0VweldsZFNibHBZU1hoRWVrRk9RbWRPVmtKQmMxUkNiVTV6WVZkV2RXUkVSVTlOUVhkSFFURlZSVUY0VFVaa1dFNXNDbU5xUlhkWFZFRlVRbWRqY1docmFrOVFVVWxDUW1kbmNXaHJhazlRVVUxQ1FuZE9RMEZCVTNWb0wzSldRMlk0VDBSMWR6QkphRzV5VFRKcGFXWXlZVGNLYzBkVU9FSkpWakZRUlVSVk0xTnVjVU5zYldnclVsWXZNMHA1UzJ3dlZIbDBhSHBPTDFwV2JrdEZMM1IyTldReloxWlhZazV6ZEdNNU55dFRielJJWXdwTlNVaGFUVUUwUjBFeFZXUkVkMFZDTDNkUlJVRjNTVWhuUkVGTlFtZE9Wa2hTVFVKQlpqaEZRV3BCUVUxQ01FZEJNVlZrUkdkUlYwSkNVWGd2YUV4WkNrTk9SelJsZWtOeGRtZFVTME12VjNkMVUxWnViVVJCWmtKblRsWklVMDFGUjBSQlYyZENWRmRFTmpBclpVTklZa1I1UkRNelVGZGlRM2hXZFZGeFRVRUtjVlJCWmtKblRsWklVa1ZGUjBSQlYyZG9VblpaZWxWNFRVUk5NMDVFWTNwUFJFRjFZVmRLZEV4dFRuWmlWRUpaUW1kbmNVRjNVVVpDWjJOSlFWRlNUUXBsZVVwb1pFaFNlV041U1RabGVVcHZXbWsxUWxwdFduQmlSMnhvWkVkc2RtSnBTVFpKYVVselNXMW9iVXhyVm5WamJUbHpZa2N4YkdKdVVrcFNRMGsyQ2tsdVZucGFXRWw0U1dsM2FXRkhXWFZXU0d4M1dsTkpOa2x0VG5OaFYxWjFaRU5LT1daVVFVdENaMmR4YUd0cVQxQlJVVVJCWjA1SVFVUkNSVUZwUVVZS2JuTk1ObFYxZUZSdFNrczVibWhrVFUxUU5XeFdOM2h1ZVZsc01WZDVSR2w2UlZGelpuZDFUMXAzU1dkWVkzZHVTRTloVlVSWFdXcG1XSFJHVTBrMWVRcDZXamx0Y2paUVJXdFNORVIwVkVoSlVrWmhUVll4T0QwS0xTMHRMUzFGVGtRZ1EwVlNWRWxHU1VOQlZFVXRMUzB0TFFveVlFMUZVVU5KUVhKR1NHWjFRMGhMZDJabE9XbFBibUZ6YlM5VlUzSm1SR1pNTDBkTllVVkhWR1JDVEU5elRVcFhSMEZwUWtSUVRpOW5TMjlZY3pWb2RURXJhbEJPVjJsSGNWWXZkR3hDUlRGc2FXWXlWRWRDTlV0T2NIUXZZWGM5UFVJa1lUQTBZalUzT1RJdFpEYzNZeTAwWTJVM0xUbGhOekV0TmpkaU1tRTBNMkpsWW1NelNoRnZjbWN4TG01bGRIZHZjbXN4TG1OdmJRPT0YABr8AgogTkn3oWDphU7301z4YVfZQVOYTAsicf8H0508e9I5nckS1wIKggISZgoKX2xpZmVjeWNsZRJYCigKIm5hbWVzcGFjZXMvZmllbGRzL2ludGVyb3AvU2VxdWVuY2USAggDCiwKJm5hbWVzcGFjZXMvZmllbGRzL3NpbXBsZXN0YXRlL1NlcXVlbmNlEgIIBhJjCgdpbnRlcm9wElgKHgoYAGFjY2Vzc0NvbnRyb2wAbmV0d29yazEAEgIICAoeChgAc2VjdXJpdHlHcm91cABuZXR3b3JrMQASAggKChYKEAD0j7+/aW5pdGlhbGl6ZWQSAggEEjMKC3NpbXBsZXN0YXRlEiQKFgoQAPSPv79pbml0aWFsaXplZBICCAcKCgoIQXJjdHVydXMaQgjIARo9Ejtsb2NhbGhvc3Q6OTA4MC9uZXR3b3JrMS9teWNoYW5uZWw6c2ltcGxlc3RhdGU6UmVhZDpBcmN0dXJ1cyIMEgdpbnRlcm9wGgExIrQICukHCgdPcmcxTVNQEt0HLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNyRENDQWxPZ0F3SUJBZ0lVV01SRTJMQnB2djVOR1JGL2EzLzZxZlNwT1M0d0NnWUlLb1pJemowRUF3SXcKY2pFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1ROHdEUVlEVlFRSApFd1pFZFhKb1lXMHhHakFZQmdOVkJBb1RFVzl5WnpFdWJtVjBkMjl5YXpFdVkyOXRNUjB3R3dZRFZRUURFeFJqCllTNXZjbWN4TG01bGRIZHZjbXN4TG1OdmJUQWVGdzB5TURBM01qa3dORE0yTURCYUZ3MHlNVEEzTWprd05EUXgKTURCYU1Gc3hDekFKQmdOVkJBWVRBbFZUTVJjd0ZRWURWUVFJRXc1T2IzSjBhQ0JEWVhKdmJHbHVZVEVVTUJJRwpBMVVFQ2hNTFNIbHdaWEpzWldSblpYSXhEVEFMQmdOVkJBc1RCSEJsWlhJeERqQU1CZ05WQkFNVEJYQmxaWEl3Ck1Ga3dFd1lIS29aSXpqMENBUVlJS29aSXpqMERBUWNEUWdBRTVGUWtIODNFV2dhb0NnZTlrOEhJTUl3Q1RUZVkKcUJHbnE0UDNYckJQZlBIV1d4TWhYaEFoM29Qc1Q5d2drV0dwVWZhaXJuR3RuZEFDdmtKK01CL2cxS09CM1RDQgoyakFPQmdOVkhROEJBZjhFQkFNQ0I0QXdEQVlEVlIwVEFRSC9CQUl3QURBZEJnTlZIUTRFRmdRVUsyQW4zdEJMCmsxVDJEait3SEdnVEhDc2JiaVl3SHdZRFZSMGpCQmd3Rm9BVTFnK3RQbmdoMnc4Zzk5ejFtd3NWYmtLakFLa3cKSWdZRFZSMFJCQnN3R1lJWGNHVmxjakF1YjNKbk1TNXVaWFIzYjNKck1TNWpiMjB3VmdZSUtnTUVCUVlIQ0FFRQpTbnNpWVhSMGNuTWlPbnNpYUdZdVFXWm1hV3hwWVhScGIyNGlPaUlpTENKb1ppNUZibkp2Ykd4dFpXNTBTVVFpCk9pSndaV1Z5TUNJc0ltaG1MbFI1Y0dVaU9pSndaV1Z5SW4xOU1Bb0dDQ3FHU000OUJBTUNBMGNBTUVRQ0lCYVEKOGhOZFd3bFh5SHFjaG1DN3NVSlZoRHoySDZ6eHczUFBLUjkzeUIvc0FpQkoyemdCWHMvWWwwZm5uck1RdUJBRApwMUFLVEpOSmwxVjBZRUcwWGI1cXBnPT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQoSRjBEAiB/E44ql8sMJNy99qXUWPmalc3mBUKszqvTuPZr0DKW2wIgOxcWZY9h0oqTzIfI67dyDPRkAUpnT+kMfOXxrdtYIu4="

    val fabricCert = "-----BEGIN CERTIFICATE-----\nMIICKjCCAdGgAwIBAgIUBFTi56rmjunJiRESpyJW0q4sRL4wCgYIKoZIzj0EAwIw\ncjELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\nEwZEdXJoYW0xGjAYBgNVBAoTEW9yZzEubmV0d29yazEuY29tMR0wGwYDVQQDExRj\nYS5vcmcxLm5ldHdvcmsxLmNvbTAeFw0yMDA3MjkwNDM1MDBaFw0zNTA3MjYwNDM1\nMDBaMHIxCzAJBgNVBAYTAlVTMRcwFQYDVQQIEw5Ob3J0aCBDYXJvbGluYTEPMA0G\nA1UEBxMGRHVyaGFtMRowGAYDVQQKExFvcmcxLm5ldHdvcmsxLmNvbTEdMBsGA1UE\nAxMUY2Eub3JnMS5uZXR3b3JrMS5jb20wWTATBgcqhkjOPQIBBggqhkjOPQMBBwNC\nAAQONsIOz5o+HhKgSdIOpqGrTcvJ3tADkFsyMg0vV3MSo6gyAq5V23c1grO4X5xU\nY71ZVTPQuokv6/WIQYIaumjDo0UwQzAOBgNVHQ8BAf8EBAMCAQYwEgYDVR0TAQH/\nBAgwBgEB/wIBATAdBgNVHQ4EFgQU1g+tPngh2w8g99z1mwsVbkKjAKkwCgYIKoZI\nzj0EAwIDRwAwRAIgGdSMyEzimoSwjTyF+NmOwOLn4xpeMOhev5idRWpy+ZsCIFKA\n0I8cCd5tw7zTukyjWMJi737K+4zPK6QDKIeql+R1\n-----END CERTIFICATE-----"

    val fabricVerificationPolicy = VerificationPolicyState(
            securityDomain = "network1",
            identifiers = listOf(Identifier(
                    "mychannel:simplestate:Read:Arcturus",
                    Policy("signature", listOf("Org1MSP"))
            ))
    )

    val fabricMembership = MembershipState(
            securityDomain = "network1",
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
            "-----BEGIN CERTIFICATE-----\nMIICbTCCAgmgAwIBAgIIYRljUiZaGSkwFAYIKoZIzj0EAwIGCCqGSM49AwEHMGMx\nCzAJBgNVBAYTAlVTMREwDwYDVQQHEwhOZXcgWW9yazEOMAwGA1UECxMFQ29yZGEx\nFjAUBgNVBAoTDVIzIEhvbGRDbyBMTEMxGTAXBgNVBAMTEENvcmRhIERvb3JtYW4g\nQ0EwHhcNMjAwNzI0MDAwMDAwWhcNMjcwNTIwMDAwMDAwWjAvMQswCQYDVQQGEwJH\nQjEPMA0GA1UEBwwGTG9uZG9uMQ8wDQYDVQQKDAZQYXJ0eUEwWTATBgcqhkjOPQIB\nBggqhkjOPQMBBwNCAASFze6k3tINqGLsKTi0a50RpOUCysno1/1lwIfEqaboauuj\no6Ecfu8X1WnW92VrEZGKslIJzR8R0deOEJvBs0rzo4HQMIHNMB0GA1UdDgQWBBR4\nhwLuLgfIZMEWzG4n3AxwfgPbezAPBgNVHRMBAf8EBTADAQH/MAsGA1UdDwQEAwIB\nhjATBgNVHSUEDDAKBggrBgEFBQcDAjAfBgNVHSMEGDAWgBTr7i4wFSlArhmYHthv\n431/B6LCEzARBgorBgEEAYOKYgEBBAMCAQQwRQYDVR0eAQH/BDswOaA1MDOkMTAv\nMQswCQYDVQQGEwJHQjEPMA0GA1UEBwwGTG9uZG9uMQ8wDQYDVQQKDAZQYXJ0eUGh\nADAUBggqhkjOPQQDAgYIKoZIzj0DAQcDSAAwRQIhANXBVAebUsY9AMfjZedNYN14\nWy76Ru5vMSta3Av1d08lAiAi2GZWk5XwJoEYuhQHXsHQLZbXphAVk+Q5tVgMgywj\ntQ==\n-----END CERTIFICATE-----",
            "-----BEGIN CERTIFICATE-----\nMIICXjCCAfugAwIBAgIIHVb6wd3RHhIwFAYIKoZIzj0EAwIGCCqGSM49AwEHMFgx\nGzAZBgNVBAMMEkNvcmRhIE5vZGUgUm9vdCBDQTELMAkGA1UECgwCUjMxDjAMBgNV\nBAsMBWNvcmRhMQ8wDQYDVQQHDAZMb25kb24xCzAJBgNVBAYTAlVLMB4XDTE4MDcx\nMDAwMDAwMFoXDTI3MDUyMDAwMDAwMFowYzELMAkGA1UEBhMCVVMxETAPBgNVBAcT\nCE5ldyBZb3JrMQ4wDAYDVQQLEwVDb3JkYTEWMBQGA1UEChMNUjMgSG9sZENvIExM\nQzEZMBcGA1UEAxMQQ29yZGEgRG9vcm1hbiBDQTBZMBMGByqGSM49AgEGCCqGSM49\nAwEHA0IABAPL3qAm4WZms5ciBVoxMQXfK7uTmHRVvWfWQ+QVYP3bMHSguHZRzB3v\n7EOE8RZpGDan+w007Xj7XR0+xG9SxmCjgZkwgZYwHQYDVR0OBBYEFOvuLjAVKUCu\nGZge2G/jfX8HosITMA8GA1UdEwEB/wQFMAMBAf8wCwYDVR0PBAQDAgGGMCMGA1Ud\nJQQcMBoGCCsGAQUFBwMBBggrBgEFBQcDAgYEVR0lADAfBgNVHSMEGDAWgBR8rqnf\nuUgBKxOJC5rmRYUcORcHczARBgorBgEEAYOKYgEBBAMCAQEwFAYIKoZIzj0EAwIG\nCCqGSM49AwEHA0cAMEQCIBmzQXpnCo9eAxkhwMt0bBr1Q0APJXF0KuBRsFBWAa6S\nAiBgx6G8G9Ij7B8+y65ItLKVcs7Kh6Rdnr5/1zB/yPwfrg==\n-----END CERTIFICATE-----",
            "-----BEGIN CERTIFICATE-----\nMIICCTCCAbCgAwIBAgIIcFe0qctqSucwCgYIKoZIzj0EAwIwWDEbMBkGA1UEAwwS\nQ29yZGEgTm9kZSBSb290IENBMQswCQYDVQQKDAJSMzEOMAwGA1UECwwFY29yZGEx\nDzANBgNVBAcMBkxvbmRvbjELMAkGA1UEBhMCVUswHhcNMTcwNTIyMDAwMDAwWhcN\nMjcwNTIwMDAwMDAwWjBYMRswGQYDVQQDDBJDb3JkYSBOb2RlIFJvb3QgQ0ExCzAJ\nBgNVBAoMAlIzMQ4wDAYDVQQLDAVjb3JkYTEPMA0GA1UEBwwGTG9uZG9uMQswCQYD\nVQQGEwJVSzBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABGlm6LFHrVkzfuUHin36\nJrm1aUMarX/NUZXw8n8gSiJmsZPlUEplJ+f/lzZMky5EZPTtCciG34pnOP0eiMd/\nJTCjZDBiMB0GA1UdDgQWBBR8rqnfuUgBKxOJC5rmRYUcORcHczALBgNVHQ8EBAMC\nAYYwIwYDVR0lBBwwGgYIKwYBBQUHAwEGCCsGAQUFBwMCBgRVHSUAMA8GA1UdEwEB\n/wQFMAMBAf8wCgYIKoZIzj0EAwIDRwAwRAIgDaL4SguKsNeTT7SeUkFdoCBACeG8\nGqO4M1KlfimphQwCICiq00hDanT5W8bTLqE7GIGuplf/O8AABlpWrUg6uiUB\n-----END CERTIFICATE-----"
    )
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

        val happyFuture2 = partyA.startFlow(WriteExternalStateInitiator(b64FabricView, "localhost:9080/network1/mychannel:simplestate:Read:Arcturus"))
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