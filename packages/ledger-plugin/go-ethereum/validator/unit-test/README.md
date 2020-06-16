<!--
 Copyright 2019-2020 Fujitsu Laboratories Ltd.
 SPDX-License-Identifier: Apache-2.0

 README.md
-->

# Validator Driver

## Assumption
- Validator for Ethereum-version Ledger Plugin is already running
- The docker container "geth1" (geth-docker) is already running
- Specify the validator URL to connect to with "validatorUrl" in "config/default.js"

## (a) Get balance
- Target source: "validatorDriver_getNumericBalance.js"

1) Specify the parameters in the target source
	- referedAddress: Account ID to be displayed

2) Run
	<pre>
	node validatorDriver_getNumericBalance.js 
	</pre>

## (b) Asset transfer

- Target source: "validatorDriver_sendSignedTransaction.js"

1) Specify the parameters in the target source

	- fromAddress: Transfer source account ID 
	- fromAddressPkey: private key of Transfer source account 
	- toAddress: Destination account ID
	- amount: the value of the asset to be transferred

2) Run
	<pre>
	node validatorDriver_sendSignedTransaction.js 
	</pre>
