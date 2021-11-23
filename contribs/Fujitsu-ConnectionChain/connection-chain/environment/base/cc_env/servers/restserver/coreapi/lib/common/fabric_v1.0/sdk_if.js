/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * sdk_if.js
 */

/* Summary:
 * Library for fabricv 1.0 invoke, query requests
 * 
 * Entry point:
 * None (For lib)
*/

var CoreAPIUtil = require('../CoreAPIUtil.js');

// Dependency declaration of base package 
var path = require('path');
var fs = require('fs');
var util = require('util');
var process = require('process');
var config = require('config');

// Dependency declaration of fabric-client
var fclient = require('fabric-client');
var utils = require('fabric-client/lib/utils.js');
var Peer = require('fabric-client/lib/Peer.js');
var Orderer = require('fabric-client/lib/Orderer.js');
var User = require('fabric-client/lib/User.js');
var EventHub = require('fabric-client/lib/EventHub.js');

// Dependency declaration of fabric-ca-client
var copService = require('fabric-ca-client/lib/FabricCAClientImpl.js');

// Log settings
var log4js = require('log4js');
var logger = log4js.getLogger('sdk_if[' + process.pid + ']');
logger.level = config.logLevel;

// List of fabric-client objects
var clients = {}

/**
 * invokeRequest: invoke instruction in fabric v 1.0 chained code
 * @param {string} chainId: Chain ID (Example: "ConnectionChain") * No longer needed
 * @param {JSON} network: Chain network information (following format)
 * JSON: {
 *         "orderer":     (string) URL of order. e.g. "grpc://localhost:7050"
 *         "ca" {
 *           "url":       (string) URL of ca,// e.g. "http://localhost:7054",
 *           "name":      (string) Name of ca (Value specified by FABRIC_CA_SERVER_CA_NAME in the yaml file)
 *         },
 *         "mspid":       (string) MSPID of the organization to which peers belongs ,// For example , "Org1 MSP"
 *         "peers":   []{
 *           "requests":  (string) URL for request ,// ex : "grpc://localhost:7051"
 *           "events":    (string) event standby URL ,// ex : "grpc://localhost:7053"
 *         },
 *         "submitter": {
 *           "name":      (string) operation user name ,// ex : "admin"
 *           "secret":    (string) Operation user password// For example : "adminpw"
 *         }
 *       }
 * @param {string} channelName: Channel name (Example: "mychannel")
 * @param {string} chaincodeID: Chain code name (Example: "endchain_information")
 * @param {string} func: invoke function name (Example: "deleteECInfo")
 * @param {[]string} args: invoke argument (Example: "['Chain1']")
 * @param {bool} isWait: flag enable/disable wait for block generation
**/
function invokeRequest(chainId, network, channelName, chaincodeID, func, args, isWait) {
	var tx_id = null;
	var nonce = null;
	var the_user = null;
	var eventhubs = [];
	var invokeResponse = {uuid:null, data:null};

	return new Promise((resolve, reject) => {
		var channel = null;
		var client = null;
		getClientAndChannel(channelName, network)
		.then((retObj) => {
			channel = retObj.channel;
			client = retObj.client;

			return getSubmitter(network.submitter, client, network.mspid, network.ca);
		})
		.then((admin) => {
			// Set a successful Enroll User object
			the_user = admin;

			// Put an EventHub connection to the EP
			for (var i = 0; i < network.peers.length; i++) {
				var eh = client.newEventHub();
				eh.setPeerAddr(network.peers[i].events);
				eh.connect();
				eventhubs.push(eh);
			}

			return channel.initialize();
		}).then((nothing) => {

			// Generate a request object for Invoke execution
			tx_id = client.newTransactionID();
			invokeResponse.uuid = tx_id.getTransactionID();
			var request = {
				chaincodeId : chaincodeID,
				fcn: func,
				args: args,
				txId: tx_id
			};
			// Proposal Execution
			logger.info('sendTransactionProposal start, txid=' + tx_id.getTransactionID());
			return channel.sendTransactionProposal(request);
		})
		.then((results) => {
			logger.info('sendTransactionProposal end');
			// Check that the Proposal response returned by EP is successful
			var proposalResponses = results[0];
			var proposal = results[1];
			var header   = results[2];
			var all_good = true;
			var resStr = ''; //  invoke function with return value for storing results
			for(var i in proposalResponses) {
				let one_good = false;
				if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
					if (proposalResponses[i].response.payload) {
						resStr = new String(proposalResponses[i].response.payload);
						invokeResponse.data = resStr;
					}
					one_good = true;
					logger.info('transaction proposal was good');
				} else {
					logger.error('transaction proposal was bad');
				}
				all_good = all_good & one_good;
			}
			if (all_good) {
				// Waiting for transaction events from EventHub
				var invokeId = tx_id.getTransactionID();
				var cnt = 0;
				eventhubs.forEach((eh) => {
					eh.registerTxEvent(invokeId.toString(), (tx, code) => {
						eh.unregisterTxEvent(invokeId);
						if (code !== 'VALID') {
							logger.error('Transaction Commited Failure, code = ' + code + ', ' + eh.getPeerAddr() + ', tx_id=' + invokeId);
						} else {
							logger.info('Transaction Commited, ' + eh.getPeerAddr() + ', tx_id=' + invokeId);
						}
						// disconnect from the EventHub server
						if (eh.isconnected()) {
							logger.info('Disconnecting the event hub');
							eh.disconnect();
						}
						// When waiting for block generation, resolve when all transaction events from EventHub are complete
						cnt++;
						if (cnt == eventhubs.length && isWait) {
							return resolve(invokeResponse);
						}
					});
				});
				// sendTransaction to Ordering Service
				var request = {
					proposalResponses: proposalResponses,
					proposal: proposal,
					header: header
				};
				logger.info('sendTransaction(to Orderer) start');
				return channel.sendTransaction(request)
				.then((response) => {
					if (response.status === 'SUCCESS') {
						logger.info('sendTransaction(to Orderer) end');
						if (!isWait) {
							// resolve now if you do not want to wait for block generation
							return resolve(invokeResponse);
						}
					} else {
						throw new Error('Failed to order the transaction. Error code: ' + response.status);
					}
				});
			} else {
				// come here if the chaincode itself returns an error
				// Unlike query, error messages from chain codes cannot be retrieved. Please refer to the log.
				throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
			}
		})
		.catch((err) => {
			eventhubs.forEach((eh) => {
				// disconnect from the EventHub server
				if (eh.isconnected()) {
					logger.info('Disconnecting the event hub');
					eh.disconnect();
				}
			});
			return reject(err);
		});
	});
}

