---
id: fabric
title: Hyperledger Fabric
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

After testing the Weaver interoperation mechanisms on [basic sample networks](../test-network/overview.md), you may be interested in finding out how you can equip an existing real network, whether in development or in production, to exercise these mechanisms. In this document, we will demonstrate how to equip a Fabric network and application with Weaver components and capabilities.

## Model

The figure below illustrates a typical Fabric network. The infrastructure consists of a set of peers, ordering service nodes, and CAs that perform the roles of MSPs; each serves a given _organization_ which is one of the constituent units of the network. On the peers are installed one or more smart contracts (_chaincode_), representing shared business logic across the different organizations. Further up lie the so-called Layer-2 (or client) applications that consist of organization-specific business logic and invoke the smart contracts using APIs exposed by the Fabric SDK and with wallet credentials issued by their respective organizations' CAs.

![alt text](../../../../images-weaver-docs/enabling-weaver/fabric-network-model.png)

Such a network equipped with Weaver components and capabilities will look like the figure below. Legacy components are marked in grey and Weaver and bridging components in green.

![alt text](../../../../images-weaver-docs/enabling-weaver/fabric-weaver-model.png)

The relay and driver are the only additional infrastructure that need to be installed. One or more relays can be installed, as can one or more drivers. The drivers are illustrated in Layer-2 rather than in the bottom layer because, though they are coupled with relays, they exercise contracts using the Fabric SDK and organization-issued credentials just like any Layer-2 application does.

Existing chaincode deployed on the network's channels remain undisturbed. All that is required in the smart contracts layer is the deployment of the Fabric Interoperation Chaincode on every channel that needs to offer or consume state from foreign networks.

Layer-2, or client, applications will need some additional code and configuration because the decisions to exercise interoperation mechanisms (relay queries for data sharing or atomic asset exchanges) are strictly part of business logic. But Weaver's Fabric Interoperation Node SDK offers various helper functions to ease this process and keep the adaptation to a minimum, as we wil see later in this document. Finally, an _identity service_ must be offered by the network to expose its CAs' certificate chains to foreign networks, thereby laying the basis for interoperation. This service simply needs to offer a REST endpoint, and can be implemented as a standalone application or (more conveniently) as an augmentation of one or more of the existing Layer-2 applications.

## Procedural Overview

A Hyperledger Fabric network is typically created in phases, in the following sequence:

1. **Development**: This involves writing chaincode and Layer-2 applications. The chaincode's deployment name/ID and its transaction API must be designed first, but subsequent development of the two layers of applications can then proceed parallelly.
2. **Pre-Configuration**: This involves creating a desired specification (as a set of configuration diles) of the network topology and the ledgers it maintains.
3. **Startup and Bootstrap**: This is the launch phase, in which the network components and applications are started and bootstrapped (i.e., configured with initial state and operating rules).

Assuming that the reader is familiar with this procedure, we will walk through the changes required in each phase to make your network ready for interoperation using Weaver components and code templates. This will involve code addition and adaptation, deployment of additional modules, additional configuration, and creation of additional ledger state records. The requirements and effort will vary with the mode of interoperation you wish to support in your Fabric network.

## Development Phase

A Fabric distributed application's business logic code spans two layers as illustrated in the network model.

### Chaincode

These are smart contracts embodied in code, managing business workflow state and digital assets.

#### For Data Sharing

No code changes are required for Weaver enablement, because data sharing involves:

- View packaging (and optionally, encryption) logic and access control logic in a source network, and
- View validation logic in a destination network

This logic is standard and independent of smart contract, asset, and state, particulars. It is already implemented in the Fabric Interoperation Chaincode offered by Weaver. Hence you just need to deploy that chaincode to exercise data sharing from, or to, your application chaincode. Your application chaincode can be oblivious of the Fabric Interoperation Chaincode's workings and of the view request-response protocol.

#### For Asset Exchange

To exchange an asset using Weaver, the asset's state on the ledger must be controlled in the following ways:

- Locked in favor of a party
- Claimed by the party to whom the asset is pledged
- Returned to the original owner if it is not claimed within a given timeframe

In addition, the state of the asset (i.e., whether it is locked), and its current and targeted owners, must be determinable by looking at the ledger records.

The bookkeeping logic required to maintain records of locks can be abstracted away from the particulars of a digital asset and its workflow. But as such assets and their properties (including ownership) can be, and are, encoded in an arbitrary number of ways, we cannot provide a one-size-fits all set of functions (like in the data sharing protocol) to exchange any kind of asset. Instead, we must rely on the application contract (chaincode) managing an asset, as it knows precisely what the asset's properties are and how they can be updated and queried on the ledger (channel).

What Weaver offers, therefore, is the following:

