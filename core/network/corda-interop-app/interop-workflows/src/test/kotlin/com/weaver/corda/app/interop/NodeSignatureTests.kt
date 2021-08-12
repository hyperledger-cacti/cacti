/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop

import com.weaver.corda.app.interop.flows.verifyNodeSignature
import org.junit.Test
import kotlin.test.assertTrue

class NodeSignatureTests {
    @Test
    fun `CreateNodeSignatureFlow tests`() {}

    @Test
    fun `verifyNodeSignature tests`() {
        // Happy case: corda query contents (no manual sha256 hashing
        val signature = "UgrcLZhpDdDBzpTy+lWxC+CaYvZMG98LYjoJYxFEUKzIbTy7BNF3ibk9v2WJ9/CF/Nt8o76rj5t3Hz9wQX/tDg=="

        val cert = "-----BEGIN CERTIFICATE-----\nMIIBwjCCAV+gAwIBAgIIUJkQvmKm35YwFAYIKoZIzj0EAwIGCCqGSM49AwEHMC8x\nCzAJBgNVBAYTAkdCMQ8wDQYDVQQHDAZMb25kb24xDzANBgNVBAoMBlBhcnR5QTAe\nFw0yMDA3MjQwMDAwMDBaFw0yNzA1MjAwMDAwMDBaMC8xCzAJBgNVBAYTAkdCMQ8w\nDQYDVQQHDAZMb25kb24xDzANBgNVBAoMBlBhcnR5QTAqMAUGAytlcAMhAMMKaREK\nhcTgSBMMzK81oPUSPoVmG/fJMLXq/ujSmse9o4GJMIGGMB0GA1UdDgQWBBRMXtDs\nKFZzULdQ3c2DCUEx3T1CUDAPBgNVHRMBAf8EBTADAQH/MAsGA1UdDwQEAwIChDAT\nBgNVHSUEDDAKBggrBgEFBQcDAjAfBgNVHSMEGDAWgBR4hwLuLgfIZMEWzG4n3Axw\nfgPbezARBgorBgEEAYOKYgEBBAMCAQYwFAYIKoZIzj0EAwIGCCqGSM49AwEHA0cA\nMEQCIC7J46SxDDz3LjDNrEPjjwP2prgMEMh7r/gJpouQHBk+AiA+KzXD0d5miI86\nD2mYK4C3tRli3X3VgnCe8COqfYyuQg==\n-----END CERTIFICATE-----"

        val address = "localhost:9080/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H"
        val nonce = "bd1dc046-e347-4475-ad76-2a21c2be4d32"

        val res = verifyNodeSignature(cert, signature, (address + nonce).toByteArray())
        assertTrue(res.isRight())

        // Unhappy case, cert string is invalid certificate

        // Unhappy case, certificate doesn't match signature

        // Unhappy case, invalid signature

        // Unhappy case, invalid data
    }
}