/**
 * queryRequest: query request to chaincode of fabric v1.0 
 * @param {string} chainId: Chain ID (Example: "ConnectionChain") * No longer needed
 * @param {JSON} network: Chain network information (following format)
 * JSON: {
 *         "orderer":     (string) URL of order. e.g. "grpc://localhost:7050"
 *         "ca" {
 *           "url":       (string) URL of ca,// e.g. "http://localhost:7054",
 *           "name":      (string) Name of ca (Value specified by FABRIC_CA_SERVER_CA_NAME in the yaml file)
 *         },
 *         "mspid":       (string) MSPID of the organization to which peers belongs ,// For example , "Org1 MSP"
 *         "peers":   []{
 *           "requests":  (string) URL for request ,// ex : "grpc://localhost:7051"
 *           "events":    (string) event standby URL ,// ex : "grpc://localhost:7053" * not used for query
 *         },
 *         "submitter": {
 *           "name":      (string) operation user name ,// ex : "admin"
 *           "secret":    (string) Operation user password// For example : "adminpw"
 *         }
 *       }
 * @param {string} channelName: Channel name (Example: "mychannel")
 * @param {string} chaincodeID: Chain code name (Example: "endchain_information")
 * @param {string} func: query function name (Example: "getRuleInfoList")
 * @param {[]string} args: query argument (Example: "['', '']")
**/
function queryRequest(chainId, network, channelName, chaincodeID, func, args) {
	var tx_id = null;
	var nonce = null;
	var the_user = null;

	return new Promise((resolve, reject) => {
		var channel = null;
		var client = null;
		getClientAndChannel(channelName, network)
		.then((retObj) => {
			channel = retObj.channel;
			client = retObj.client
			return getSubmitter(network.submitter, client, network.mspid, network.ca);
		})
		.then((admin) => {
			// Set a successful Enroll User object
			the_user = admin;

			return channel.initialize();
		}).then((nothing) => {

			// Generate a request object for Query execution
			tx_id = client.newTransactionID();
			var request = {
				chaincodeId : chaincodeID,
				fcn: func,
				args: args,
				txId: tx_id
			};
			// Run Query
			logger.info('queryByChaincode start, txid=' + tx_id.getTransactionID());
			return channel.queryByChaincode(request);
		})
		.then((response_payloads) => {
			logger.info('queryByChaincode end');
			if (response_payloads) {
				var resStr = '';
				var errMsg = '';
				var valid = false;
				for(let i = 0; i < response_payloads.length; i++) {
					resStr = new String(response_payloads[i]);
					// contains an error message if the chaincode itself returns an error
					// Error message from SDK such as connection failure (Error: Connect Failed)
					if (resStr.indexOf('Error:') == 0){
						errMsg = resStr;
					} else {
						valid = true;
						break;
					}
				}
				if (valid) {
					// return one normal result if any
					return resolve(resStr);
				} else {
					// Response from all EPs is error
					throw new Error(errMsg);
				}
			} else {
				throw new Error('response_payloads is null');
			}
		})
		.catch((err) => {
			return reject(err);
		});
	});
}

