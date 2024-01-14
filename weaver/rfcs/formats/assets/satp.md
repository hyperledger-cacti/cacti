<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Secure Asset Transfer (SAT)

- RFC: 
- Authors: Zakwan Jaroucheh, Venkatraman Ramakrishna, Sandeep Nishad, Rafael Belchior
- Status: Proposed
- Since: 04-Sep-2023

## Summary
This document specifies the data formats used in the [secure asset transfer protocol (SATP)](../../protocols/satp/asset-transfer/generic.md). The structures defined in this document are generic and the operations on them are generic (see the protocol specification for details.) These structures are oblivious to the specifications and semantics of any digital asset maintained by any DLT application (e.g., any application chaincode in Fabric or any CorDapp in Corda).

## Transfer Initiation Claims negotiations (Stage-1)

The purpose of this stage is for the sender gateway (G1) and the receiver gateway (G2) to agree on the asset instance to be transferred from the origin network NW1 to the destination network NW2. In addition, the gateways must exchange validated information or artifacts regarding the originator and beneficiary of the asset transfer, and exchange gateway-specific and network-specific parameters.

These artifacts are contained in the Transfer Initiation Claims set that is sent from gateway G1 to G2. The set of claims may be negotiated between GH1 and G2 in multi-round set of messages. The first message (Transfer Proposal Claims) maybe multi-round in the sense there is a negotiation of the claims between G1 and G2. G1 sends the signed Transfer Initialization Claim to G2:

```protobuf
message TransferProposalClaimsRequest {
  string message_type = 1;
  string asset_asset_id = 2;
  string asset_profile_id = 3;
  string verified_originator_entity_id = 4;
  string verified_beneficiary_entity_id = 5;
  string originator_pubkey = 6;
  string beneficiary_pubkey = 7;
  string sender_gateway_network_id = 8;
  string recipient_gateway_network_id = 9;
  string client_identity_pubkey = 10;
  string server_identity_pubkey = 11;
  string sender_gateway_owner_id = 12;
  string receiver_gateway_owner_id = 13;
}
```

G2 accepts by signing Receipt containing hash of the TransferProposalClaimsRequest:

```protobuf
message TransferProposalReceiptRequest {
  string message_type = 1;
  string asset_asset_id = 2;
  string asset_profile_id = 3;
  string verified_originator_entity_id = 4;
  string verified_beneficiary_entity_id = 5;
  string originator_pubkey = 6;
  string beneficiary_pubkey = 7;
  string sender_gateway_network_id = 8;
  string recipient_gateway_network_id = 9;
  string client_identity_pubkey = 10;
  string server_identity_pubkey = 11;
  string sender_gateway_owner_id = 12;
  string receiver_gateway_owner_id = 13;
}
```

G1 chooses and opens a new session (SESSION_ID):
```protobuf
message TransferCommenceRequest {
  string message_type = 1;
  string session_id = 2;
  string transfer_context_id = 3;
  string client_identity_pubkey = 4;
  string server_identity_pubkey = 5;
  string hash_transfer_init_claims = 6;
  string hash_prev_message = 7;
  string client_transfer_number = 8;
  string client_signature = 9;
}
```

G2 agree to proceed (using the SESSION_ID):
```protobuf
message AckCommenceRequest {
  string message_type = 1;
  string session_id = 2;
  string transfer_context_id = 3;
  string client_identity_pubkey = 4;
  string server_identity_pubkey = 5;
  string hash_prev_message = 6;
  string server_transfer_number = 7;
  string server_signature = 8;
}
```


## Asset Lock Assertion and Receipt (Stage 2)

In this stage, gateway G1 must issue a signed assertion that the asset in origin network NW1 has been immobilized and under the control of G1.

G1 lock/escrow asset (2.1): Gateway G1 proceeds to establish a lock or escrow the asset belonging to the originator. This prevents other local transactions in NW1 from changing the state of the asset until such time the lock by G1 is finalized or released. A time-lock or escrow may also be employed:

```protobuf
message PerformLockRequest {
  string session_id = 1;
}
```

Lock Assertion (2.2): Gateway G1 sends a digitally signed assertion regarding the locked (escrowed or immobilized) state on the asset in network NW1. The signature by G1 is performed using its entity public-key pair. This signature signifies that G1 (i.e. its owner/operator) is legally standing behind its statement regarding the locked/escrowed state on the asset. The mechanism to lock or immobilize the asset is outside the scope of SATP:

