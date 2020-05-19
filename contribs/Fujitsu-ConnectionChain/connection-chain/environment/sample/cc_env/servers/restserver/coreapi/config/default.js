/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * default.js
 */

module.exports = {
	// CC network information
	network: {
		orderer: "grpc://orderer.example.com:7050",
		ca: {
			url: "http://ca.example.com:7054",
			name: "ca.example.com"
		},
		mspid: "Org1MSP",
		peers:[
			{
				requests: "grpc://peer0.org1.example.com:7051",
				events: "grpc://peer0.org1.example.com:7053"
			},
			{
				requests: "grpc://peer1.org1.example.com:7051",
				events: "grpc://peer1.org1.example.com:7053"
			},
			{
				requests: "grpc://peer2.org1.example.com:7051",
				events: "grpc://peer2.org1.example.com:7053"
			},
			{
				requests: "grpc://peer3.org1.example.com:7051",
				events: "grpc://peer3.org1.example.com:7053"
			}
		],
		submitter: {
			name: "admin",
			secret: "adminpw"
		}
	},
	// Log level (trace/debug/info/warn/error/fatal)
	logLevel: "debug",
	// Chain ID of CC
	chainId: "ConnectionChain",
	// CC chaincode information
	channelName: "mychannel",
	chaincodeID_ec: "endchain_information",
	chaincodeID_ns: "naming_service",
	// Custom addition of chaincode for CC
	chaincodeIDs: ["transfer_information"]
};