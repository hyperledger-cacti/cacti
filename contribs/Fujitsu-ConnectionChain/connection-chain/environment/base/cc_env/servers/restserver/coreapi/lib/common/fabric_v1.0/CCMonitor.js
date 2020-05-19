/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CCMonitor.js
 */

/* Summary:
 * Monitoring events of generating blocks in fabric v 1.0 (For CC)
*/

var EventEntrance = require('../EventEntrance.js');

// Dependency declaration of base package 
var process = require('process');
var path = require('path');
var grpc = require('grpc');
var config = require('config');

// Dependency declaration of fabric-client
var sdk = require('./sdk_if.js');
var utils = require('fabric-client/lib/utils.js');
var EventHub = require('fabric-client/lib/EventHub.js');
// Read protobuf definition
var _ccProto = grpc.load(path.join(__dirname, '/node_modules/fabric-client/lib/protos/peer/chaincode.proto')).protos;

// Log settings
var log4js = require('log4js');
var logger = log4js.getLogger('CCMonitor[' + process.pid + ']');
logger.level = config.logLevel;

var CCMonitor = class {

	constructor(chainId, network) {
		this._id = chainId;
		this._network = network;
		this._eh = null;
	}

	start() {
		var network = this._network;
		var cli = null;
		sdk.getClient(network)
		.then((client) => {
			cli = client;
			return sdk.getSubmitter(network.submitter, client, network.mspid, network.ca)
		})
		.then((submitter) => {
			this._eh = cli.newEventHub();
			this._eh.setPeerAddr(network.peers[0].events);
			logger.info('Connecting the event hub');
			this._eh.connect();

			this._eh.registerBlockEvent((block) => {
				logger.info('*** Block Event ***');
				logger.info('chain id :' + this._id);
				var len = block.data.data.length;
				logger.info('data.data.length :' + len);
				for (var i = 0; i < len; i++) {
					var payload = block.data.data[i].payload;
					var channel_header = payload.header.channel_header;
					if (channel_header.type == 'ENDORSER_TRANSACTION') {
						var txid = channel_header.tx_id;
						logger.info('transaction id :' + txid);
						var transaction = payload.data;
						var actionPayload = transaction.actions[0].payload;
						var proposalPayload = actionPayload.chaincode_proposal_payload;
						// Unlike v0.6, invoke/deploy cannot be differentiated by this stage
						// * Decoding a deployment transaction in InvocationSpec does not cause a prima facie error
						//   DeploymentSpec also has a ChaincodeSpec at the beginning, just like InvocationSpec.
						//   At deployment time, ccid is "lccc" (system chain code) so decision can be made after decode
						var invocationSpec = _ccProto.ChaincodeInvocationSpec.decode(proposalPayload.input);
						// Chaincode name and argument list (function name at the beginning) can be obtained from invocationSpec
						var ccid = invocationSpec.chaincode_spec.chaincode_id.name;
						logger.info('chaincode id :' + ccid);
						// Refine before performing action.
						// Transactions are excluded if they are not from chaincode related ConnectionChain
						var isRelated = false;
						if (ccid == config.chaincodeID_ec || ccid == config.chaincodeID_ns) {
							isRelated = true;
						} else {
							for (var k = 0; k < config.chaincodeIDs.length; k++) {
								if (ccid == config.chaincodeIDs[k]) {
									isRelated = true;
									break;
								}
							}
						}
						if (isRelated) {
							var args = invocationSpec.chaincode_spec.input.args;
							logger.info('args.length :' + args.length);
							for (var j = 0; j < args.length; j++) {
								// toString must be coded
								args[j] = args[j].toString('utf8');
								logger.info('args[' + j + '] :' + args[j]);
							}
							// Request to perform subsequent processing
							var func = args[0];
							args.shift();
							EventEntrance.action_fromCC(this._id, txid, ccid, func, args);
						} else {
							logger.info('not related to connection chain.');
						}
					}
				}
			});

		})
		.catch((err) => {
			logger.error(err);
		});
	}

	end() {
		if (this._eh == null) {
			logger.error('EventHub does not exist');
			return;
		}
		if (this._eh.isconnected()) {
			logger.info('Disconnecting the event hub');
			this._eh.disconnect();
		}
	}

};

module.exports = CCMonitor;
