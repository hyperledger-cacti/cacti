<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# A Sample Application for Asset Exchange across Two Besu Networks using HTLC

## Prerequisites
- Truffle: npm install -g truffle

## Deploy contracts
The following command deploys the contracts on the two test networks:
```
make deploy-contracts
```
This internally does the following:
- copies the core network contracts to the contracts folder in the truffle application. 
	* In future, this should be replaced by exporting the core contracts as an npm or EthPM package and the app importing this package.
	* The support is also only for ERC-20 tokens right now. This will be extended to ERC-721 soon. And in this future for any asset type.
- updates truffle-config.js based on the environment variables BESU\_NETWORK\_HOST and BESU\_NETWORK\_PORT
- installs the missing packages
- compiles the contracts and migrates them to both the test networks

## Run the asset exchange application
The sample application will have Alice transfer AliceERC20 tokens in Network 1 to Bob atomically with Bob transfering an equivalent amount of BobERC20 tokens to Alice in Network 2.
```
node app/AssetExchangeERC20.js
```
Warning: Just pay attention to the number of tokens initally owned by Alice and Bob in Networks 1 and 2 respectively,  if you are running this app repeatedly on the same set of networks. You might have to comment/uncomment the parts of the app where the contractOwner assigns tokens to Alice and Bob.
