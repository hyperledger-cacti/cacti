export const sampleBlock = {
  blockNumber: 3,
  blockHash:
    "0xe6656aa10d9f73fde8db5b0ce6bba9a2bc3118c72ef9d69b53b9f7c512139d60",
  previousBlockHash:
    "0xf8c0f8c4d4ae2f3c2140a1e63d940734d27549fa8829e1c5c994bcc3182f0caa",
  transactionCount: 1,
  cactiTransactionsEvents: [
    {
      hash: "4affb3661c2a8075e52e8e6826e1768616bb1f8c588b1baa54368a3996a54de8",
      channelId: "mychannel",
      timestamp: "2024-06-10T10:55:26.036Z",
      protocolVersion: 0,
      transactionType: "ENDORSER_TRANSACTION",
      epoch: 0,
      actions: [
        {
          functionName: "MyFunctionName",
          functionArgs: ["foo", "bar"],
          chaincodeId: "myChaincode",
          creator: {
            mspid: "Org1MSP",
            cert: {
              serialNumber: "16C8C9A05A2B7EFA6ED794F28A2FBCE6DED1C86C",
              subject:
                "C=US\nST=North Carolina\nO=Hyperledger\nOU=admin\nCN=org1admin",
              issuer:
                "C=US\nST=North Carolina\nL=Durham\nO=org1.example.com\nCN=ca.org1.example.com",
              subjectAltName: "DNS:9071369d9d11",
              validFrom: "Jun 10 10:50:00 2024 GMT",
              validTo: "Jun 10 10:55:00 2025 GMT",
              pem: "-----BEGIN CERTIFICATE-----\nMIICqTCCAlCgAwIBAgIUFsjJoForfvpu15Tyii+85t7RyGwwCgYIKoZIzj0EAwIw\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjQwNjEwMTA1MDAwWhcNMjUwNjEwMTA1NTAw\nWjBgMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExFDASBgNV\nBAoTC0h5cGVybGVkZ2VyMQ4wDAYDVQQLEwVhZG1pbjESMBAGA1UEAxMJb3JnMWFk\nbWluMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEEaCjVDW8X3Fpa7lXTrjNACJG\nmslK1ppx9uzh9Fqk2lLN7GxcJSi2hcIyTK9+udwbRynDHl1HgMG/fLBfqrkCNKOB\n1zCB1DAOBgNVHQ8BAf8EBAMCB4AwDAYDVR0TAQH/BAIwADAdBgNVHQ4EFgQUTw/b\nSs21vEgoQbb2wnwXF4DkCTEwHwYDVR0jBBgwFoAUgN29gMPVb3dfnq0ngxTg67qy\niQkwFwYDVR0RBBAwDoIMOTA3MTM2OWQ5ZDExMFsGCCoDBAUGBwgBBE97ImF0dHJz\nIjp7ImhmLkFmZmlsaWF0aW9uIjoiIiwiaGYuRW5yb2xsbWVudElEIjoib3JnMWFk\nbWluIiwiaGYuVHlwZSI6ImFkbWluIn19MAoGCCqGSM49BAMCA0cAMEQCIGzNQ3Ut\niHpsKZzzIadYTY7TlC7FliD+XI89FyzM2RqoAiALJ2yU42wNnfrRuByQQN9cHz1j\nArKZknDfP6HYxUS0RQ==\n-----END CERTIFICATE-----\n",
            },
          },
          endorsements: [
            {
              signer: {
                mspid: "Org1MSP",
                cert: {
                  serialNumber: "3D697828B3244EDC75A95CCC30FC5013B904F6E5",
                  subject:
                    "C=US\nST=North Carolina\nO=Hyperledger\nOU=peer\nCN=peer0",
                  issuer:
                    "C=US\nST=North Carolina\nL=Durham\nO=org1.example.com\nCN=ca.org1.example.com",
                  subjectAltName: "DNS:9071369d9d11",
                  validFrom: "Jun 10 10:50:00 2024 GMT",
                  validTo: "Jun 10 10:55:00 2025 GMT",
                  pem: "-----BEGIN CERTIFICATE-----\nMIICnzCCAkagAwIBAgIUPWl4KLMkTtx1qVzMMPxQE7kE9uUwCgYIKoZIzj0EAwIw\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjQwNjEwMTA1MDAwWhcNMjUwNjEwMTA1NTAw\nWjBbMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExFDASBgNV\nBAoTC0h5cGVybGVkZ2VyMQ0wCwYDVQQLEwRwZWVyMQ4wDAYDVQQDEwVwZWVyMDBZ\nMBMGByqGSM49AgEGCCqGSM49AwEHA0IABOBN1m+Sd4tJgk7cj/2tjncS0DDaZrpB\nXScgGyyvFu7WvUNAX5huTiUcP6RPnfQ2op1fgaPvHwVWQ4sLwU3wYqSjgdIwgc8w\nDgYDVR0PAQH/BAQDAgeAMAwGA1UdEwEB/wQCMAAwHQYDVR0OBBYEFOWzZpC41lih\n5kCb9Dhd/w626Ve7MB8GA1UdIwQYMBaAFIDdvYDD1W93X56tJ4MU4Ou6sokJMBcG\nA1UdEQQQMA6CDDkwNzEzNjlkOWQxMTBWBggqAwQFBgcIAQRKeyJhdHRycyI6eyJo\nZi5BZmZpbGlhdGlvbiI6IiIsImhmLkVucm9sbG1lbnRJRCI6InBlZXIwIiwiaGYu\nVHlwZSI6InBlZXIifX0wCgYIKoZIzj0EAwIDRwAwRAIgCNafIs0XRatMvyu1Mj62\n4LVXfIgyolfaFaOZaFtjJdYCIA4bciJH/vMOdbxoAbNr7B83P1GEfHLdmd2yy7D1\nVi3u\n-----END CERTIFICATE-----\n",
                },
              },
              signature:
                "0x304402205f576c57e2c29806c7636e6ed4d9b02e842ccbbd01dd333c8716efa927e74bac022079be4c059a36fba7ef9a767275e7d8e0f020a6898d930a9d9f2ab93a5e0d8a9b",
            },
          ],
        },
      ],
    },
  ],
};

