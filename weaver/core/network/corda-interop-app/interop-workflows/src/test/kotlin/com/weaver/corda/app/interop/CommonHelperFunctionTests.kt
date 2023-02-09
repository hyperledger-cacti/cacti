/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop

import com.weaver.corda.app.interop.flows.*
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.assertFalse

class CommonHelperFunctionTests {

    @Test
    fun `parseAddress tests`() {
        // Happy case with a valid address
        val validAddress = "localhost:9080/network1/mychannel:interop:Read:h"
        val address = parseAddress(validAddress)
        assertTrue(address.isRight())
        address.map {
            assertEquals(1, it.locationSegment.size)
            assertTrue(it.locationSegment[0] == "localhost:9080")
            assertTrue(it.securityDomain == "network1")
            assertTrue(it.viewSegment == "mychannel:interop:Read:h")
        }

        // Happy case with a valid address
        val validAddressWithMultipleRelays = "localhost:9080;localhost:9081/network1/mychannel:interop:Read:h"
        val addressWithMultipleRelays = parseAddress(validAddressWithMultipleRelays)
        assertTrue(addressWithMultipleRelays.isRight())
        addressWithMultipleRelays.map {
            assertEquals(2, it.locationSegment.size)
            assertTrue(it.locationSegment[0] == "localhost:9080")
            assertTrue(it.locationSegment[1] == "localhost:9081")
            assertTrue(it.securityDomain == "network1")
            assertTrue(it.viewSegment == "mychannel:interop:Read:h")
        }

        // Unhappy case with too many /
        val tooManySegmentsAddress = "localhost:9080/network1/mychannel:interop:Read:h/fjsklfjd"
        val errorTooManySegments = parseAddress(tooManySegmentsAddress)
        assertTrue(errorTooManySegments.isLeft())

        // Unhappy case with no view segment
        val noViewSegmentAddress = "localhost:9080/network1"
        val errorNoViewSegment = parseAddress(noViewSegmentAddress)
        assertTrue(errorNoViewSegment.isLeft())
    }

    @Test
    fun `parseCordaViewAddress tests`() {
        // Happy case with valid address
        val validAddress = "localhost:9080/network1/partyA:10006;partyB:10008#FlowName:flowArg1:flowArg2"
        val parsedAddress = parseCordaViewAddress(validAddress)
        assertTrue(parsedAddress.isRight())
        parsedAddress.map {
            assertEquals(2, it.nodeAddresses.size)
            assertEquals(it.nodeAddresses[0].host, "partyA")
            assertEquals(it.nodeAddresses[0].port, 10006)
            assertEquals(it.nodeAddresses[1].host, "partyB")
            assertEquals(it.nodeAddresses[1].port, 10008)
            assertEquals("FlowName", it.flowName)
            assertEquals("flowArg1", it.flowArgs[0])
            assertEquals("flowArg2", it.flowArgs[1])
        }

        // Happy case with no flow args
        val validAddressNoArgs = "localhost:9080/network1/partyA:10006#FlowName"
        val parsedAddressNoArgs = parseCordaViewAddress(validAddressNoArgs)
        assertTrue(parsedAddressNoArgs.isRight())
        parsedAddressNoArgs.map {
            assertEquals(1, it.nodeAddresses.size)
            assertEquals("partyA", it.nodeAddresses[0].host)
            assertEquals(10006, it.nodeAddresses[0].port)
            assertEquals("FlowName", it.flowName)
            assertEquals(0, it.flowArgs.size)
        }

        // Unhappy case with too many segments
        val addressTooManySegments = "localhost:9080/network1/partyA:10006;partyB:10008#FlowName:flowArg1:flowArg2#fdjskfjds"
        val errorTooManySegments = parseCordaViewAddress(addressTooManySegments)
        assertTrue(errorTooManySegments.isLeft())

        // Unhappy case with too few segments
        val addressNoFlowName = "localhost:9080/network1/partyA:10006;partyB:10008"
        val errorNoFlowName = parseCordaViewAddress(addressNoFlowName)
        assertTrue(errorNoFlowName.isLeft())
    }

