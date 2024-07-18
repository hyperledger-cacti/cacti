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
