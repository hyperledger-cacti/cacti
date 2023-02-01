<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Command Reference for fabric-cli

Comands: 
- [chaincode](#chaincode)
- [configure](#configure)
- [interop](#interop)
- [helper](#helper)
- [relay](#relay)
- [env](#env)


## chaincode 

Operate on the chaincode with either invoke|query.
The command does nothing by itself

subcommands: 
- [invoke](#invoke)
- [query](#query)

### invoke

Invoke chaincode with data.

Example:  `fabric-cli chaincode invoke --local-network=network1  mychannel interop  Create '["test", "teststate"]'`

Usage:  `fabric-cli chaincode invoke --local-network=<network1|network2> <channel-name> <contract-name> <function-name> <args>`

### query

Query chaincode with data.

Example: `fabric-cli chaincode  invoke --local-network=network1 mychannel interop Read '["56612afd-6730-4206-b25e-6d5d592789d3"]'`


Usage: `fabric-cli chaincode --local-network=<network1|network2> query <channel-name> <contract-name> <function-name> <args array>`

## configure

Configure network
Command performs nothing by itelf, please refer to sub-commands and options.

subcommands: 
- [all](#all)
- [data](#data)
- [load-chaincode](#load-chaincode)
- [network-config](#network-config)

### all

### data

### load-chaincode

### network-config


## interop

Make an interop call to external network and invoke chaincode with the response. 
It communicates with the local relay and stores the response in the underlying network. 

Example: `fabric-cli interop --local-network=network1  --requesting-org=Org1MSP  localhost:9080/Fabric_Network/mychannel:interop:Read:h`
 
Usage: `fabric-cli interop <address>`

## helper

Various helper functions'

subcommands: 
- [getKeyAndCert](#getKeyAndCert)
- [signAddress](#signAddress)

### getKeyAndCert

### signAddress


## relay

Operate on local relay: send|get|poll

subcommands:
- [get](#get)
- [poll](#poll)
- [send](#send)

### get


### poll 

### send



## env

Set env variables for the fabric-cli