export const invalidSampleBlock = {
  blockNumber: 3,
  blockHash:
    "0xe6656aa10d9f73fde8db5b0ce6bba9a2bc3118c72ef9d69b53b9f7c512139d60",
  previousBlockHash:
    "0xf8c0f8c4d4ae2f3c2140a1e63d940734d27549fa8829e1c5c994bcc3182f0caa",
  transactionCount: 1,
  cactiTransactionsEvents: [
    {
      hash: "4affb3661c2a8075e52e8e6826e1768616bb1f8c588b1baa54368a3996a54de8",
      channelId: "mychannel",
      timestamp: "2024-06-10T10:55:26.036Z",
      protocolVersion: 0,
      type: "ENDORSER_TRANSACTION",
      epoch: 0,
      actions: [
        {
          functionName: "MyFunctionName",
          functionArgs: ["foo", "bar"],
          chaincodeId: "myChaincode",
          creator: {
            mspid: "Org1MSP",
            cert: {
              serialNumber: "16C8C9A05A2B7EFA6ED794F28A2FBCE6DED1C86C",
              subject:
                "C=US\nST=North Carolina\nO=Hyperledger\nOU=admin\nCN=org1admin",
              issuer:
                "C=US\nST=North Carolina\nL=Durham\nO=org1.example.com\nCN=ca.org1.example.com",
              subjectAltName: "DNS:9071369d9d11",
              validFrom: "Jun 10 10:50:00 2024 GMT",
              validTo: "Jun 10 10:55:00 2025 GMT",
              pem: "-----BEGIN CERTIFICATE-----\nMIICqTCCAlCgAwIBAgIUFsjJoForfvpu15Tyii+85t7RyGwwCgYIKoZIzj0EAwIw\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjQwNjEwMTA1MDAwWhcNMjUwNjEwMTA1NTAw\nWjBgMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExFDASBgNV\nBAoTC0h5cGVybGVkZ2VyMQ4wDAYDVQQLEwVhZG1pbjESMBAGA1UEAxMJb3JnMWFk\nbWluMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEEaCjVDW8X3Fpa7lXTrjNACJG\nmslK1ppx9uzh9Fqk2lLN7GxcJSi2hcIyTK9+udwbRynDHl1HgMG/fLBfqrkCNKOB\n1zCB1DAOBgNVHQ8BAf8EBAMCB4AwDAYDVR0TAQH/BAIwADAdBgNVHQ4EFgQUTw/b\nSs21vEgoQbb2wnwXF4DkCTEwHwYDVR0jBBgwFoAUgN29gMPVb3dfnq0ngxTg67qy\niQkwFwYDVR0RBBAwDoIMOTA3MTM2OWQ5ZDExMFsGCCoDBAUGBwgBBE97ImF0dHJz\nIjp7ImhmLkFmZmlsaWF0aW9uIjoiIiwiaGYuRW5yb2xsbWVudElEIjoib3JnMWFk\nbWluIiwiaGYuVHlwZSI6ImFkbWluIn19MAoGCCqGSM49BAMCA0cAMEQCIGzNQ3Ut\niHpsKZzzIadYTY7TlC7FliD+XI89FyzM2RqoAiALJ2yU42wNnfrRuByQQN9cHz1j\nArKZknDfP6HYxUS0RQ==\n-----END CERTIFICATE-----\n",
            },
          },
          endorsements: [
            {
              signer: {
                foo: "Org1MSP",
              },
            },
          ],
        },
      ],
    },
  ],
};

