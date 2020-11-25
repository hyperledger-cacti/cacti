<!--
 Copyright 2020 Fujitsu Ltd.
 SPDX-License-Identifier: Apache-2.0
 README.md
-->

# Validator Driver

## The point of this document
This document describes the procedures for runnning fabric validator unit-test.

## Assumption
- Validator for fabric ledger is already running
	- ProcedureURL: https://github.com/hyperledger/cactus/blob/master/packages/ledger-plugin/fabric/validator/src/README.md
- The fabcar container is already running
	- ProcedureURL: https://github.com/hyperledger/cactus/blob/master/packages/ledger-plugin/fabric/validator/unit-test/fabric-docker/README.md

## How to unit-test fabric validator
- There are 2 unit-tests for fabric validator.
### step1: Get car information
- Target source: "queryCar.js"
- This script is for getting car information recorded in fabcar.

1) Run
	<pre>
	node queryCar.js</pre>

	- Sample output
		<pre>
		Transaction has been evaluated, result is: [{"Key":"CAR0", "Record":{"colour":"blue","make":"Toyota","model":"Prius","owner":"Tomoko"}},{"Key":"CAR1", "Record":{"colour":"red","make":"Ford","model":"Mustang","owner":"Brad"}},{"Key":"CAR2", "Record":{"colour":"green","make":"Hyundai","model":"Tucson","owner":"Jin Soo"}},{"Key":"CAR3", "Record":{"colour":"yellow","make":"Volkswagen","model":"Passat","owner":"Max"}},{"Key":"CAR4", "Record":{"colour":"black","make":"Tesla","model":"S","owner":"Adriana"}},{"Key":"CAR5", "Record":{"colour":"purple","make":"Peugeot","model":"205","owner":"Michel"}},{"Key":"CAR6", "Record":{"colour":"white","make":"Chery","model":"S22L","owner":"Aarav"}},{"Key":"CAR7", "Record":{"colour":"violet","make":"Fiat","model":"Punto","owner":"Pari"}},{"Key":"CAR8", "Record":{"colour":"indigo","make":"Tata","model":"Nano","owner":"Valeria"}},{"Key":"CAR9", "Record":{"colour":"brown","make":"Holden","model":"Barina","owner":"Shotaro"}}]</pre> 

### step2: Asset transfer
- Target source: "validatorDriver_signTransactionOffline.js"
- This script is for setting owner information.

1) Check the private key of wallet/admin
	- Get the filename which is replaced `-pub` with `-priv` in `unit-test/wallet/admin/`.
		<pre>
		$ find (fabric unit-test path)/wallet/admin/ -type f -name '*-pub' | sed -e "s/-pub\$/-priv/"
		6adbd1d5df2852efc1447f91effadbc2c8b5f1c6577c644441905f05e9551018-priv</pre>


2) Specify the parameters in the target source
	- Before
		<pre>
		const privateKeyPath = walletPath + '/admin/39dff34541b3ebc034474ed3b68cde6477f319bd67d01bb771e99b6f7595b4cf-priv';</pre>

	- After
		<pre>
		const privateKeyPath = walletPath + '/admin/< xxx-priv checked by step1 >';</pre>


3) Run
	<pre>
	node validatorDriver_sendSignedTransaction.js </pre>

	- Sample output
		<pre>
		keita@keita-VirtualBox:~/cactusProject/cactus/packages/ledger-plugin/fabric/validator/unit-test$ node validatorDriver_signTransactionOffline.js 
		validatorUrl: https://localhost:5040
		##exec requestStartMonitor()
		exec sendRequest()
		#[send]requestData: {"func":"changeCarOwner","args":{"carId":"CAR101","newOwner":"Charlie"}}
		setupChannel start
		tlssetup start
		#[recv]eventReceived, res: {"status":200,"blockData":[]}
		{
		  fcn: 'changeCarOwner',
		  args: [ 'CAR101', 'Charlie' ],
		  chaincodeId: 'fabcar',
		  channelId: 'mychannel'
		}
		proposal end
		##txId: 2a143227120188314fe2255ac22192f85ddb6af80a715f2f64f5d02ad052d8aa
		signProposal start
		successfully send signedProposal
		Successfully build commit transaction proposal
		signProposal start
		Successfully build endorse transaction proposal
		emit request
		#[recv]eventReceived, res: {"status":200,"blockData":[]}
		##exec requestStopMonitor()</pre>