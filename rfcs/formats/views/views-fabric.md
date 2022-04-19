<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Fabric Views

- RFC: 03-003
- Authors: Allison Irvin, Antony Targett, Christian Vecchiola, Dileban Karunamoorthy, Ermyas Abebe, Nick Waywood, Venkatraman Ramakrishna
- Status: Proposed
- Since: 13-Aug-2020

## Addressing a Fabric View

```
operator = channel-name , ":" , chaincode-name , ":" , func-name , [ ":" , { argument } ] ;
```

Example:

-   Channel Name: trade-channel
-   Chaincode Name: trade-chaincode
-   Function Name: getbilloflading
-   Arguments: 10012

```
operator = trade-channel:trade-chaincode:getbilloflading:10012
```

## View Data Definition

Note: Encryption information is temporarily removed from the below structure until we decide how we want to support encryption in a general, cross-network way (the custom ESCC code used previously only worked fabric-fabric)

```protobuf
message FabricView {
  // `Response` from the peers
  // https://github.com/hyperledger/fabric-protos-go/blob/master/peer/proposal_response.pb.go#L113
  // We only need the `Payload` field though.
  Response response = 1;
  // `ProposalResponsePayload` is the output produced by each peer and signed as a serialized blob
  // https://github.com/hyperledger/fabric-protos-go/blob/master/peer/proposal_response.pb.go#L176
  // `ProposalResponsePayload` contains an `Extension` field which is of type `ChaincodeAction`
  // https://github.com/hyperledger/fabric-protos-go/blob/master/peer/proposal.pb.go#L280
  // We need this whole structure since this payload is what the endorements are signed on
  ProposalResponsePayload proposal_response_payload = 3;
  // Each `Endorsement` is an identity coupled with a signature
  // https://github.com/hyperledger/fabric-protos-go/blob/master/peer/proposal_response.pb.go#L242
  repeated Endorsement endorsements = 4;
}
```

The `Payload` field inside the `Response` will have the following structure:

```protobuf
message InteropPayload {
  // The raw payload from the application chaincode
  bytes payload = 1;
  // The full address string (i.e. address  = location-segment , "/", ledger-segment "/" , view-segment)
  string address = 2;
}
```

The interop chaincode will wrap the response from the application chaincode up in this `InteropPayload` structure. The reason for this is so that we can leverage the `Endorsement`s from the peers to verify that the `ProposalResponsePayload` corresponds to the correct query address. By doing this, the `ProposalHash` inside of the `ProposalResponsePayload` doesn't need to be matched with the `Proposal` (and therefore the `Proposal` no longer needs to be included in the `FabricView`).

-   Fabric protobuf reference (from current snapshot of `release-2.1` branch):
    -   [Response](https://github.com/hyperledger/fabric-protos/blob/release-2.1/peer/proposal_response.proto#L45)
    -   [ProposalResponsePayload](https://github.com/hyperledger/fabric-protos/blob/release-2.1/peer/proposal_response.proto#L61)
    -   [Endorsement](https://github.com/hyperledger/fabric-protos/blob/release-2.1/peer/proposal_response.proto#L86)

## Example