    @Test
    fun `parseFabricViewAddress tests`() {
        // Happy case
        val validAddress = "mychannel:interop:Read:h"
        val parsedAddress = parseFabricViewAddress(validAddress)
        assertTrue(parsedAddress.isRight())
        parsedAddress.map {
            assertEquals("mychannel", it.channelId)
            assertEquals("interop", it.chaincodeId)
            assertEquals("Read", it.chaincodeFn)
            assertEquals(1, it.chaincodeArgs.size)
            assertEquals("h", it.chaincodeArgs[0])
        }

        // Happy case with no chaincode arguments
        val validAddressNoArgs = "mychannel:interop:Read"
        val parsedAddressNoArgs = parseFabricViewAddress(validAddressNoArgs)
        assertTrue(parsedAddressNoArgs.isRight())
        parsedAddressNoArgs.map {
            assertEquals("mychannel", it.channelId)
            assertEquals("interop", it.chaincodeId)
            assertEquals("Read", it.chaincodeFn)
            assertEquals(0, it.chaincodeArgs.size)
        }

        // Unhappy case with too few arguments
        val invalidAddressNoFn = "mychannel:interop"
        val errorNoFn = parseFabricViewAddress(invalidAddressNoFn)
        assertTrue(errorNoFn.isLeft())
    }

    @Test
    fun `convertCertificateToBase64Pem tests`() {
        val validCertByteArray = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNWVENDQWZ1Z0F3SUJBZ0lRSExVM3FxUUZBWFFkbnBTSlRPa2I1akFLQmdncWhrak9QUVFEQWpCMU1Rc3cKQ1FZRFZRUUdFd0pWVXpFVE1CRUdBMVVFQ0JNS1EyRnNhV1p2Y201cFlURVdNQlFHQTFVRUJ4TU5VMkZ1SUVaeQpZVzVqYVhOamJ6RWFNQmdHQTFVRUNoTVJZMkZ5Y21sbGNpMTBjbUZrWld4bGJuTXhIVEFiQmdOVkJBTVRGR05oCkxtTmhjbkpwWlhJdGRISmhaR1ZzWlc1ek1CNFhEVEl3TURnd09EQTBNVEl3TUZvWERUTXdNRGd3TmpBME1USXcKTUZvd2RURUxNQWtHQTFVRUJoTUNWVk14RXpBUkJnTlZCQWdUQ2tOaGJHbG1iM0p1YVdFeEZqQVVCZ05WQkFjVApEVk5oYmlCR2NtRnVZMmx6WTI4eEdqQVlCZ05WQkFvVEVXTmhjbkpwWlhJdGRISmhaR1ZzWlc1ek1SMHdHd1lEClZRUURFeFJqWVM1allYSnlhV1Z5TFhSeVlXUmxiR1Z1Y3pCWk1CTUdCeXFHU000OUFnRUdDQ3FHU000OUF3RUgKQTBJQUJEV1BvYllBQ3NiWVY4aFU5a2JNcHZHVEpSNndtdnd0dDVrWmdiK1prRFdQRkVmNGpBUVpyQ05hZGtsNApmeVpIZVBnQzdOV2Jza3RPQlEwVExWeFFLS2lqYlRCck1BNEdBMVVkRHdFQi93UUVBd0lCcGpBZEJnTlZIU1VFCkZqQVVCZ2dyQmdFRkJRY0RBZ1lJS3dZQkJRVUhBd0V3RHdZRFZSMFRBUUgvQkFVd0F3RUIvekFwQmdOVkhRNEUKSWdRZzVNYTh4bDVGOU1EQlhiVGJUREFCNFFIQlpqK3BvMjJUZTZUYjFWcjNJcEF3Q2dZSUtvWkl6ajBFQXdJRApTQUF3UlFJZ2FwbURWTWE4bUNmVWVTdndXRFlPTmkyd3gybFFmSjFmWm0raklLUjNhSVVDSVFDUWNkYWxjVEpuCkkydFNKWjdSM3dvS0hWV0oybzBveEtQU1cwVjVkd243TVE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==".toByteArray()
        val base64Pem = convertCertificateToBase64Pem(validCertByteArray)
        assertTrue(base64Pem.startsWith("-----BEGIN CERTIFICATE-----"))
        assertTrue(base64Pem.endsWith("-----END CERTIFICATE-----"))
    }

