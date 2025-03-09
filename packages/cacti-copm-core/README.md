
- [Overview](#overview)
- [Usage](#usage)
  - [Installation](#installation)
  - [Data Sharing](#data-sharing)
    - [COPM Command](#copm-command)
    - [Figure: Data Sharing with getVerifiedState](#figure-data-sharing-with-getverifiedstate)
  - [Asset Transfer](#asset-transfer)
    - [COPM Commands](#copm-commands)
    - [Figure: Asset Transfer Pledge and ClaimPledge](#figure-asset-transfer-pledge-and-claimpledge)
  - [Asset Exchange](#asset-exchange)
    - [COPM Commands](#copm-commands-1)
    - [Figure: Asset Exchange with Lock and ClaimLock](#figure-asset-exchange-with-lock-and-claimlock)
- [Development](#development)

# Overview

This package defines the common types, interfaces, and endpoints for the
COPM module to be used by Digital Ledger-specific implementations.

These endpoints require specific chaincode and weaver relays to be deployed on the network.
Please refer to [the Weaver documentation](https://hyperledger-cacti.github.io/cacti/weaver/introduction/).


# Usage

For a detailed command specification, please refer to the [OpenAPI Endpoint Documentation](https://hyperledger-cacti.github.io/cacti/references/openapi/cacti-copm-core_openapi/)

## Installation

Yarn: 

    yarn add --exact @hyperledger-cacti/cacti-copm-core


## Data Sharing
 - ability to read data on another network
 - the other network must first give you permission
  
### COPM Command
 - getVerifiedState

### Figure: Data Sharing with getVerifiedState

```mermaid
sequenceDiagram
    participant Alice
    participant COPM gRPC A
    participant Ledger A
    participant Relay A 
    participant Relay B
    participant Ledger B as Ledger B 
    Alice->>COPM gRPC A: getVerifiedState for State X on Ledger B
    activate COPM gRPC A
    COPM gRPC A->>Relay A: Read State X on Ledger B
    activate Relay A
    Relay A->>Relay B: Read State X
    activate Relay B
    Relay B->>Ledger B: Read State X
    activate Ledger B
    Ledger B->>Ledger B: Check permissions 
    Ledger B->>Ledger B: Read State X
    Ledger B->>Relay B: Return signed State X
    deactivate Ledger B
    Relay B->>Relay A: Return signed State X
    deactivate Relay B
    Relay A->>COPM gRPC A: Return signed State X
    deactivate Relay A
    COPM gRPC A->>Ledger A: Verify signature
    activate Ledger A
    Ledger A->>Ledger A: Verify signature
    Ledger A->>COPM gRPC A: Signature Verified
    deactivate Ledger A
    COPM gRPC A->>Alice: Return State X
    deactivate COPM gRPC A
```

## Asset Transfer

 - Asset changes networks
 - Asset burnt on Ledger A, minted on Ledger B
 - Introduces 2 ledger data types:
    - Pledge
       - A record created on Ledger A when an asset is burnt
       - Contains details about the asset, who it is promised to 
   - Claim
        - A record created on Ledger B when the pledged asset is minted
### COPM Commands
  - Pledge
  - ClaimPledge

### Figure: Asset Transfer Pledge and ClaimPledge


```mermaid
sequenceDiagram
    actor Alice
    actor Bob
    participant System A 
    participant Asset
    participant System B
    note right of System B:System: Ledger, <br/>Relay, COPM gRPC
    Alice->>Bob: Would you like my Asset?
    Bob->>Alice: Yes, please.
    Alice->>System A: Pledge Asset
    activate System A
    System A->>System A: Create Pledge
    destroy Asset
    System A-xAsset: Burn
    deactivate System A
    Alice->>Bob: You can claim it now!
    Bob->>System B: Claim Pledge
    activate System B
    rect rgb(191, 223, 255)
      System B->>System A: Read Pledge on System A
      activate System A
      note right of System B: A cross-network <br/>'Data Sharing' flow
      System A->>System A: Read Pledge
      System A->>System B: Return signed pledge
      deactivate System A
    end
    System B->>System B: Create Claim
    create participant PB as Asset
    System B->>PB: Mint
    deactivate System B
```

## Asset Exchange

 - Assets stay where they are
 - Two parties swap asset ownership of two assets
   - Assets can be on different networks
 - Uses HTLC (Hash Time Lock Contract) 
 - Both parties have visibility of both assets/networks
 - No inter-network communication needed 
    - no relays 

### COPM Commands
 - Lock
 - ClaimLock 
  
### Figure: Asset Exchange with Lock and ClaimLock

```mermaid
sequenceDiagram
    actor Alice
    actor Bob
    participant Token System
    participant Bond System
    note right of Bond System: System: Ledger and COPM gRPC
    Alice->>Bob: Would you like to trade my Tokens for your Bond?
    Bob->>Alice: Yes, please.
    Alice->>Token System: Lock Tokens
    activate Token System
    Token System->>Token System: Lock Tokens
    deactivate Token System
    Bob->>Bond System: Lock Bond
    activate Bond System
    Bond System->>Bond System: Lock Bond
    deactivate Bond System
    Alice->>Bob: I've locked my Tokens, the secret is X.
    Bob-->>Token System: Sees Tokens are Locked
    Bob->>Alice: I've locked my Bond, the secret is Y.
    Alice-->>Bond System: Sees Bond is Locked
    Alice->>Bond System: Claim Lock for Bond with secret Y
    activate Bond System
    Bond System->>Bond System: Verify Lock
    Bond System->>Bond System: Change Bond owner to Alice
    deactivate Bond System
    Bob->>Token System: Claim Lock for Tokens with secret X
    activate Token System
    Token System->>Token System: Verify Lock
    Token System->>Token System: Change Token owner to Bob
    deactivate Token System
```


# Development

When implementing a new distributed ledger, the following interfaces must be implemented:

- DLTransactionContext:  Implements running a transaction on the local network
- DLRemoteTransactionContext: Uses the weaver relays to run a transaction on another network
- DLTransactionContextFactory: Factory to return either local or remote context for the specific DLT.
