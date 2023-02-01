<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Fabric Views

- RFC: 03-003
- Authors: Allison Irvin, Antony Targett, Christian Vecchiola, Dileban Karunamoorthy, Ermyas Abebe, Nick Waywood, Venkatraman Ramakrishna
- Status: Proposed
- Since: 02-Jan-2023

## Addressing a Fabric View

```
operator = channel-name , ":" , chaincode-name , ":" , func-name , [ ":" , { argument } ] ;
```

Example:

- Channel Name: trade-channel
- Chaincode Name: trade-chaincode
- Function Name: getbilloflading
- Arguments: 10012

```
operator = trade-channel:trade-chaincode:getbilloflading:10012
```

## View Data Definition

The view from a Fabric network ledger (i.e., channel) is specified below. It consists of an array of endorsed (i.e., signed) responses to state requests made through chaincode operations (called "proposals" in Fabric parlance). The reason why we need to retain the proposal response payload field in each array element instead of keeping just one copy is because the data blobs within those different payloads may be different while being semantically identical (they may be different because of non-deterministic serialization and encryption operations carried out by the [interoperation module](../../models/infrastructure/interoperation-modules.md) during state lookup and proof generation.)

```protobuf
message FabricView {
  message EndorsedProposalResponse {
    // `ProposalResponsePayload` is the output produced by each peer and signed as a serialized blob
    // https://github.com/hyperledger/fabric-protos-go/blob/master/peer/proposal_response.pb.go#L176
    // `ProposalResponsePayload` contains an `Extension` field which is of type `ChaincodeAction`
    // https://github.com/hyperledger/fabric-protos-go/blob/master/peer/proposal.pb.go#L280
    // We only need the `ProposalHash`, `ChaincodeId` and `Response` fields.
    protos.ProposalResponsePayload payload = 1;
    // Each `Endorsement` is an identity coupled with a signature
    // https://github.com/hyperledger/fabric-protos-go/blob/master/peer/proposal_response.pb.go#L242
    protos.Endorsement endorsement = 2;
  }
  repeated EndorsedProposalResponse endorsed_proposal_responses = 1;
}
```

The `payload` field in each array element within this view itself contains a `Payload` field within, which will be a serialized form of the `InteropPayload` structure as follows:

```protobuf
message InteropPayload {
  // Raw payload from the application chaincode (or a serialized form of 'ConfidentialPayload' if encrypted)
  bytes payload = 1;
  // The full address string (i.e. address  = location-segment , "/", ledger-segment "/" , view-segment)
  string address = 2;
  // Flag indicating whether the 'payload' field contains encrypted data
  bool confidential = 3;
  // Serialized certificate containing the public key used for encryption (blank if 'confidential' is set to false)
  string requestor_certificate = 4;
  // Nonce from the data sharing request 'Query' message
  string nonce = 5;
}

message ConfidentialPayload {
  bytes encrypted_payload = 1;
  enum HashType {
    HMAC = 0;
  }
  HashType hash_type = 2;
  bytes hash = 3;
}

message ConfidentialPayloadContents {
  // Raw payload from the application chaincode
  bytes payload = 1;
  bytes random  = 2;
}
```

The interoperation module (here: Weaver Fabric Interoperation Chaincode) will wrap the response from the application chaincode in the `InteropPayload` structure. This is done so we can leverage the `Endorsement`s from the peers to verify that the `ProposalResponsePayload` corresponds to the correct query view address. By doing this, the `ProposalHash` inside of the `ProposalResponsePayload` doesn't need to be matched with the `Proposal` (and therefore the `Proposal` no longer needs to be included in the `FabricView`).

Optionally, the response from the application chaincode is [encrypted and an associated hash (or MAC) generated](../../models/security/confidentiality.md). The plaintext response is available in the `payload` field of a `ConfidentialPayloadContents` structure, which itself is serialized and encrypted using the public key in the `InteropPayload`'s `requestor_certificate` field. The result of this encryption is specified in the `encrypted_payload` field of a `ConfidentialPayload` structure, which additional contains hash information used later (by the destination/requesting network) to validate the authenticity of the decrypted plaintext. Finally, the serialized form of the `ConfidentialPayload` structure is specified in the `payload` field of the `InteropPayload` structure.

- Fabric protobuf reference (from current snapshot of `release-2.1` branch):
  * [ProposalResponsePayload](https://github.com/hyperledger/fabric-protos/blob/release-2.1/peer/proposal_response.proto#L61)
  * [Endorsement](https://github.com/hyperledger/fabric-protos/blob/release-2.1/peer/proposal_response.proto#L86)

## Example