    @Test
    fun `getCertificateFromString tests`() {
        val validFabricPemCertificate = "-----BEGIN CERTIFICATE-----\n" +
                "MIICKTCCAdCgAwIBAgIQGRbx4P5Wx9wzC/36YHW4ATAKBggqhkjOPQQDAjBzMQsw\n" +
                "CQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZy\n" +
                "YW5jaXNjbzEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMTY2Eu\n" +
                "b3JnMS5leGFtcGxlLmNvbTAeFw0yMDAxMTUyMzEzMDBaFw0zMDAxMTIyMzEzMDBa\n" +
                "MGwxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMRYwFAYDVQQHEw1T\n" +
                "YW4gRnJhbmNpc2NvMQ8wDQYDVQQLEwZjbGllbnQxHzAdBgNVBAMMFlVzZXIxQG9y\n" +
                "ZzEuZXhhbXBsZS5jb20wWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAQW3mk0yPJT\n" +
                "H5TOtwa2aYA/RxQ9ocAE+z50S+1ozxY29zxRW3UHQlGVlogeRP3vRYmYZBBTXV4K\n" +
                "GJpnzRD222p5o00wSzAOBgNVHQ8BAf8EBAMCB4AwDAYDVR0TAQH/BAIwADArBgNV\n" +
                "HSMEJDAigCCcmlLfoqECBigS68Vo73tpHFrJtPOZSfu/NQAPZ+iHbjAKBggqhkjO\n" +
                "PQQDAgNHADBEAiB4DJofTdxo2UftP0T5flfxo3GTApVP7MCM855qE6NmwQIgXo7o\n" +
                "1mfLRtsrTUvC+lMWuWdSZ6Xben89yeAHLZvobcY=\n" +
                "-----END CERTIFICATE-----\n"
        val certificate = getCertificateFromString(validFabricPemCertificate)
        assertTrue(certificate.isRight())

        val validFabricNonPemCertificate = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNWVENDQWZ1Z0F3SUJBZ0lRSExVM3FxUUZBWFFkbnBTSlRPa2I1akFLQmdncWhrak9QUVFEQWpCMU1Rc3cKQ1FZRFZRUUdFd0pWVXpFVE1CRUdBMVVFQ0JNS1EyRnNhV1p2Y201cFlURVdNQlFHQTFVRUJ4TU5VMkZ1SUVaeQpZVzVqYVhOamJ6RWFNQmdHQTFVRUNoTVJZMkZ5Y21sbGNpMTBjbUZrWld4bGJuTXhIVEFiQmdOVkJBTVRGR05oCkxtTmhjbkpwWlhJdGRISmhaR1ZzWlc1ek1CNFhEVEl3TURnd09EQTBNVEl3TUZvWERUTXdNRGd3TmpBME1USXcKTUZvd2RURUxNQWtHQTFVRUJoTUNWVk14RXpBUkJnTlZCQWdUQ2tOaGJHbG1iM0p1YVdFeEZqQVVCZ05WQkFjVApEVk5oYmlCR2NtRnVZMmx6WTI4eEdqQVlCZ05WQkFvVEVXTmhjbkpwWlhJdGRISmhaR1ZzWlc1ek1SMHdHd1lEClZRUURFeFJqWVM1allYSnlhV1Z5TFhSeVlXUmxiR1Z1Y3pCWk1CTUdCeXFHU000OUFnRUdDQ3FHU000OUF3RUgKQTBJQUJEV1BvYllBQ3NiWVY4aFU5a2JNcHZHVEpSNndtdnd0dDVrWmdiK1prRFdQRkVmNGpBUVpyQ05hZGtsNApmeVpIZVBnQzdOV2Jza3RPQlEwVExWeFFLS2lqYlRCck1BNEdBMVVkRHdFQi93UUVBd0lCcGpBZEJnTlZIU1VFCkZqQVVCZ2dyQmdFRkJRY0RBZ1lJS3dZQkJRVUhBd0V3RHdZRFZSMFRBUUgvQkFVd0F3RUIvekFwQmdOVkhRNEUKSWdRZzVNYTh4bDVGOU1EQlhiVGJUREFCNFFIQlpqK3BvMjJUZTZUYjFWcjNJcEF3Q2dZSUtvWkl6ajBFQXdJRApTQUF3UlFJZ2FwbURWTWE4bUNmVWVTdndXRFlPTmkyd3gybFFmSjFmWm0raklLUjNhSVVDSVFDUWNkYWxjVEpuCkkydFNKWjdSM3dvS0hWV0oybzBveEtQU1cwVjVkd243TVE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg=="
        val certificateFromNonPemCertString = getCertificateFromString(validFabricNonPemCertificate)
        assertTrue(certificateFromNonPemCertString.isRight())

        val validCordaPemCertificate = "-----BEGIN CERTIFICATE-----\n" +
                "MIICjjCCAimgAwIBAgIINsy0hzyilqEwFAYIKoZIzj0EAwIGCCqGSM49AwEHMGMx\n" +
                "CzAJBgNVBAYTAlVTMREwDwYDVQQHEwhOZXcgWW9yazEOMAwGA1UECxMFQ29yZGEx\n" +
                "FjAUBgNVBAoTDVIzIEhvbGRDbyBMTEMxGTAXBgNVBAMTEENvcmRhIERvb3JtYW4g\n" +
                "Q0EwHhcNMjAwMjExMDAwMDAwWhcNMjcwNTIwMDAwMDAwWjA3MQswCQYDVQQGEwJH\n" +
                "QjEPMA0GA1UEBwwGTG9uZG9uMRcwFQYDVQQKDA5TZWxsZXJCYW5rTm9kZTBZMBMG\n" +
                "ByqGSM49AgEGCCqGSM49AwEHA0IABD283iOjQX16zTPe+O2+qYVQvUZ0duRzTzaN\n" +
                "ij9bq9oGiqRF0WwzH1EtbfflQcDz2adbeWa9NsItmBIssTcUph+jgegwgeUwHQYD\n" +
                "VR0OBBYEFCv2mILZiR5ZVUDRsbTIWrGqMjwgMA8GA1UdEwEB/wQFMAMBAf8wCwYD\n" +
                "VR0PBAQDAgGGMCMGA1UdJQQcMBoGCCsGAQUFBwMBBggrBgEFBQcDAgYEVR0lADAf\n" +
                "BgNVHSMEGDAWgBTr7i4wFSlArhmYHthv431/B6LCEzARBgorBgEEAYOKYgEBBAMC\n" +
                "AQQwTQYDVR0eAQH/BEMwQaA9MDukOTA3MQswCQYDVQQGEwJHQjEPMA0GA1UEBwwG\n" +
                "TG9uZG9uMRcwFQYDVQQKDA5TZWxsZXJCYW5rTm9kZaEAMBQGCCqGSM49BAMCBggq\n" +
                "hkjOPQMBBwNJADBGAiEA1XjTiDC/1wLgIYCZxCuX33ywb0JEj32inivyPj78y+EC\n" +
                "IQCJXjy4cOFyhXhrP1xqcLv1lL7CO1yu+kAzj/w7hqGsIw==\n" +
                "-----END CERTIFICATE-----\n"
        val certificateFromCordaPemCertString = getCertificateFromString(validCordaPemCertificate)
        assertTrue(certificateFromCordaPemCertString.isRight())

        val invalidCertString = "MIICjjCCAimgAwIBAgIINsy0hzyilqEwFAYIKoZIzj0EAwIGCCqGSM49AwEHMGMx"
        val error = getCertificateFromString(invalidCertString)
        assertTrue(error.isLeft())
    }