```protobuf
message LockAssertionRequest {
  string message_type = 1;
  string session_id = 2;
  string transfer_context_id = 3;
  string client_identity_pubkey = 4;
  string server_identity_pubkey = 5;
  string lock_assertion_claim = 6;
  string lock_assertion_claim_format = 7;
  string lock_assertion_expiration = 8;
  string hash_prev_message = 9;
  string client_transfer_number = 10;
  string client_signature = 11;  
}
```

G2 Logs and Broadcasts lock-assertion information (2.3): Gateway G2 logs a copy of the signed lock-assertion message received in Step 2.4 to its local state data DB2. G2 may also broadcast the fasts of the lock-assertion to all members of network NW2. The mechanism to log and to broadcast is out of scope for SATP:

```protobuf
message LockAssertionBroadcastRequest {
}
```

Lock-Assertion Receipt (2.4): If gateway G2 accepts the signed assertion from G1, then G2 responds with a digitally signed receipt message which includes a hash of the previous lock-assertion message. The signature by G2 is performed using its entity public-key pair. Otherwise, if G2 declines accepting the assertion then G2 can simply ignore the transfer and let the session time-out (i.e. transfer attempt has failed):

```protobuf
message LockAssertionReceiptRequest {
  string message_type = 1;
  string session_id = 2;
  string transfer_context_id = 3;
  string client_identity_pubkey = 4;
  string server_identity_pubkey = 5;
  string hash_prev_message = 6;
  string server_transfer_number = 7;
  string server_signature = 8;
}
```

## Commitment Preparation and Finalization (Stage 3)

In Stage 3 the gateways G1 and G2 finalizes to the asset transfer by performing a commitment protocol (e.g. 2PC or 3PC) as a process (sub-protocol) embedded within the overall SATP asset transfer protocol.

Commit-prepare (3.1): Gateway G1 indicates to G2 to prepare for the commitment of the transfer. This message must include a hash of the previous messages (message 2.5 and 2.6):

```protobuf
message CommitPrepareRequest {
  string message_type = 1;
  string session_id = 2;
  string transfer_context_id = 3;
}
```

Temporary asset mint (3.2): Gateway G2 creates (mints) an equivalent asset in NW2 assigned to itself as the owner. This step can be reversed (i.e. asset destroyed) in the case of the failure in the commitment steps because G2 is still the owner of the asset in NW2:

```protobuf
message CreateAssetRequest {
  string session_id = 1;
}
```

Commit-ready (3.3): Gateway G2 sends a commit-ready message to G1 indicating that it is ready to carry-out the last steps of the commitment subprotocol. Note that that the entire asset transfer session can be aborted before this step without affecting the asset state in the respective networks:

```protobuf
message CommitReadyRequest {
  string message_type = 1;
  string session_id = 2;
  string transfer_context_id = 3;
}
```

Asset burn (3.4): Gateway G1 extinguishes (burns) the asset in network NW1 which it has locked since Step 2.3:

```protobuf
message ExtinguishRequest {
  string session_id = 1;
}
```

Commit-final assertion (3.5): Gateway G1 indicates to G2 that G1 has performed the extinguishment of the asset in NW1. This message must be digitally signed by G1:

```protobuf
message CommitFinalAssertionRequest {
  string message_type = 1;
  string session_id = 2;
  string transfer_context_id = 3;
}
```

Asset-assignment (3.6): Gateway G2 assigns the minted asset (which it has been self-holding since Step 3.2) to the Beneficiary:

```protobuf
message AssignAssetRequest {
  string session_id = 1;
}
```

ACK-final receipt (3.7): Gateway G2 sends a signed assertion that it has assigned the asset to the intended Beneficiary:

```protobuf
message AckFinalReceiptRequest {
  string message_type = 1;
  string session_id = 2;
  string transfer_context_id = 3;
}
```

Receipt broadcast (3.8) Gateway G1 logs a copy of the signed receipt message to its local state data DB2. G1 may also broadcast the fasts of the signed receipt to all members of network NW1. The mechanism to log and to broadcast is out of scope for SATP:

```protobuf
message AckFinalReceiptBroadcastRequest {
}
```

Transfer complete (3.9): Gateway G1 must explicitly close the asset transfer session with gateway G2. This allows both sides to close down the secure channel established earlier in Stage 1:


```protobuf
message TransferCompletedRequest {
  string message_type = 1;
  string session_id = 2;
  string transfer_context_id = 3;
}
```