// export the above function (external library that can be referenced by other functions)
exports.invokeRequest = function(chainId, network, channelName, chaincodeID, func, args) {
	// CC always does not wait for block generation
	return invokeRequest(chainId, network, channelName, chaincodeID, func, args, false);
}
exports.queryRequest = function(chainId, network, channelName, chaincodeID, func, args) {
	return queryRequest(chainId, network, channelName, chaincodeID, func, args);
}

// fabric-client and Channel object generation
function getClientAndChannel(channelName, network) {
	var retObj = {client:null, channel:null};
	// Because only one KVS can be set for client, it is managed on a per-CA basis, similar to a KVS path.
	var isNewClient = false;
	var client = clients[network.ca.name];
	if (!client) {
		logger.info('create new fabric-client');
		client = new fclient();
		clients[network.ca.name] = client;
		isNewClient = true;
	}

	var channel = null;

	//  * If there is no getChannel in the v 1.0 SDK, so try .. catch
	//    This will always log an error from Client.js the first time, but there is no harm.
	try {
		channel = client.getChannel(channelName);
		// Reflect the difference if the current peer and orderer set in channel are different from the destination specified this time
		// TODO: I think this will work, but I don't know how it works when I change it.
		var oldPeers = channel.getPeers();
		var oldPeerUrls = [];
		for (var i = 0; i < oldPeers.length; i++) {
			oldPeerUrls[i] = oldPeers[i].getUrl();
		}
		var newPeerUrls = [];
		for (var i = 0; i < network.peers.length; i++) {
			newPeerUrls[i] = network.peers[i].requests;
		}
		// old, then new array generated
		var allPeerUrls = [...oldPeerUrls, ...newPeerUrls];
		for (var [i, e] of allPeerUrls.entries()) {
			if(!oldPeerUrls.includes(e)) {
				// added because it is not in the current peers
				var newPeer = client.newPeer(e);
				channel.addPeer(newPeer);
			}
			if(!newPeerUrls.includes(e)) {
				// deleted because it is not in the current peers
				channel.removePeer(oldPeers[i]);
			}
		}
		// Currently orderer is specified as the only one, so replace it if it is different
		var oldOrderer = channel.getOrderers();
		var newOrderer = network.orderer;
		if (oldOrderer[0].getUrl() != newOrderer) {
			channel.removeOrderer(oldOrderer[0]);
			channel.addOrderer(client.newOrderer(newOrderer));
		}

	}catch(e) {
		if(channel == null) {
			logger.info('create new channel, name=' + channelName);
			channel = client.newChannel(channelName);
			// orderConfiguration
			channel.addOrderer(client.newOrderer(network.orderer));
			// EP Settings
			for (var i = 0; i < network.peers.length; i++) {
				var peer = client.newPeer(network.peers[i].requests);
				channel.addPeer(peer);
			}
		} else {
			// Exception when reflecting of difference of the destination information
			logger.error(e);
		}
	}
	retObj.channel = channel;

	return new Promise((resolve, reject) => {
		if (isNewClient) {
			var storePath = '/tmp/kvs-' + network.ca.name;
			var cryptoSuite = fclient.newCryptoSuite();
			cryptoSuite.setCryptoKeyStore(
				fclient.newCryptoKeyStore({
					path: storePath
				})
			);
			client.setCryptoSuite(cryptoSuite);

			// Generate a storage location of Enrollment information
			return fclient.newDefaultKeyValueStore({
				path: storePath
			})
			.then((store) => {
				// Set KeyValue store
				client.setStateStore(store);
				retObj.client = client;
				resolve(retObj);
			})
		} else {
			retObj.client = client;
			resolve(retObj);
		}
	});
}

