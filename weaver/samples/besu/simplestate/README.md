<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# A Sample Application for Key Value Storage

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


## Troubleshoot
- Check if truffle is installed: npm install -g truffle

- Pay attention to the number of tokens initally owned by Alice and Bob in Networks 1 and 2 respectively, if there are other applications that use/spend their tokens in parallel to this app. Ensure that there are sufficient tokens in their accounts to lock.
