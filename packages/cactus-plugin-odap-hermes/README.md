# @hyperledger/cactus-odap-hermes
The package provides Cactus to standardize cross chain transaction

##### Using this we could perform:
- Negotiate between 2 parties intend to transfer asset on different ledger
- "Delete and lock asset on a ledger" then "create asset on another ledger" atomicly

##### Prerequisites
In the root of the project to install the dependencies execute the command:
`npm run configure`
**Compiling**:
In the project root folder, run this command to compile the plugin and create the dist directory:
`npm run tsc`

#####API Endpoints
Similar as Cactus, odap uses openapi to generate api paths.
By the file:
https://github.com/jscode017/cactus/blob/odap-pr/packages/cactus-plugin-odap-hermes/src/main/json/openapi.json
The endpoints are:
- Phase1TransferInitiationV1
- Phase2TransferCommenceV1
- Phase2LockEvidenceV1
- Phase3CommitPreparationV1
- Phase3CommitFinalV1
- Phase3TransferCompleteV1
- SendClientRequestV1
##### Use case
An end user would want to operatie a cross chain transaction: lock and delete an asset on a source ledger(we use hyperledger besu in our implementation) and create a new asset on a target ledger(we use hyperledger fabric in our implementation).
And the operations on source ledger is via client odap gateway; operations on target ledger is via server odap gateway.
The end user call the SendClientRequestV1API on client odap gateway to initiate the cross chain transaction.
Then the client odap gateway would sequentially called
1. Phase1TransferInitiationV1
2.  Phase2TransferCommenceV1
3. Phase2LockEvidenceV1
4. Phase3CommitPreparationV1
5. Phase3CommitFinalV1
6. Phase3TransferCompleteV1
The sequence diagram:
![odap-sequence-diagram](https://mermaid.ink/img/eyJjb2RlIjoic2VxdWVuY2VEaWFncmFtXG4gICAgcGFydGljaXBhbnQgRW5kVXNlclxuICAgIHBhcnRpY2lwYW50IENsaWVudE9EQVBHYXRld2F5XG4gICAgcGFydGljaXBhbnQgSHlwZXJsZWRnZXJGYWJyaWNcbiAgICBwYXJ0aWNpcGFudCBTZXJ2ZXJPREFQR2F0ZXdheVxuICAgIHBhcnRpY2lwYW50IEh5cGVybGVkZ2VyQmVzdVxuICAgIEVuZFVzZXItPj5DbGllbnRPREFQR2F0ZXdheTogc2VuZCBjbGllbnQgcmVxdWVzdFxuICAgIENsaWVudE9EQVBHYXRld2F5LT4-U2VydmVyT0RBUEdhdGV3YXk6ICB0cmFuc2ZlciBpbml0aWF0aW9uIHJlcXVlc3RcbiAgICBTZXJ2ZXJPREFQR2F0ZXdheS0tPj5DbGllbnRPREFQR2F0ZXdheTogdHJhbnNmZXIgaW5pdGlhdGlvbiBhY2tcbiAgICBDbGllbnRPREFQR2F0ZXdheS0-PlNlcnZlck9EQVBHYXRld2F5OiAgdHJhbnNmZXIgY29tbWVuY2UgcmVxdWVzdFxuICAgIFNlcnZlck9EQVBHYXRld2F5LS0-PkNsaWVudE9EQVBHYXRld2F5OiB0cmFuc2ZlciBjb21tZW5jZSBhY2tcbiAgICBDbGllbnRPREFQR2F0ZXdheS0-Pkh5cGVybGVkZ2VyRmFicmljOiBsb2NrIGFzc2V0XG4gICAgSHlwZXJsZWRnZXJGYWJyaWMtLT4-Q2xpZW50T0RBUEdhdGV3YXk6IHRyYW5zYWN0aW9uIHJlY2VpcHQgZm9yIGxvY2tpbmcgYXNzZXRcbiAgICBDbGllbnRPREFQR2F0ZXdheS0-PlNlcnZlck9EQVBHYXRld2F5OiAgbG9jayBldmlkZW5jZSByZXF1ZXN0XG4gICAgU2VydmVyT0RBUEdhdGV3YXktPj5DbGllbnRPREFQR2F0ZXdheTogbG9jayBldmlkZW5jZSBhY2tcbiAgICBDbGllbnRPREFQR2F0ZXdheS0-PlNlcnZlck9EQVBHYXRld2F5OiAgY29tbWl0IHByZXBhcmUgcmVxdWVzdFxuICAgIFNlcnZlck9EQVBHYXRld2F5LS0-PkNsaWVudE9EQVBHYXRld2F5OiBjb21taXQgcHJlcGFyZSBhY2tcbiAgICBDbGllbnRPREFQR2F0ZXdheS0-Pkh5cGVybGVkZ2VyRmFicmljOiBkZWxldGUgYXNzZXRcbiAgICBIeXBlcmxlZGdlckZhYnJpYy0tPj5DbGllbnRPREFQR2F0ZXdheTogdHJhbnNhY3Rpb24gcmVjZWlwdCBmb3IgZGVsZXRpbmcgYXNzZXRcbiAgICBDbGllbnRPREFQR2F0ZXdheS0-PlNlcnZlck9EQVBHYXRld2F5OiAgY29tbWl0IGZpbmFsIHJlcXVlc3RcbiAgICBTZXJ2ZXJPREFQR2F0ZXdheS0-Pkh5cGVybGVkZ2VyQmVzdTogY3JlYXRlIGFzc2V0XG4gICAgSHlwZXJsZWRnZXJCZXN1LS0-PlNlcnZlck9EQVBHYXRld2F5OiB0cmFuc2FjdGlvbiByZWNlaXB0IGZvciBjcmVhdGluZyBhc3NldFxuICAgIFNlcnZlck9EQVBHYXRld2F5LS0-PkNsaWVudE9EQVBHYXRld2F5OiBjb21taXQgZmluYWwgYWNrXG4gICAgQ2xpZW50T0RBUEdhdGV3YXktPj5TZXJ2ZXJPREFQR2F0ZXdheTogIHRyYW5zZmVyIGNvbXBsZXRlXG4gICAgQ2xpZW50T0RBUEdhdGV3YXktLT4-RW5kVXNlcjogIHNlbmQgY2xpZW50IGFja1xuXG4iLCJtZXJtYWlkIjp7InRoZW1lIjoiZGVmYXVsdCJ9LCJ1cGRhdGVFZGl0b3IiOnRydWUsImF1dG9TeW5jIjp0cnVlLCJ1cGRhdGVEaWFncmFtIjp0cnVlfQ "odap-sequence-diagram")
##### How to test the files:
To have a full test
With ledger connectors:
https://github.com/jscode017/cactus/blob/odap-pr/packages/cactus-plugin-odap-hermes/src/test/typescript/integration/odap/odap-api-call-with-ledger-connector.test.ts
Without ledger connectors:
https://github.com/jscode017/cactus/blob/odap-pr/packages/cactus-plugin-odap-hermes/src/test/typescript/integration/odap/odap-api-call.test.ts
For developers who would want to test separate step of odap
please ref to other test files in:
https://github.com/jscode017/cactus/tree/odap-pr/packages/cactus-plugin-odap-hermes/src/test/typescript/integration/odap

###### Some developer rules:
How to use the packages:
######Create odap gateway:
Please first redger to cactus-plugins of

- Hyperledger Fabric
- Hyperledger Besu
- IPFS

To know how to create fabric, besu, ipfs api clients.
And suppose you have:
-Hyperledger Fabric api client on url: http://localhost:8045
-Hyperledger Besu api client on url: http://localhost:8046
-IPFS api client on url: http://localhost:8047
Then you should create odap gateway as follow:

`const odapPluginOptions: OdapGatewayConstructorOptions= {

     name: "cactus-plugin#odapGateway",
     dltIDs: ["supported dlts here"],
     instanceId: uuidV4(),    
     ipfsPath:  http://localhost:8047,  
     besuAssetID: "whatever",
     besuPath:  http://localhost:8046,
     besuWeb3SigningCredential:
     besuWeb3SigningCredential,
     besuContractName: besuContractName,
     besuKeychainId: besuKeychainId,
     fabricPath:  http://localhost:8045,
     fabricSigningCredential: fabricSigningCredential,
     fabricChannelName: fabricChannelName,
     fabricContractName: fabricContractName,
     abricAssetID: fabricAssetID,
   };
   
   const odapGateway = new OdapGateway(odapPluginOptions);`
   
The full test file: 
https://github.com/jscode017/cactus/blob/odap-pr/packages/cactus-plugin-odap-hermes/src/test/typescript/integration/odap/odap-api-call-with-ledger-connector.test.ts
provide a good detailed example

Then call SendClientRequestV1 to initiate the transfer from client ODAP gateway
####Contributing
We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTIRBUTING.md](https://github.com/hyperledger/cactus/blob/main/CONTRIBUTING.md "CONTIRBUTING.md") to get started.

####License
This distribution is published under the Apache License Version 2.0 found in the [LICENSE ](https://github.com/hyperledger/cactus/blob/main/LICENSE "LICENSE ")file.



