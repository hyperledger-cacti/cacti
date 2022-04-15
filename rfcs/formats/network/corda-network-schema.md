<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Corda Network Schema

- RFC: 03-011-appendix
- Authors: Allison Irvin, Dileban Karunamoorthy, Ermyas Abebe, Venkatraman Ramakrishna, Nick Waywood
- Status: Proposed
- Since: 11-Aug-2020

## Compatibility Zone

Corda networks (sometimes called compatibility zones) are a set of nodes that
are able to reach each other over a TCP/IP network. Networks are permissioned
and the root network certificate authority defines the extent of the Corda
network.

## Certificate Authorities

There are three levels of certificate authorities in a Corda network.

1. The root network CA defines the extent of the Corda network.
2. The doorman CA is an intermediate CA used for key signing for the nodes.
3. Each node serves as its own CA, issuing the child certificates it uses to
   sign its identity keys and TLS certs.

## Node Identity

Nodes are unambiguously identified by their X500 distinguished name. The allowed
X500 name attribute types are:

-   Organization (O)
-   State (ST) (optional)
-   Locality (L)
-   Country (C)
-   Organizational-unit (OU) (optional)
-   Common name (CN) (optional)

There are various constraints placed on the X500 name, including maximum length
of attributes, valid country attribute, etc. For the full list of constraints,
see the [Corda docs for node identity](https://docs.corda.net/docs/corda-os/4.5/node-naming.html).

## Authenticating Corda nodes as an external network

For an external network to be able to authenticate a Corda node, they must know
and trust the root network CA. Using the root network CA's public key in the
root CA's certificate, they can authenticate the Doorman CA(s) certificate by
verifying the issuing signature. Similarly the Doorman CA's public key can be used to
authenticate the node's certificate. The keys in the node's certificate are
likely what is used to sign proofs that the external network consumes, so this
final step will often be enough to validate the certificate chain. However, in
the case the node acts as its own CA to issue another set of credentials to sign
proofs, the node certificate can be used to authenticate the certifate that was
issued by the node CA.

## Example

```json
{
    "id": "Corda_Network",
    "members": {
        "Notary": {
            "value": "MIICbTCCAgmgAwIBAgIIMAXF/qwlCDMwFAYIKoZIzj0EAwIGCCqGSM49AwEHMGMxCzAJBgNVBAYTAlVTMREwDwYDVQQHEwhOZXcgWW9yazEOMAwGA1UECxMFQ29yZGExFjAUBgNVBAoTDVIzIEhvbGRDbyBMTEMxGTAXBgNVBAMTEENvcmRhIERvb3JtYW4gQ0EwHhcNMjAwNzI0MDAwMDAwWhcNMjcwNTIwMDAwMDAwWjAvMQswCQYDVQQGEwJHQjEPMA0GA1UEBwwGTG9uZG9uMQ8wDQYDVQQKDAZOb3RhcnkwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAATM47QIqtQ8ov752Ip6oA55//NLs6I+/IwwTwNeMnPA3aqHA+DvO4RS5J+eL9JgqUG7VmjnmAYAUdBOuzaBQOhGo4HQMIHNMB0GA1UdDgQWBBTtLE4xDVwGEEilVo0aLfKxJmjc+DAPBgNVHRMBAf8EBTADAQH/MAsGA1UdDwQEAwIBhjATBgNVHSUEDDAKBggrBgEFBQcDAjAfBgNVHSMEGDAWgBTr7i4wFSlArhmYHthv431/B6LCEzARBgorBgEEAYOKYgEBBAMCAQQwRQYDVR0eAQH/BDswOaA1MDOkMTAvMQswCQYDVQQGEwJHQjEPMA0GA1UEBwwGTG9uZG9uMQ8wDQYDVQQKDAZOb3RhcnmhADAUBggqhkjOPQQDAgYIKoZIzj0DAQcDSAAwRQIgKmXOQ5VT+Yk1GC5qIMPqiQgtZu+M3EoFc2fUX5z5kJYCIQCUEoMSCLOBaKC6E6CG+YMdtiWFEDcKxN3ZexxkK+Ek7Q==",
            "type": "certificate",
            "chain": [
                "MIICXjCCAfugAwIBAgIIHVb6wd3RHhIwFAYIKoZIzj0EAwIGCCqGSM49AwEHMFgxGzAZBgNVBAMMEkNvcmRhIE5vZGUgUm9vdCBDQTELMAkGA1UECgwCUjMxDjAMBgNVBAsMBWNvcmRhMQ8wDQYDVQQHDAZMb25kb24xCzAJBgNVBAYTAlVLMB4XDTE4MDcxMDAwMDAwMFoXDTI3MDUyMDAwMDAwMFowYzELMAkGA1UEBhMCVVMxETAPBgNVBAcTCE5ldyBZb3JrMQ4wDAYDVQQLEwVDb3JkYTEWMBQGA1UEChMNUjMgSG9sZENvIExMQzEZMBcGA1UEAxMQQ29yZGEgRG9vcm1hbiBDQTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABAPL3qAm4WZms5ciBVoxMQXfK7uTmHRVvWfWQ+QVYP3bMHSguHZRzB3v7EOE8RZpGDan+w007Xj7XR0+xG9SxmCjgZkwgZYwHQYDVR0OBBYEFOvuLjAVKUCuGZge2G/jfX8HosITMA8GA1UdEwEB/wQFMAMBAf8wCwYDVR0PBAQDAgGGMCMGA1UdJQQcMBoGCCsGAQUFBwMBBggrBgEFBQcDAgYEVR0lADAfBgNVHSMEGDAWgBR8rqnfuUgBKxOJC5rmRYUcORcHczARBgorBgEEAYOKYgEBBAMCAQEwFAYIKoZIzj0EAwIGCCqGSM49AwEHA0cAMEQCIBmzQXpnCo9eAxkhwMt0bBr1Q0APJXF0KuBRsFBWAa6SAiBgx6G8G9Ij7B8+y65ItLKVcs7Kh6Rdnr5/1zB/yPwfrg==",
                "MIICCTCCAbCgAwIBAgIIcFe0qctqSucwCgYIKoZIzj0EAwIwWDEbMBkGA1UEAwwSQ29yZGEgTm9kZSBSb290IENBMQswCQYDVQQKDAJSMzEOMAwGA1UECwwFY29yZGExDzANBgNVBAcMBkxvbmRvbjELMAkGA1UEBhMCVUswHhcNMTcwNTIyMDAwMDAwWhcNMjcwNTIwMDAwMDAwWjBYMRswGQYDVQQDDBJDb3JkYSBOb2RlIFJvb3QgQ0ExCzAJBgNVBAoMAlIzMQ4wDAYDVQQLDAVjb3JkYTEPMA0GA1UEBwwGTG9uZG9uMQswCQYDVQQGEwJVSzBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABGlm6LFHrVkzfuUHin36Jrm1aUMarX/NUZXw8n8gSiJmsZPlUEplJ+f/lzZMky5EZPTtCciG34pnOP0eiMd/JTCjZDBiMB0GA1UdDgQWBBR8rqnfuUgBKxOJC5rmRYUcORcHczALBgNVHQ8EBAMCAYYwIwYDVR0lBBwwGgYIKwYBBQUHAwEGCCsGAQUFBwMCBgRVHSUAMA8GA1UdEwEB/wQFMAMBAf8wCgYIKoZIzj0EAwIDRwAwRAIgDaL4SguKsNeTT7SeUkFdoCBACeG8GqO4M1KlfimphQwCICiq00hDanT5W8bTLqE7GIGuplf/O8AABlpWrUg6uiUB"
            ]
        },
        "PartyA": {
            "type": "ca",
            "value": "-----BEGIN CERTIFICATE-----\nMIIBwjCCAV+gAwIBAgIIUJkQvmKm35YwFAYIKoZIzj0EAwIGCCqGSM49AwEHMC8x\nCzAJBgNVBAYTAkdCMQ8wDQYDVQQHDAZMb25kb24xDzANBgNVBAoMBlBhcnR5QTAe\nFw0yMDA3MjQwMDAwMDBaFw0yNzA1MjAwMDAwMDBaMC8xCzAJBgNVBAYTAkdCMQ8w\nDQYDVQQHDAZMb25kb24xDzANBgNVBAoMBlBhcnR5QTAqMAUGAytlcAMhAMMKaREK\nhcTgSBMMzK81oPUSPoVmG/fJMLXq/ujSmse9o4GJMIGGMB0GA1UdDgQWBBRMXtDs\nKFZzULdQ3c2DCUEx3T1CUDAPBgNVHRMBAf8EBTADAQH/MAsGA1UdDwQEAwIChDAT\nBgNVHSUEDDAKBggrBgEFBQcDAjAfBgNVHSMEGDAWgBR4hwLuLgfIZMEWzG4n3Axw\nfgPbezARBgorBgEEAYOKYgEBBAMCAQYwFAYIKoZIzj0EAwIGCCqGSM49AwEHA0cA\nMEQCIC7J46SxDDz3LjDNrEPjjwP2prgMEMh7r/gJpouQHBk+AiA+KzXD0d5miI86\nD2mYK4C3tRli3X3VgnCe8COqfYyuQg==\n-----END CERTIFICATE-----",
            "chain": []
        }
    },
    "linearId": {
        "id": "54a6b7d8-820b-42d3-8362-0bcd22452e50",
        "externalId": ""
    },
    "participants": []
}
```