    @Test
    fun `validPatternString tests`() {
        // Happy no star
        val validPattern = "valid:no:star"
        assertTrue(validPatternString(validPattern))
        // Happy star
        val validStarPattern = "valid:star:*"
        assertTrue(validPatternString(validStarPattern))
        // Happy only star
        val validOnlyStarPattern = "*"
        assertTrue(validPatternString(validOnlyStarPattern))
        // Unhappy too many stars
        val tooManyStars = "One*:*too:many"
        assertFalse(validPatternString(tooManyStars))
        // Unhappy invalid star location
        val invalidStarLocation = "test:*:star"
        assertFalse(validPatternString(invalidStarLocation))
    }

    @Test
    fun `isPatternAndAddressMatch tests`() {
        // Happy case valid star pattern  match
        val validPattern = "test:*"
        val matchingString = "test:star"
        assertTrue(isPatternAndAddressMatch(validPattern, matchingString))
        // Happy case valid pattern exact match
        val validNoStarPattern = "test:exact"
        val exactMatchString = "test:exact"
        assertTrue(isPatternAndAddressMatch(validNoStarPattern, exactMatchString))
        // Happy case valid pattern with only star
        val validOnlyStarPattern = "*"
        val anyAddress = "the:pattern:should:match:anything"
        assertTrue(isPatternAndAddressMatch(validOnlyStarPattern, anyAddress))
        // Unhappy case valid pattern doesnt match value
        val validPatternNoMatch = "notMatch:*"
        assertFalse(isPatternAndAddressMatch(validPatternNoMatch, exactMatchString))
    }
}