// fabric-client object generation
function getClient(network) {
	// Because only one KVS can be set for client, it is managed on a per-CA basis, similar to a KVS path.
	var isNewClient = false;
	var client = clients[network.ca.name];
	if (!client) {
		logger.info('create new fabric-client');
		client = new fclient();
		clients[network.ca.name] = client;
		isNewClient = true;
	}

	return new Promise((resolve, reject) => {
		if (isNewClient) {
			var storePath = '/tmp/kvs-' + network.ca.name;
			var cryptoSuite = fclient.newCryptoSuite();
			cryptoSuite.setCryptoKeyStore(
				fclient.newCryptoKeyStore({
					path: storePath
				})
			);
			client.setCryptoSuite(cryptoSuite);

			// Generate a storage location of Enrollment information 
			return fclient.newDefaultKeyValueStore({
				path: storePath
			})
			.then((store) => {
				// Set KeyValue store
				client.setStateStore(store);
				resolve(client);
			})
		} else {
			resolve(client);
		}
	});
}


// Get the user object to submit a proposal to EP
// * This is because it is set by setUserContext and used inside client.
//   The returned user object itself is no longer used.
function getSubmitter(submitter, cli, mspID, ca) {
	var caUrl = ca.url;
	var caName = ca.name;
	return cli.getUserContext(submitter.name, true)
	.then((user) => {
		return new Promise((resolve, reject) => {
			if (user && user.isEnrolled()) {
				return resolve(user);
			}

			var member = new User(submitter.name);
			var cryptoSuite = cli.getCryptoSuite();
			if (!cryptoSuite) {
				var storePath = '/tmp/kvs-' + caName;
				cryptoSuite = fclient.newCryptoSuite();
				cryptoSuite.setCryptoKeyStore(
					fclient.newCryptoKeyStore({
						path: storePath
					})
				);
				cli.setCryptoSuite(cryptoSuite);
			}
			member.setCryptoSuite(cryptoSuite);

			var	tlsOptions = {
				trustedRoots: [],
				verify: false
			};

			var cop = new copService(caUrl,tlsOptions, caName, cryptoSuite);
			return cop.enroll({
				enrollmentID: submitter.name,
				enrollmentSecret: submitter.secret
			}).then((enrollment) => {
				return member.setEnrollment(enrollment.key, enrollment.certificate, mspID);
			}).then(() => {
				return cli.setUserContext(member, false);
			}).then(() => {
				return resolve(member);
			}).catch((err) => {
				return reject(err);
			});
		});
	});
}

// exports for use by the Monitor class for 1.0
exports.getClient = function(network) {
	return getClient(network);
}
exports.getSubmitter = function(submitter, cli, mspID, ca) {
	return getSubmitter(submitter, cli, mspID, ca);
}