- Lock management (bookkeeping) logic implemented in the Fabric Interoperation Chaincode that treats each asset as an abstract object and is agnostic of the assets' internals. This logic can be exercised in one of two ways:
    - Importing the [`assetexchange`](https://pkg.go.dev/github.com/hyperledger/cacti/weaver/core/network/fabric-interop-cc/libs/assetexchange/v2) library from the Fabric Interoperation Chaincode into your application chaincode, or
    - Invoking them within the Fabric Interoperation Chaincode using a [chaincode-to-chaincode call](https://pkg.go.dev/github.com/hyperledger/fabric-chaincode-go/shim#ChaincodeStub.InvokeChaincode).
- A set of template functions with sample (and extensible) code that must be added to the application chaincode to exercise the above lock management functions.

Below, we list the template functions with sample code that you, as a developer, must use and adapt within your chaincode, in either mode (library import or chaincode invocations).

| Notes |
|:------|
| The instructions here apply only to chaincode implemented in Go, because Weaver presently offers only a Go version of the Fabric Interoperation Chaincode. |

- _Using the [`assetexchange`](https://pkg.go.dev/github.com/hyperledger/cacti/weaver/core/network/fabric-interop-cc/libs/assetexchange/v2) Library_: This method doesn't require the [`Fabric Interoperation Chaincode`](https://pkg.go.dev/github.com/hyperledger/cacti/weaver/core/network/fabric-interop-cc/contracts/interop/v2) to be installed. In your smart contract's `go.mod`, add the following in the `require` section (the sample below uses the current versions for dependency packages; update them to the latest versions offered by Cacti):
  ```go
  require(
      ...
      github.com/hyperledger/cacti/weaver/common/protos-go/v2 v2.0.0
      github.com/hyperledger/cacti/weaver/core/network/fabric-interop-cc/libs/assetexchange/v2 v2.0.0
      ...
  )
  ```
  The following functions need to be added to your chaincode, and the smart contract class/type used below is called `SmartContract` (_Note_: the function signature, i.e. the name, arguments, and return values, need to be exactly what is given in the below samples; you can have additional code to manage asset state as per need):
    1. **LockAsset**
       ```go
       import (
           ...
           "github.com/hyperledger/cacti/weaver/core/network/fabric-interop-cc/libs/assetexchange/v2"
       )
       func (s *SmartContract) LockAsset(ctx contractapi.TransactionContextInterface, assetExchangeAgreementSerializedProto64 string, lockInfoSerializedProto64 string) (string, error) {
           // Add some safety checks before calling LockAsset from library
           // Caller of this chaincode is supposed to be the Locker and the owner of the asset being locked.
           contractId, err := assetexchange.LockAsset(ctx, "", assetExchangeAgreementSerializedProto64, lockInfoSerializedProto64)
           if err != nil {
               return "", logThenErrorf(err.Error())
           }
           // Post proccessing of asset after LockAsset called like change status of the asset so that it can't be spent.
           ...
           return contractId, nil
       }
       ```
       Here `assetExchangeAgreementSerializedProto64` is a serialized protobuf in Base64 encoded string of `AssetExchangeAgreement` protobuf structure, and can be used to extract details like asset id, type of asset and recipient. Check the structure definition [here](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/rfcs/formats/assets/exchange.md#representing-two-party-asset-exchange-agreements).
       Similarly `lockInfoSerializedProto64` is a serialized protobuf in Base64 encoded string of `AssetLock` protobuf structure. Check the structure definition [here](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/rfcs/formats/assets/exchange.md#representing-locks-on-assets).
    2. **LockFungibleAsset**
       ```go
       func (s *SmartContract) LockFungibleAsset(ctx contractapi.TransactionContextInterface, fungibleAssetExchangeAgreementSerializedProto64 string, lockInfoSerializedProto64 string) (string, error) {
           // Add some safety checks before calling LockFungibleAsset from library
           // Caller of this chaincode is supposed to be the Locker and the owner of the asset being locked.
           contractId, err := assetexchange.LockFungibleAsset(ctx, "", fungibleAssetExchangeAgreementSerializedProto64, lockInfoSerializedProto64)
           if err != nil {
               return "", logThenErrorf(err.Error())
           }
           // Post proccessing of asset after LockFungibleAsset called like reduce the amount of tokens owned by the locker, or mark it locked so that it can't be spent.
           ...
           return contractId, nil
       }
       ```
       Here `fungibleAssetExchangeAgreementSerializedProto64` is a serialized protobuf in Base64 encoded string of `FungibleAssetExchangeAgreement` protobuf structure, and can be used to extract details like asset quantity, type of asset and recipient. Check the structure definition [here](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/rfcs/formats/assets/exchange.md#representing-two-party-asset-exchange-agreements).
    3. **IsAssetLockedQueryUsingContractId**
       ```go
       func (s *SmartContract) IsAssetLockedQueryUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
           return assetexchange.IsAssetLockedQueryUsingContractId(ctx, contractId)
       }
       ```
    4. **ClaimAssetUsingContractId**
       ```go
       func (s *SmartContract) ClaimAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId, claimInfoSerializedProto64 string) (bool, error) {
           // Note recipient will be the caller for this function
           claimed := false
           err := assetexchange.ClaimAssetUsingContractId(ctx, contractId, claimInfoSerializedProto64)
           if err != nil {
               return false, logThenErrorf(err.Error())
           }
           claimed = true
           // After the above function call, update the owner of the asset with recipeint/caller
           ...
           return claimed, nil
       }
       ```
    5. **UnlockAssetUsingContractId**
       ```go
       func (s *SmartContract) UnlockAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
           unlocked := false
           err := assetexchange.UnlockAssetUsingContractId(ctx, contractId)
           if err != nil {
               return false, logThenErrorf(err.Error())
           }
           unlocked = true
           ...
           return true, nil
       }
       ```

  In addition, you should add the following extra utility functions to enable client applications to query and discover asset state:
  ```go
  func (s *SmartContract) GetHTLCHashByContractId(ctx contractapi.TransactionContextInterface, contractId string) (string, error) {
      return assetexchange.GetHTLCHashByContractId(ctx, contractId)
  }
  func (s *SmartContract) GetHTLCHashPreImageByContractId(ctx contractapi.TransactionContextInterface, contractId string) (string, error) {
      return assetexchange.GetHTLCHashPreImageByContractId(ctx, contractId)
  }
  ```

  There is an alternative API to implement asset exchange using this library, which doesn't involve contract IDs. For details, see the [Asset Exchange Library README](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/core/network/fabric-interop-cc/libs/assetexchange/README.md#without-contractid).
        
- _Using the [`Fabric Interoperation Chaincode`](https://pkg.go.dev/github.com/hyperledger/cacti/weaver/core/network/fabric-interop-cc/contracts/interop/v2)_: This method requires the Fabric Interoperation Chaincode to be installed on all peers of the channel, using a special chaincode ID (e.g., `interop`, which is what we will use later in this document). Your application chaincode needs to implement the interface `github.com/hyperledger/cacti/weaver/core/network/fabric-interop-cc/interfaces/asset-mgmt/v2`.
  In your smart contract's `go.mod`, add the following in the `require` section (update the version to the latest Cacti version):
  ```go
  require(
      ...
      github.com/hyperledger/cacti/weaver/common/protos-go/v2 v2.0.0
      github.com/hyperledger/cacti/weaver/core/network/fabric-interop-cc/interfaces/asset-mgmt/v2 v2.0.0
      ...
  )
  ```
  In the SmartContract class definition file, add the following code:
  ```go
  import (
      ...
      am "github.com/hyperledger/cacti/weaver/core/network/fabric-interop-cc/interfaces/asset-mgmt/v2"
  )
  type SmartContract struct {
      contractapi.Contract
      amc am.AssetManagementContract
  }
  ```
  The following functions need to be added to your chaincode (_Note_: the function signature, i.e. the name, arguments, and return values, need to be exactly what is given in the below samples; you can have additional code to manage asset state as per need):
    1. **LockAsset**
       ```go
       func (s *SmartContract) LockAsset(ctx contractapi.TransactionContextInterface, assetExchangeAgreementSerializedProto64 string, lockInfoSerializedProto64 string) (string, error) {
           // Add some safety checks before calling LockAsset from library
           // Caller of this chaincode is supposed to be the Locker and the owner of the asset being locked.
           contractId, err := s.amc.LockAsset(ctx, "", assetExchangeAgreementSerializedProto64, lockInfoSerializedProto64)
           if err != nil {
               return "", logThenErrorf(err.Error())
           }
           // Post proccessing of asset after LockAsset called like change status of the asset so that it can't be spent.
           ...
           return contractId, nil
       }
       ```
       Here `assetExchangeAgreementSerializedProto64` is a serialized protobuf in Base64 encoded string of `AssetExchangeAgreement` protobuf structure, and can be used to extract details like asset id, type of asset and recipient. Check the structure definition [here](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/rfcs/formats/assets/exchange.md#representing-two-party-asset-exchange-agreements).
       Similarly `lockInfoSerializedProto64` is a serialized protobuf in Base64 encoded string of `AssetLock` protobuf structure. Check the structure definition [here](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/rfcs/formats/assets/exchange.md#representing-locks-on-assets).
    2. **LockFungibleAsset**
       ```go
       func (s *SmartContract) LockFungibleAsset(ctx contractapi.TransactionContextInterface, fungibleAssetExchangeAgreementSerializedProto64 string, lockInfoSerializedProto64 string) (string, error) {
           // Add some safety checks before calling LockFungibleAsset from library
           // Caller of this chaincode is supposed to be the Locker and the owner of the asset being locked.
           contractId, err := s.amc.LockFungibleAsset(ctx, "", fungibleAssetExchangeAgreementSerializedProto64, lockInfoSerializedProto64)
           if err != nil {
               return "", logThenErrorf(err.Error())
           }
           // Post proccessing of asset after LockFungibleAsset called like reduce the amount of tokens owned by the locker, or mark it locked so that it can't be spent.
           ...
           return contractId, nil
       }
       ```
       Here `fungibleAssetExchangeAgreementSerializedProto64` is a serialized protobuf in Base64 encoded string of `FungibleAssetExchangeAgreement` protobuf structure, and can be used to extract details like asset quantity, type of asset and recipient. Check the structure definition [here](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/rfcs/formats/assets/exchange.md#representing-two-party-asset-exchange-agreements).
    3. **IsAssetLockedQueryUsingContractId**
       ```go
       func (s *SmartContract) IsAssetLockedQueryUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
           return s.amc.IsAssetLockedQueryUsingContractId(ctx, contractId)
       }
       ```
    4. **ClaimAssetUsingContractId**
       ```go
       func (s *SmartContract) ClaimAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId, claimInfoSerializedProto64 string) (bool, error) {
           // Note recipient will be the caller for this function
           claimed := false
           err := s.amc.ClaimAssetUsingContractId(ctx, contractId, claimInfoSerializedProto64)
           if err != nil {
               return false, logThenErrorf(err.Error())
           }
           claimed = true
           // After the above function call, update the owner of the asset with recipeint/caller
           ...
           return claimed, nil
       }
       ```
    5. **UnlockAssetUsingContractId**
       ```go
       func (s *SmartContract) UnlockAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
           unlocked := false
           err := s.amc.UnlockAssetUsingContractId(ctx, contractId)
           if err != nil {
               return false, logThenErrorf(err.Error())
           }
           unlocked = true
           ...
           return true, nil
       }
       ```
    In addition, you should add the following extra utility functions to enable client applications to query and discover asset state:
    ```go
    func (s *SmartContract) GetHTLCHashByContractId(ctx contractapi.TransactionContextInterface, contractId string) (string, error) {
        return s.amc.GetHTLCHashByContractId(ctx, contractId)
    }
    func (s *SmartContract) GetHTLCHashPreImageByContractId(ctx contractapi.TransactionContextInterface, contractId string) (string, error) {
        return s.amc.GetHTLCHashPreImageByContractId(ctx, contractId)
    }
    ```

#### For Asset Transfer

_TBD_

### Client (or Layer-2) Applications

Weaver provides an SDK to help you adapt your applications to exercise the various interoperability modes. These are called out as **Interoperation Helpers** in the network model illustrated earlier. Your Fabric network's Layer-2 applications have business logic embedded in them that, broadly speaking, accept data from users and other external agents and invoke smart contracts using library functions and APIs offered by the Fabric SDK. When you use Weaver for network interoperability, other options can be added, namely requesting and accepting data from foreign networks, and triggering locks and claims for atomic exchanges spanning two networks. Weaver's Fabric Interoperation SDK (currently implemented both in Node.js and Golang) offers a library to exercise these options, supplementing the Fabric SDK. But this will involve modification to the application's business logic.

| Notes |
|:------|
| The instructions here apply to applications implemented in Node.js (JavaScript and TypeScript), using the Weaver Node SDK for Fabric. We will add instructions later for Go applications using the Weaver Go SDK for Fabric. |

To import and use the Weaver SDK, you need to add the following dependency to the `dependencies` section of your Node.js application's `package.json` file:
```json
"@hyperledger/cacti-weaver-sdk-fabric": "latest",
```
(Instead of `latest`, you can select a particular version from the [package website](https://github.com/hyperledger-cacti/cacti/pkgs/npm/cacti-weaver-sdk-fabric).)

Before you run `npm install` to fetch the dependencies, make sure you create a [personal access token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) with `read:packages` access in GitHub. Create an `.npmrc` file in the same folder as the `package.json` with the following contents:

```
@hyperledger:registry=https://npm.pkg.github.com/hyperledger
//npm.pkg.github.com/:_authToken=<personal-access-token>
```
Replace `<personal-access-token>` in this file with the token you created in GitHub.

First, you must incorporate some code for Weaver's network administration, specifically identity management. Then, using the given sample code and examples, you can adapt your applications for each interoperability mode.

#### For Identity Administration

A Fabric network channel must share its security domain (or membership) configuration, i.e., its organizations' CA certificate chains, with a foreign network with which it seeks to interoperate. Each organization must run an IIN Agent for this purpose. The set of IIN Agents, a.k.a. the _local membership_ must be recorded in the ledger before those agents can be operational. In your Fabric network application suite, one or more applications will exist for network administration; the following code snippet should be added in at least one of those applications to record local membership as a prerequisite for interoperability:
  ```typescript
  import { MembershipManager } from '@hyperledger/cacti-weaver-sdk-fabric'

  const gateway = <get-fabric-network-gateway-instance>

  try {
      const response = await MembershipManager.createLocalMembership(
          gateway,
          members,        // list of all organization MSPIDs that are part of the channel
          securityDomain, // name of the local network's security domain
          channelName,    // Channel Name
          contractName    // Fabric Interoperation Chaincode installation ID on the channel
      )
  } catch (e) {
      // On error try updating local membership
      const response = await MembershipManager.updateLocalMembership(gateway, members, securityDomain, channelName, contractName)
  }
  ```

  - `<get-fabric-network-gateway-instance>` should be replaced with standard (boilerplate) code to get a handle to your network's gateway. This requires a special wallet identity, namely one with a `network-admin` attribute indicating that the caller is a trusted network administrator who is authorized to record local memberships on the `channelName` channel.
  - `members` must consist of the list of organizational MSP IDs for the `channelName` channel.
  
#### For Data Sharing

Consider a scenario inspired by the [global trade use case](../../user-stories/global-trade.md) where a letter of credit (L/C) management business logic (chaincode `letterofcreditcc`) installed in the `tradefinancechannel` channel in the `trade-finance-network` network supports a transaction `RecordBillOfLading`, which validates and records a bill of lading (B/L) supplied by a user via a UI. Weaver will enable such a B/L to be fetched from a different network `trade-logistics-network` by querying the function `GetBillOfLading` exposed by the chaincode `shipmentcc` installed in the `tradelogisticschannel` channel.
      
(In preparation, a suitable access control policy must be recorded on `tradelogisticschannel` in `trade-logistics-network`, and a suitable verification policy must be recorded on `tradefinancechannel` in `trade-finance-network`. We will see how to do this in the "Startup and Boostrap" section later.)

You will need to insert some code in the Layer-2 application that accepts a B/L and submits a `RecordBillOfLading` transaction in `trade-finance-network`. (No code changes need to be made in any application in the other network.) The logic to accept a B/L should be replaced (or you can simply add an alternative) by a call to the `interopFlow` function offered by the [cacti-weaver-sdk-fabric](https://github.com/hyperledger-cacti/cacti/pkgs/npm/cacti-weaver-sdk-fabric) library (there's an [equivalent library in Golang](https://github.com/hyperledger-cacti/cacti/releases/tag/weaver%2Fsdks%2Ffabric%2Fgo-sdk%2Fv2.0.0) too). The following code sample illustrates this (the Golang equivalent is left to the reader):
```js
const ihelper = require('@hyperledger/cacti-weaver-sdk-fabric').InteroperableHelper;
const interopcc = <handle-to-fabric-interop-chaincode>;   // Use Fabric SDK functions: (new Gateway()).getNetwork(...).getContract(<fabric-interop-chaincode-id>)
const keyCert = await ihelper.getKeyAndCertForRemoteRequestbyUserName(<wallet>, <user-id>);      // Read key and certificate for <user-id> from wallet (get handle using Fabric SDK Wallets API)
// Collect view addresses for relay requests in the context of an interop flow
interopJSONs.push({
    NetworkID: 'trade-logistics-network',
    RemoteEndpoint: <trade-logistics-relay-url[:<port>],      // Replace with remote network's relay address and port
    ChannelID: 'tradelogisticschannel',
    ChaincodeID: 'shipmentcc',
    ChaincodeFunc: 'GetBillOfLading',
    ccArgs: [ <shipment-reference> ],     // Replace <shipment-reference> with a value that can be used to look up the right B/L
    Sign: true
});
const indices = [ 1 ];
// Trigger an end-to-end interoperation (data sharing) protocol
// Send a request to a foreign network via your relay, receive the response and submit a transaction to a local chaincode
const flowResponse = await ihelper.interopFlow(
    interopcc,
    'trade-finance-network',
    {
        channel: 'tradefinancechannel',
        contractName: 'letterofcreditcc',
        ccFunc: 'RecordBillOfLading',
        ccArgs: [ <shipment-reference> , '' ]
    },
    <org-msp-id>,                         // Replace with this Layer-2 application's organization's MSP ID
    <trade-finance-relay-url>[:<port>],   // Replace with local network's relay address and port
    indices,
    interopJSONs,
    keyCert,
    <endorsingOrgs>,        // List of orgs to submit transaction to local i.e. trade logistics network
    false,                  // Boolean flag to indicate whether return without submit transaction to local i.e. trade logistics network
    false,                  // Boolean flag indicating no TLS communication with relay
    [],                     // Keep it empty when TLS is disabled
    <confidential-flag>,    // Boolean flag to indicate whether to use to end-to-end encryption
);
// List of errors to check for
if (!flowResponse.views || flowResponse.views.length === 0 || !flowResponse.result || flowResponse.views.length !== argIndices.length) {
    throw <error>;
}
```
Let us understand this code snippet better. The structure in lines 20-25 specifies the local chaincode transaction that is to be triggered after remote data (view) has been requested and obtained via relays. The function `RecordBillOfLading` expects two arguments as specified in line 24: the first is the common shipment reference that is used by the letter of credit in `trade-finance-network` and the bill of lading in `trade-logistics-network`, and the second is the bill of lading contents. When the `interopFlow` function is called, this argument is left blank because it is supposed to be filled with contents obtained from a view request. The array list `indices`, which is passed as an argument to `interopFlow` therefore contains the index value `1` (line 14), indicating which argument ought to be substituted  with view data. The `interopJSONs` array correspondingly contains a list of view addresses that are to be supplied to the relay. The `<confidential-flag>` if set to `true` will enable end-to-end confidentiality, i.e. payload will be encrypted from `trade-finance-network`'s Weaver chaincode, and will be decrypted in SDK (i.e. Layer-2 client application) at `trade-logistics-network`, but relays and drivers in between will not be able to see the payload. By default this flag is set to `false`.

| Notes |
|:------|
| A local chaincode invocation may require multiple view requests to different networks, which is why `indices` and `interopJSONs` are arrays; they therefore must have the same lengths. |

The rest of the code ought to be self-explanatory. Values are hardcoded for explanation purposes, but you can refactor the above code by reading view addresses corresponding to chaincode invocations from a configuration file.

**Enabling TLS**:
By default, the TLS is set to false in `interopFlow`, i.e. disabled. But if you want to enable TLS, can pass additional parameters to the `interopFlow` function as follows:
```TypeScript
const flowResponse = await ihelper.interopFlow(
    interopcc,
    'trade-finance-network',
    {
        channel: 'tradefinancechannel',
        contractName: 'letterofcreditcc',
        ccFunc: 'RecordBillOfLading',
        ccArgs: [ <shipment-reference> , '' ]
    },
    <org-msp-id>,                         // Replace with this Layer-2 application's organization's MSP ID
    <trade-finance-relay-url>[:<port>],   // Replace with local network's relay address and port
    indices,
    interopJSONs,
    keyCert,
    <endorsingOrgs>,            // List of orgs to submit transaction to in trade logistics network
    false,                  // Boolean flag to indicate whether return without submit transaction to local i.e. trade logistics network
    true,                       // Boolean indication TLS is enabled.
    <tlsCACertPathsForRelay>,   // list of CA certificate file paths
);
```
    
#### For Asset Exchange

Let's take an example of asset exchange between `Alice` and `Bob`, where Bob wants to purchase an asset of type `Gold` with id `A123` from `Alice` in `BondNetwork` in exchange for `200` tokens of type `CBDC01` in `TokenNetwork`.
      
`Alice` needs to select a secret text (say `s`), and hash it (say `H`) using say `SHA512`, which will be used to lock her asset in `BondNetwork`. At the place in your application where an asset exchange is to be initiated, you need to add code to enable Alice to lock the non-fungible asset using hash `H` and timeout duration of 10 minutes:
```typescript
import { AssetManager, HashFunctions } from '@hyperledger/cacti-weaver-sdk-fabric'

const hash = HashFunctions.SHA512();    // Create Hash instance of one of the supported Hash Algorithm
hash.setSerializedHashBase64(H);        // Set the Hash
const timeout = Math.floor(Date.now()/1000) + 10 * 60;

const bondContract = <handle-to-fabric-application-chaincode-in-bond-network>;

const result = await AssetManager.createHTLC(
    bondContract,
    "Gold",             // Asset ID
    "A123",             // Asset Type
    bobCertificate,     // Certificate of Bob in Bond Network
    hash,                  // Hash generated by Alice using her secret s
    timeout,            // Timeout in epoch for 10 mins from current time
    null                // Optional callback function to be called after the asset is locked
);
let bondContractId = result.result; // Unique ID for this asset exchange contract in BondNetwork
```

| Notes |
|:------|
| Note that 'Alice' and 'Bob' and the asset specifics can be parameterized in the above code, which can be reused for arbitrary asset exchange scenarios in your business workflow. The above code is only meant to be a sample. |

Now `Bob` will lock his tokens in `TokenNetwork`. To lock the fungible asset using same hash `H` and timeout of 5 minutes (half the timeout duration used by Alice in `BondNetwork`), add the following code snippet in your application:
```typescript
const hash = HashFunctions.SHA512();    // Create Hash instance of one of the supported Hash Algorithm
hash.setSerializedHashBase64(H);        // Set the Hash
const timeout = Math.floor(Date.now()/1000) + 5 * 60;

const tokenContract = <handle-to-fabric-application-chaincode-in-token-network>;
const result = await AssetManager.createFungibleHTLC(
    tokenContract,
    "CBDC01",               // Token ID
    200,                    // Token Quantity
    aliceCertificate,       // Certificate of Alice in Token Network
    hash,                      // Hash H used by Alice in Bond Network
    timeout,                // Timeout in epoch for 5 mins from current time
    null                    // Optional callback function to be called after the asset is locked
)
const tokenContractId = result.result // Unique ID for this asset exchange contract in TokenNetwork
```

Wherever the lock status of the asset is required in your application, you should insert a query function call as follows:
```typescript
const contract = <handle-to-fabric-application-chaincode>;
// Below contractId is the ID obtained during lock
const isLocked = AssetManager.isAssetLockedInHTLCqueryUsingContractId(contract, contractId)
```

Wherever a participant (either 'Alice' or 'Bob' in this example) needs to claim a locked asset using the secret text (pre-image of hash) `s` in your application, insert the following code snippet (*Note*: typically one would insert this in event callback functions or in functions that are polling the ledger to monitor whether the asset is locked in favor of a given recipient):
```typescript
const hash = HashFunctions.SHA512();    // Create Hash instance of one of the supported Hash Algorithm
hash.setPreimage(s)                     // Set Pre-Image s
const contract = <handle-to-fabric-application-chaincode>;
const claimSuccess = await AssetManager.claimAssetInHTLCusingContractId(
    contract,
    contractId,                         // contractId obtained during lock
    hash
)
// return value claimSuccess is boolean indicating success or failure of claim
```

Wherever the asset must be unlocked in your application (typically, an event callback function triggered upon the expiration of the time lock), insert the following code snippet:
```typescript
const contract = <handle-to-fabric-application-chaincode>;
const reclaimSuccess = await AssetManager.reclaimAssetInHTLCusingContractId(
    contract,
    contractId                          // contractId obtained during lock
)
// return value 'reclaimSuccess' is a boolean indicating success or failure of reclaim
```

#### For Asset Transfer

_TBD_

## Pre-Configuration Phase

Typically, pre-configuration in a Fabric network involves generating (after creating the channel specifications and policies):

- _Channel artifacts_: orderer genesis block, channel transaction, and anchor peer configurations from a `configtx.yaml` file (using Fabric's `configtxgen` tool)
- _Crypto artifacts_: keys and certificates for CAs, peers, orderers, and clients from a `crypto-config.yaml` file (using Fabric's `cryptogen` tool)
- _Connection profiles_: one for every network organization, which will be used by the organization's Layer-2 applications to connect to the network's peers and CAs

No changes are required in this process to support any of the three interoperation modes using Weaver. The connection profiles generated above will be used by certain Weaver modules, as we will see later. The only additional step required is to generate special wallet identities for the following:

- Network administrator: one or more identities containing the `network-admin` attribute; only a user/application possessing this identity may record special (privileged) information regarding memberships and policies on the channel.
- Fabric Driver: one or more identities (for each deployed driver) containing the `relay` attribute; only a relay-driver combination possessing this identity may run data sharing-related operations on the deployed Fabric Interoperation Chaincode.
- IIN Agent: one or more identities (for each deployed agent) containing the `iin-agent` attribute: only an agent may submit foreign network membership records to the Fabric Interoperation Chaincode.

Later we will see how the components possessing these identities are deployed.

## Startup and Bootstrap Phase

After writing application code and creating the network configuration files, the components of a Fabric network (peers, CAs, and ordering service) are launched. In this section, we will list the additional tasks you, as a Fabric network administrator, must perform to make your network ready to interoperate.

To launch a network using containerized components, you will typically use a Docker Compose or Kubernetes configuration file. No modifications are needed to the peers', orderers', and CAs' configurations. Sample instructions are given below for networks launched using Docker Compose; we leave it to the reader to adapt these to their custom launch processes.

### For Asset Exchange

The asset exchange mode currently requires only the Fabric Interoperation Chaincode module from Weaver. Relays, drivers, and IIN agents, are not necessary. In the future, we expect to make the asset exchange protocol moe automated using these components; the instructions here will be updated appropriately.

#### Install the Fabric Interoperation Chaincode

Install the Fabric Interoperation Chaincode in the relevant channel(s), i.e., those that run chaincodes that will be involved in asset exchanges. This is a Go module that can be fetched from `github.com/hyperledger/cacti/weaver/core/network/fabric-interop-cc/contracts/interop`. Following that, you an install it using the appropriate Fabric process: in Fabric v2, you will need to package, install, approve, and commit this module on the selected channels in your network.

### For Data Sharing or Asset Transfer

Both the data sharing and asset transfer modes require the Fabric Interoperation Chaincode, relays, drivers, and IIN agents, to be deployed.

#### Install the Fabric Interoperation Chaincode

Install the Fabric Interoperation Chaincode in the relevant channel(s), i.e., those that run chaincodess that will be involved in data sharing (and asset transfers, which require multiple data shares). This is a Go module that can be fetched from `github.com/hyperledger/cacti/weaver/core/network/fabric-interop-cc/contracts/interop`. Following that, you an install it using the appropriate Fabric process: in Fabric v2, you will need to package, install, approve, and commit this module on the selected channels in your network.

#### Launch Relay

You need to run one or more relays for network-to-network communication. Here we provide instructions to run one relay running in a Docker container, which is sufficient for data sharing. (Later, we will provide instructions to run multiple relays, which will be useful from a failover perspective.)

Weaver provides a [pre-built image](https://github.com/hyperledger-cacti/cacti/pkgs/container/cacti-weaver-relay-server) for the relay. Before launching a container, you just need to customize its configuration for your Fabric network, which you can do by simply creating a folder (let's call it `relay_config`) and configuring the following files in it:

- `.env`: This sets suitable environment variables within the relay container. Copy the `.env.template` file [from the repository](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/core/relay/.env.template) and customize it for your purposes, as indicated in the below sample:
  ```
  PATH_TO_CONFIG=./config.toml
  RELAY_NAME=<"name" in config.toml>
  RELAY_PORT=<relay-server-port/"port" in config.toml>
  EXTERNAL_NETWORK=<docker-bridge-network>
  DOCKER_IMAGE_NAME=ghcr.io/hyperledger/cacti-weaver-relay-server
  DOCKER_TAG=2.1.0
  ```
    - The `PATH_TO_CONFIG` variable should point to the properties file typically named `config.toml` (you can name this whatever you wish). See further below for instructions to write this file.
    - The `RELAY_NAME` variable specifies a unique name for this relay. It should match what's specified in the `config.toml` (more on that below).
    - The `RELAY_PORT` variable specifies the port this relay server will listen on. It should match what's specified in the `config.toml` (more on that below).
    - The `EXTERNAL_NETWORK` variable should be set to the [name](https://docs.docker.com/compose/networking/) of your Fabric network.
    - The `DOCKER_*` variables are used to specify the image on which the container will be built. Make sure you set `DOCKER_TAG` to the latest version you see on [GitHub](ility/pkgs/container/weaver-relay-server).

    For more details, see the [Relay Docker README](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/core/relay/relay-docker.md) ("Relay Server Image" and "Running With Docker Compose" sections).

- `config.toml`: This is the file specified in the `PATH_TO_CONFIG` variable in the `.env`. It specifies properties of this relay and the driver(s) it supports. A sample is given below:
  ```toml
  name=<relay-name>
  port=<relay-port>
  host="0.0.0.0"
  db_path="db/<relay-name>/requests"
  remote_db_path="db/<relay-name>/remote_request"

  # FOR TLS
  cert_path="credentials/fabric_cert.pem"
  key_path="credentials/fabric_key"
  tls=<true/false>

  [networks]
  [networks.<network-name>]
  network="<driver-name>"

  [relays]
  [relays.<foreign-relay-name>]
  hostname="<foreign-relay-hostname-or-ip-address>"
  port="<foreign-relay-port>"

  [drivers]
  [drivers.<driver-name>]
  hostname="<driver-hostname-or-ip-address>"
  port="<driver-port>"
  ```
    - `<relay-name>` should be a unique ID representing this relay; e.g., `my_network_relay`. It should match the `RELAY_NAME` value in `.env`.
    - `<relay-port>` is the port number the relay server will listen on. It should match the `RELAY_PORT` value in `.env`.
    - `db_path` and `remote_db_path` are used internally by the relay to store data. Replace `<relay-name>` with the same value set for the `name` parameter. (These can point to any filesystem paths in the relay's container.)
    - If you set `tls` to `true`, the relay will enforce TLS communication. The `cert_path` and `key_path` should point to a Fabric TLS certificate and key respectively, such as those created using the `cryptogen` tool.
    - `<network-name>` is a unique identifier for your local network. You can set it to whatever value you wish.
    - `<driver-name>` refers to the driver used by this relay to respond to requests. This also refers to one of the drivers's specifications in the `drivers` section further below. In this code snippet, we have defined one driver. (The names in lines 14 and 22 must match.) In lines 23 and 24 respectively, you should specify the hostname and port for the driver (whose configuration we will handle later).
    - The `relays` section specifies all foreign relays this relay can connect to. The `<foreign-relay-name>` value should be a unique ID for a given foreign relay, and this value will be used by your Layer-2 applications when constructing view addresses for data sharing requests. In lines 18 and 19, you should specify the hostname and port for the foreign relay.
    - **Enabling TLS**:
        - You can make your relay accept TLS connections by specifying a TLS certificate file path and private key file path in `cert_path` and `key_path` respectively, and set `tls` to `true`.
        - To communicate with a foreign relay using TLS, specify that relay's TLS CA certificate path in `tlsca_cert_path` (currently only one certificate can be configured) and set `tls` to `true` by extending that relay's section as follows (*Note*: this CA certificate should match the one specified in the `cert_path` property in the foreign relay's `config.toml` file):
          ```toml
          [relays]
          [relays.<foreign-relay-name>]
          hostname="<foreign-relay-hostname-or-ip-address>"
          port="<foreign-relay-port>"
          tls=<true|false>
          tlsca_cert_path="<relay-tls-ca-certificate-path>"
          ```
        - To communicate with a driver using TLS, specify the driver's TLS CA certificate in `tlsca_cert_path` (currently only one certificate can be configured) and set `tls` to `true` by extending that driver's section as follows (*Note*: this CA certificate must match the certificate used by the driver using the `DRIVER_TLS_CERT_PATH` property in its `.env` configuration file, which we will examine later):
          ```toml
          [drivers]
          [drivers.<driver-name>]
          hostname="<driver-hostname-or-ip-address>"
          port="<driver-port>"
          tls=<true|false>
          tlsca_cert_path="<driver-tls-ca-certificate-path>"
          ```

  | Notes |
  |:------|
  | You can specify more than one foreign relay instance in the `relays` section. |
  | You can specify more than one driver instance in the `drivers` section. |

- `docker-compose.yaml`: This specifies the properties of the relay container. You can use the [file in the repository](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/core/relay/docker-compose.yaml) verbatim.

To start the relay server, navigate to the folder containing the above files and run the following:
```bash
docker compose up -d relay-server
```

#### Launch Driver

You need to run one or more drivers through which your relay can interact with your Fabric network. Here we provide instructions to run one Fabric driver running in a Docker container, which is sufficient for data sharing. (Later, we will provide instructions to run multiple drivers, which will be useful both from a failover perspective and to interact with different subsets of your Fabric network, like private data collections.)

Weaver provides a [pre-built image](https://github.com/hyperledger-cacti/cacti/pkgs/container/cacti-weaver-driver-fabric) for the Fabric driver. Before launching a container, you just need to customize its configuration for your Fabric network, which you can do by simply creating a folder (let's call it `driver_config`) and configuring the following files in it:

- `.env`: This sets suitable environment variables within the driver container. Copy the `.env.docker.template` file [from the repository](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/core/drivers/fabric-driver/.env.docker.template) and customize it for your purposes, as indicated in the below sample:
  ```
  CONNECTION_PROFILE=<path_to_connection_profile>
  DRIVER_CONFIG=./config.json
  RELAY_ENDPOINT=<relay-hostname>:<relay-port>
  NETWORK_NAME=<network-name>
  DRIVER_PORT=<driver-server-port>
  INTEROP_CHAINCODE=<interop-chaincode-name>
  EXTERNAL_NETWORK=<docker-bridge-network>
  TLS_CREDENTIALS_DIR=<dir-with-tls-cert-and-key>
  DOCKER_IMAGE_NAME=ghcr.io/hyperledger/cacti-weaver-driver-fabric
  DOCKER_TAG=2.1.0
  DRIVER_TLS=<true|false>
  DRIVER_TLS_CERT_PATH=path_to_tls_cert_pem_for_driver
  DRIVER_TLS_KEY_PATH=path_to_tls_key_pem_for_driver
  RELAY_TLS=<true|false>
  RELAY_TLSCA_CERT_PATH=path_to_tls_ca_cert_pem_for_relay
  ```
    - `<path_to_connection_profile>` should point to the path of a connection profile you generated in the "Pre-Configuration" section. A Fabric driver obtains client credentials from one of the organizations in your network, so pick an organization and point to the right connection profile.
    - The `DRIVER_CONFIG` variable should point to the `config.json` (you can name this whatever you wish) specified below.
    - `<relay-hostname>` should be set to the hostname of the relay server machine and `<relay-port>` should match the `port` value in the relay's `config.toml` (see above).
    - The `NETWORK_NAME` variable should be a unique ID referring to the Fabric network. It will be used to distinguish container names and wallet paths. (This setting is relevant in situations where a driver is used to query multiple network channels.)
    - The `DRIVER_PORT` variable should be set to the port this driver will listen on.
    - The `INTEROP_CHAINCODE` variable should be set to the ID of the Fabric Interop Chaincode installed on your Fabric network channel.
    - The `EXTERNAL_NETWORK` variable should be set to the [name](https://docs.docker.com/compose/networking/) of your Fabric network.
    - **Enabling TLS**:
        - You can make your driver accept TLS connections by specifying `DRIVER_TLS` as `true` and specifying a TLS certificate file path and private key file path in `DRIVER_TLS_CERT_PATH` and `DRIVER_TLS_KEY_PATH` respectively. The same certificate should be specified in this driver's definition in the `drivers` section in the `config.toml` file of your relay in the `tlsca_cert_path` property (see the earlier section on relay configuration).
        - To communicate with your network' relay using TLS (i.e., if the relay is TLS-enabled), specify that relay's TLS CA certificate path in `RELAY_TLSCA_CERT_PATH` (currently only one certificate can be configured) and set `RELAY_TLS` to `true`. This CA certificate should match the one specified in the `cert_path` property in the relay's `config.toml` file (see the earlier section on relay configuration):
        - You can point to the folder in your host system containing the certificate and key using the `TLS_CREDENTIALS_DIR` variable. (This folder will be synced to the `/fabric-driver/credentials` folder in the Fabric Driver container as specified in the [docker compose file](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/core/drivers/fabric-driver/docker-compose.yml).) Make sure you point to the right certificate and key file paths within the container using the `DRIVER_TLS_CERT_PATH`, `DRIVER_TLS_KEY_PATH`, and `RELAY_TLSCA_CERT_PATH` variables.

- `config.json`: This contains settings used to connect to a CA of a Fabric network organization and enroll a client. A sample is given below:
  ```json
  {
      "admin":{
          "name":"admin",
          "secret":"adminpw"
      },
      "relay": {
          "name":"relay",
          "affiliation":"<affiliation>",
          "role": "client",
          "attrs": [{ "name": "relay", "value": "true", "ecert": true }]
      },
      "mspId":"<msp-id>",
      "caUrl":"<ca-service-endpoint>"
  }
  ```
      - As in the `.env` configuration, you should pick an organization for the driver to associate with. The `admin` section specifies the registrar name and password (this should be familiar to any Fabric network administrator) used to enroll clients. Default values of `admin` and `adminpw` are specified above as examples, which you should replace with the right values configured in your network organization's CA.
    - `<affiliation>` should be what's specified in your organization's Fabric CA server configuration. The default is `org1.department1`, but you should look up the appropriate value from the CA server's configuration file.
    - `<msp-id>` should be set to the (or an) MSP ID of the selected organization.
    - `<ca-service-endpoint>` should be set to the CA server's endpoint. If you launched your CA server as a container from a docker compose file, this should be set to the container's service name.

  | Notes |
  |:------|
  | If your connection profile already contains specifications for a CA server, you can leave the `<ca-service-endpoint>` value as a blank. |

- `docker-compose.yaml`: This specifies the properties of the driver container. You can use the [file in the repository](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/core/drivers/fabric-driver/docker-compose.yml) verbatim.

To start the driver, navigate to the folder containing the above files and run the following:
```bash
docker compose up -d
```

#### Launch IIN Agents

You need to run one IIN Agent for each organization in the Fabric network channel you are enabling Weaver in. This agent runs a protocol with other organizations' agents and with targeted foreign networks' agents to sync and record foreign networks' memberships to the channel ledger.

Weaver provides a [pre-built image](https://github.com/hyperledger-cacti/cacti/pkgs/container/cacti-weaver-iin-agent) for the IIN Agent. Before launching a container, you just need to customize its configuration for your Fabric network organization, which you can do by simply creating a folder (let's call it `iin_agent_config_<orgname>`) and configuring the following files in it:

- `config.json`: This contains settings used to connect to a Fabric network organization and its CA (part of the organization's MSP). A sample is given below:
  ```
  {
      "admin":{
          "name":"admin",
          "secret":"adminpw"
      },
      "agent": {
          "name":"iin-agent",
          "affiliation":"<affiliation>",
          "role": "client",
          "attrs": [{ "name": "iin-agent", "value": "true", "ecert": true }]
      },
      "mspId":"<msp-id>",
      "ordererMspIds": [<list-of-orderer-msp-ids>],
      "ccpPath": "<path-to-connection-profile>",
      "walletPath": "",
      "caUrl": "<ca-service-endpoint>",
      "local": "false"
  }
  ```

- `dnsconfig.json`: This specifies the list of known IIN agents of your network (i.e., belonging to other organizations) and of foreign networks. A sample DNS configuration file is given below:
  ```
  {
      "<securityDomainName1>": {
          "<iin-agent1-name>": {
              "endpoint": "<hostname:port>",
              "tls": <true/false>,
              "tlsCACertPath": "<cacert-path-or-empty-string>"
          },
          "<iin-agent2-name>": {
              "endpoint": "<hostname:port>",
              "tls": <true/false>,
              "tlsCACertPath": "<cacert-path-or-empty-string>"
          }
      },
      "<securityDomainName2>": {
          "<iin-agent1-name>": {
              "endpoint": "<hostname:port>",
              "tls": <true/false>,
              "tlsCACertPath": "<cacert-path-or-empty-string>"
          },
          "<iin-agent2-name>": {
              "endpoint": "<hostname:port>",
              "tls": <true/false>,
              "tlsCACertPath": "<cacert-path-or-empty-string>"
          }
      }
  }
  ```
    - Each security domain (i.e., unique ledger, like a Fabric channel) scopes a set of JSON objects, each containing specifications of an IIN Agent. The key (`<iin-agent1-name>` for example) in each is the IIN Agent's name, which can be the organization's MSP ID (for a Fabric network). The value is another JSON object, containing an `endpoint` with a hostname and port for the agent.
    - **Enabling TLS**: To communicate with a given IIN Agent using TLS (i.e., if that agent is TLS-enabled), specify `tls` as `true` and that agent's TLS CA certificate path in `tlsCACertPath` (currently only one certificate can be configured) within the JSON object corresponding to that agent. This CA certificate should match the one specified in that IIN Agent's `.env` file, whose configuration we will specify later.

- `security-domain-config.json`: This config file contains list of security domain defined for the network and its members, i.e. it can be list of organizations or channel name. Sample security domain configuration file:
  ```
  {
      "<securityDomainName1>": "<channelName>",
      "<securityDomainName2>": [
          "<Org1MSPId>",
          "<Org2MSPId>"
      ]
  }
  ```

- `.env`: This sets suitable environment variables within the driver container. Copy the `.env.template` file [from the repository](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/core/identity-management/iin-agent/.env.docker.template) and customize it for your purposes, as indicated in the below sample:
  ```
  IIN_AGENT_PORT=<iin-agent-server-port>
  IIN_AGENT_TLS=<true/false>
  IIN_AGENT_TLS_CERT_PATH=<path_to_tls_cert_pem_for_iin_agent>
  IIN_AGENT_TLS_KEY_PATH=<path_to_tls_key_pem_for_iin_agent>
  MEMBER_ID=<org-msp-id>
  SECURITY_DOMAIN=network1
  DLT_TYPE=fabric
  CONFIG_PATH=./config.json
  DNS_CONFIG_PATH=./dnsconfig.json
  SECURITY_DOMAIN_CONFIG_PATH=./security-domain-config.json
  WEAVER_CONTRACT_ID=<name-of-weaver-interop-chaincode-installed>
  SYNC_PERIOD=<repeated_auto_sync_interval>
  AUTO_SYNC=<true/false>
  TLS_CREDENTIALS_DIR=<dir-with-tls-cert-and-key>
  DOCKER_IMAGE_NAME=ghcr.io/hyperledger/cacti-weaver-iin-agent
  DOCKER_TAG=<iin-agent-docker-image-version>
  EXTERNAL_NETWORK=<docker-bridge-network>
  ```
    - `IIN_AGENT_ENDPOINT`: The endpoint at which IIN Agent server should listen. E.g.: `0.0.0.0:9500`
    - `IIN_AGENT_TLS`: Set this to `true` to enable TLS on IIN Agent server
    - `IIN_AGENT_TLS_CERT_PATH`: Path to TLS certificate if TLS is enabled
    - `IIN_AGENT_TLS_KEY_PATH`: Path to TLS key if TLS is enabled
    - `MEMBER_ID`: Member Id for this IIN Agent. For fabric network, it should be the Organization's MSP ID
    - `SECURITY_DOMAIN`: Security domain to which this IIN Agent belongs
    - `DLT_TYPE`: To indicate the type of DLT for which this IIN Agent is running. E.g. `fabric`
    - `CONFIG_PATH`: Path to ledger specific config file (explained in next subsection)
    - `DNS_CONFIG_PATH`: Path to DNS config file explained in previous sub sections
    - `SECURITY_DOMAIN_CONFIG_PATH`: Path to security domain config file explained in previous sub sections
    - `WEAVER_CONTRACT_ID`: Contract ID for DLT specific Weaver interoperation module installed on network
    - `SYNC_PERIOD`: Period at which auto synchronization of memberships from other security domains should happen
    - `AUTO_SYNC`: Set this to `true` to enable auto synchronization of memberships from other security domains
    - `DOCKER_TAG`: Set this to the desired version of the Weaver IIN Agent [docker image](https://github.com/hyperledger-cacti/cacti/pkgs/container/cacti-weaver-iin-agent)
    - `EXTERNAL_NETWORK`: Set to the network [name](https://docs.docker.com/compose/networking/) of your Fabric network.
    - **Enabling TLS**:
        - Make your IIN Agent accept TLS connections by specifying `IIN_AGENT_TLS` as `true` and specifying a TLS certificate file path and private key file path in `IIN_AGENT_TLS_CERT_PATH` and `IIN_AGENT_TLS_KEY_PATH` respectively. The same certificate should be specified in this agent's JSON object in another agent's `dnsconfig.json` file under the appropriate security domain and IIN Agent ID scope.
        - You can point to the folder in your host system containing the certificate and key using the `TLS_CREDENTIALS_DIR` variable. (This folder will be synced to the `/opt/iinagent/credentials` folder in the IIN Agent container as specified in the [docker compose file](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/core/identity-management/iin-agent/docker-compose.yml).) Make sure you point to the right certificate and key file paths within the container using the `IIN_AGENT_TLS_CERT_PATH` and `IIN_AGENT_TLS_KEY_PATH` variables respectively.

- `docker-compose.yaml`: This specifies the properties of the IIN agent container. You can use the [file in the repository](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/core/identity-management/iin-agent/docker-compose.yml) verbatim.

Now to start the IIN agent, navigate to the folder containing the above files and run the following:
```bash
docker compose up -d
```

Repeat the above steps to launch an IIN Agent for every other organization on your channnel, i.e., create similar configuration files in an organization-specific folder. Make sure you:

- Update the organization names in every relevant location in the `config.json`.
- Update `IIN_AGENT_ENDPOINT` and `MEMBER_ID` in the `.env`.
  

#### Ledger Initialization

To prepare your network for interoperation with a foreign network, you need to record the following to your network channel through the Fabric Interoperation Chaincode:

- **Access control policies**:
  Let's take the example of the request made from `trade-finance-network` to `trade-logistics-network` for a B/L earlier in this document. `trade-logistics-network` can have a policy of the following form permitting access to the `GetBillOfLading` function from a client belonging to the `Exporter` organization in `trade-finance-network` as follows:
  ```json
  {
      "securityDomain":"trade-finance-network",
      "rules":
          [
              {
                  "principal":"ExporterMSP",
                  "principalType":"ca",
                  "resource":"tradelogisticschannel:shipmentcc:GetBillOfLading:*",
                  "read":true
              }
          ]
  }
  ```
  In this sample, a single rule is specified for requests coming from `trade-finance-network`: it states that a `GetBillOfLading` query made to the `shipmentcc` contract installed on the `tradelogisticschannel` channel is permitted for a requestor possessing credentials certified by an MSP with the `ExporterMSP` identity. The `*` at the end indicates that any arguments passed to the function will pass the access control check.

  You need to record this policy rule on your Fabric network's channel by invoking either the `CreateAccessControlPolicy` function or the `UpdateAccessControlPolicy` function on the Fabric Interoperation Chaincode that is already installed on that channel; use the former if you are recording a set of rules for the given `securityDomain` for the first time and the latter to overwrite a set of rules recorded earlier. In either case, the chaincode function will take a single argument, which is the policy in the form of a JSON string (make sure you escape the double quotes before sending the request to avoid parsing errors). You can do this in one of two ways: (1) writing a small piece of code in Layer-2 that invokes the contract using the Fabric SDK Gateway API, or (2) running a `peer chaincode invoke` command from within a Docker container built on the `hyperledger/fabric-tools` image. Either approach should be familiar to a Fabric practitioner.

- **Verification policies**:
  Taking the same example as above, an example of a verification policy for a B/L requested by the `trade-finance-network` from the `trade-logistics-network` is as follows:
  ```json
  {
      "securityDomain":"trade-logistics-network",
      "identifiers":
          [
              {
                  "pattern":"tradelogisticschannel:shipmentcc:GetBillOfLading:*",
                  "policy":
                      {
                          "type":"Signature",
                          "criteria":
                              [
                                  "ExporterMSP",
                                  "CarrierMSP"
                              ]
                      }
              }
          ]
  }
  ```
  In this sample, a single verification policy rule is specified for data views coming from `trade-logistics-network`: it states that the data returned by the `GetBillOfLading` query made to the `shipmentcc` chaincode on the `tradelogisticschannel` channel requires as proof two signatures, one from a peer in the organization whose MSP ID is `ExporterMSP` and another from a peer in the organization whose MSP ID is `CarrierMSP`.

  You need to record this policy rule on your Fabric network's channel by invoking either the `CreateVerificationPolicy` function or the `UpdateVerificationPolicy` function on the Fabric Interoperation Chaincode that is already installed on that channel; use the former if you are recording a set of rules for the given `securityDomain` for the first time and the latter to overwrite a set of rules recorded earlier. In either case, the chaincode function will take a single argument, which is the policy in the form of a JSON string (make sure you escape the double quotes before sending the request to avoid parsing errors). As with the access control policy, you can do this in one of two ways: (1) writing a small piece of code in Layer-2 that invokes the contract using the Fabric SDK Gateway API, or (2) running a `peer chaincode invoke` command from within a Docker container built on the `hyperledger/fabric-tools` image. Either approach should be familiar to a Fabric practitioner.

  | Notes |
  |:------|
  | For any cross-network data request, make sure an access control policy is recorded in the _source network_ (`trade-logistics-network` in the above example) and a corresponding verification policy is recorded in the _destination network_ (`trade-finance-network` in the above example) before any relay request is triggered. |

- **Local network security domain (membership) configuration**:
  Recall the code snippet added to your application in the "Identity Administration" section. Exercise that code snippet, exposed either through a function API or an HTTP endpoint, to record the initial local membership for the relevant network channels.

Your Fabric network is now up and running with the necessary Weaver components, and your network's channel's ledger is bootstrapped with the initial configuration necessary for cross-network interactions!