export const sampleDiscoveryResults = {
  msps: {
    Org2MSP: {
      id: "Org2MSP",
      name: "Org2MSP",
      organizationalUnitIdentifiers: [],
      rootCerts:
        "-----BEGIN CERTIFICATE-----\nMIICHjCCAcWgAwIBAgIUfFNit/ZNZY2SIbGN6ekejAdRoikwCgYIKoZIzj0EAwIw\nbDELMAkGA1UEBhMCVUsxEjAQBgNVBAgTCUhhbXBzaGlyZTEQMA4GA1UEBxMHSHVy\nc2xleTEZMBcGA1UEChMQb3JnMi5leGFtcGxlLmNvbTEcMBoGA1UEAxMTY2Eub3Jn\nMi5leGFtcGxlLmNvbTAeFw0yNTA0MDIwODI2MDBaFw00MDAzMjkwODI2MDBaMGwx\nCzAJBgNVBAYTAlVLMRIwEAYDVQQIEwlIYW1wc2hpcmUxEDAOBgNVBAcTB0h1cnNs\nZXkxGTAXBgNVBAoTEG9yZzIuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2NhLm9yZzIu\nZXhhbXBsZS5jb20wWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAARofvaM3udqgShD\njgunnP4hBLepJAdJJXVaF4gGwjGN7u0OJsUYefwoaZsIieJ+fJkpk+KWfV6esw5l\nopNQ7k0/o0UwQzAOBgNVHQ8BAf8EBAMCAQYwEgYDVR0TAQH/BAgwBgEB/wIBATAd\nBgNVHQ4EFgQUngIcE6RHSr5A0IcqEyqz6Gi27l4wCgYIKoZIzj0EAwIDRwAwRAIg\nWSvPOIUDa/rTJPRR9t54UzsY9mHHlxaTwFSTLTPuKdoCIG369U7uOHBCkSFiIe9s\nxQAnpvZCCd+l0XXJlx7h0a2M\n-----END CERTIFICATE-----\n",
      intermediateCerts: "",
      admins: "",
      tlsRootCerts:
        "-----BEGIN CERTIFICATE-----\nMIICHjCCAcWgAwIBAgIUfFNit/ZNZY2SIbGN6ekejAdRoikwCgYIKoZIzj0EAwIw\nbDELMAkGA1UEBhMCVUsxEjAQBgNVBAgTCUhhbXBzaGlyZTEQMA4GA1UEBxMHSHVy\nc2xleTEZMBcGA1UEChMQb3JnMi5leGFtcGxlLmNvbTEcMBoGA1UEAxMTY2Eub3Jn\nMi5leGFtcGxlLmNvbTAeFw0yNTA0MDIwODI2MDBaFw00MDAzMjkwODI2MDBaMGwx\nCzAJBgNVBAYTAlVLMRIwEAYDVQQIEwlIYW1wc2hpcmUxEDAOBgNVBAcTB0h1cnNs\nZXkxGTAXBgNVBAoTEG9yZzIuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2NhLm9yZzIu\nZXhhbXBsZS5jb20wWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAARofvaM3udqgShD\njgunnP4hBLepJAdJJXVaF4gGwjGN7u0OJsUYefwoaZsIieJ+fJkpk+KWfV6esw5l\nopNQ7k0/o0UwQzAOBgNVHQ8BAf8EBAMCAQYwEgYDVR0TAQH/BAgwBgEB/wIBATAd\nBgNVHQ4EFgQUngIcE6RHSr5A0IcqEyqz6Gi27l4wCgYIKoZIzj0EAwIDRwAwRAIg\nWSvPOIUDa/rTJPRR9t54UzsY9mHHlxaTwFSTLTPuKdoCIG369U7uOHBCkSFiIe9s\nxQAnpvZCCd+l0XXJlx7h0a2M\n-----END CERTIFICATE-----\n",
      tlsIntermediateCerts: "",
    },
    OrdererMSP: {
      id: "OrdererMSP",
      name: "OrdererMSP",
      organizationalUnitIdentifiers: [],
      rootCerts:
        "-----BEGIN CERTIFICATE-----\nMIICCjCCAbGgAwIBAgIUHxMC6sxNcaZZCyez3FqdrC2KbnUwCgYIKoZIzj0EAwIw\nYjELMAkGA1UEBhMCVVMxETAPBgNVBAgTCE5ldyBZb3JrMREwDwYDVQQHEwhOZXcg\nWW9yazEUMBIGA1UEChMLZXhhbXBsZS5jb20xFzAVBgNVBAMTDmNhLmV4YW1wbGUu\nY29tMB4XDTI1MDQwMjA4MjYwMFoXDTQwMDMyOTA4MjYwMFowYjELMAkGA1UEBhMC\nVVMxETAPBgNVBAgTCE5ldyBZb3JrMREwDwYDVQQHEwhOZXcgWW9yazEUMBIGA1UE\nChMLZXhhbXBsZS5jb20xFzAVBgNVBAMTDmNhLmV4YW1wbGUuY29tMFkwEwYHKoZI\nzj0CAQYIKoZIzj0DAQcDQgAEgSssN7HxPWwg2+vhERmNqt5jtmUn9dJpdm1nEBVY\nqRDEpnsssIo7O0riIeywxFnhXSPTDr83mHX5ROFLONh/CKNFMEMwDgYDVR0PAQH/\nBAQDAgEGMBIGA1UdEwEB/wQIMAYBAf8CAQEwHQYDVR0OBBYEFDs3WE+sRoD6Gdh5\n9mzTpZ5RkOdGMAoGCCqGSM49BAMCA0cAMEQCIAjAssqpRqiuPjRwxWDvMYxx9kBy\nMZbalwUjZ+xwbyG4AiAyQuYy6rpCw/IczpJdqZAbwwkYrUYiJd1kecwwnXxu8w==\n-----END CERTIFICATE-----\n",
      intermediateCerts: "",
      admins: "",
      tlsRootCerts:
        "-----BEGIN CERTIFICATE-----\nMIICCjCCAbGgAwIBAgIUHxMC6sxNcaZZCyez3FqdrC2KbnUwCgYIKoZIzj0EAwIw\nYjELMAkGA1UEBhMCVVMxETAPBgNVBAgTCE5ldyBZb3JrMREwDwYDVQQHEwhOZXcg\nWW9yazEUMBIGA1UEChMLZXhhbXBsZS5jb20xFzAVBgNVBAMTDmNhLmV4YW1wbGUu\nY29tMB4XDTI1MDQwMjA4MjYwMFoXDTQwMDMyOTA4MjYwMFowYjELMAkGA1UEBhMC\nVVMxETAPBgNVBAgTCE5ldyBZb3JrMREwDwYDVQQHEwhOZXcgWW9yazEUMBIGA1UE\nChMLZXhhbXBsZS5jb20xFzAVBgNVBAMTDmNhLmV4YW1wbGUuY29tMFkwEwYHKoZI\nzj0CAQYIKoZIzj0DAQcDQgAEgSssN7HxPWwg2+vhERmNqt5jtmUn9dJpdm1nEBVY\nqRDEpnsssIo7O0riIeywxFnhXSPTDr83mHX5ROFLONh/CKNFMEMwDgYDVR0PAQH/\nBAQDAgEGMBIGA1UdEwEB/wQIMAYBAf8CAQEwHQYDVR0OBBYEFDs3WE+sRoD6Gdh5\n9mzTpZ5RkOdGMAoGCCqGSM49BAMCA0cAMEQCIAjAssqpRqiuPjRwxWDvMYxx9kBy\nMZbalwUjZ+xwbyG4AiAyQuYy6rpCw/IczpJdqZAbwwkYrUYiJd1kecwwnXxu8w==\n-----END CERTIFICATE-----\n",
      tlsIntermediateCerts: "",
    },
    Org1MSP: {
      id: "Org1MSP",
      name: "Org1MSP",
      organizationalUnitIdentifiers: [],
      rootCerts:
        "-----BEGIN CERTIFICATE-----\nMIICJjCCAc2gAwIBAgIUKlBnHkZhAX6EvIRadEAc5fcVZdUwCgYIKoZIzj0EAwIw\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjUwNDAyMDgyNjAwWhcNNDAwMzI5MDgyNjAw\nWjBwMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExDzANBgNV\nBAcTBkR1cmhhbTEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMT\nY2Eub3JnMS5leGFtcGxlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABH/R\nyYrvRTkbEi1o/VRUMqi9WPfFh2ANpzgq+ax1OJufEpa6duDXNOPV7+jJ8jrZGSsG\ndB7HSVxmQ4YJM7dFcn+jRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAG\nAQH/AgEBMB0GA1UdDgQWBBQpN+0sYu6en762EX2o1ls4QWjgfzAKBggqhkjOPQQD\nAgNHADBEAiB4tKn8Tv5h6cLy69UIT/kECozoWE8T41OQSism/nW8hAIgEMPR2sbU\nvu6ZKkeg4vmfDjqXl/A5e74Mwf+A0+FnooE=\n-----END CERTIFICATE-----\n",
      intermediateCerts: "",
      admins: "",
      tlsRootCerts:
        "-----BEGIN CERTIFICATE-----\nMIICJjCCAc2gAwIBAgIUKlBnHkZhAX6EvIRadEAc5fcVZdUwCgYIKoZIzj0EAwIw\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjUwNDAyMDgyNjAwWhcNNDAwMzI5MDgyNjAw\nWjBwMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExDzANBgNV\nBAcTBkR1cmhhbTEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMT\nY2Eub3JnMS5leGFtcGxlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABH/R\nyYrvRTkbEi1o/VRUMqi9WPfFh2ANpzgq+ax1OJufEpa6duDXNOPV7+jJ8jrZGSsG\ndB7HSVxmQ4YJM7dFcn+jRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAG\nAQH/AgEBMB0GA1UdDgQWBBQpN+0sYu6en762EX2o1ls4QWjgfzAKBggqhkjOPQQD\nAgNHADBEAiB4tKn8Tv5h6cLy69UIT/kECozoWE8T41OQSism/nW8hAIgEMPR2sbU\nvu6ZKkeg4vmfDjqXl/A5e74Mwf+A0+FnooE=\n-----END CERTIFICATE-----\n",
      tlsIntermediateCerts: "",
    },
  },
  orderers: {
    OrdererMSP: {
      endpoints: [
        {
          host: "orderer.example.com",
          port: 7050,
          name: "orderer.example.com:7050",
        },
      ],
    },
  },
  peersByMSP: {
    Org2MSP: {
      peers: [
        {
          mspid: "Org2MSP",
          endpoint: "peer0.org2.example.com:9051",
          name: "peer0.org2.example.com:9051",
          ledgerHeight: 15,
          chaincodes: [
            {
              name: "basic",
              version: "1",
            },
            {
              name: "copyAssetTrade",
              version: "1",
            },
            {
              name: "_lifecycle",
              version: "1",
            },
          ],
        },
      ],
    },
    Org1MSP: {
      peers: [
        {
          mspid: "Org1MSP",
          endpoint: "peer0.org1.example.com:7051",
          name: "peer0.org1.example.com:7051",
          ledgerHeight: 15,
          chaincodes: [
            {
              name: "basic",
              version: "1",
            },
            {
              name: "copyAssetTrade",
              version: "1",
            },
            {
              name: "_lifecycle",
              version: "1",
            },
          ],
        },
      ],
    },
  },
  timestamp: 1743584187645,
};
