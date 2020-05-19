/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EventEntrance.js
 */

/* Summary:
 * Allocate the events detected by the CCMonitor/ECMonitor to the library for each subsequent process.
*/
var EcInfoAction = require('./EcInfoAction.js');
var EventMediator = require('../userImple/EventMediator.js');
var config = require('config');
// Log settings
var log4js = require('log4js');
var logger = log4js.getLogger('EventEntrance[' + process.pid + ']');
logger.level = config.logLevel;

/**
 * Subsequent processing calls for discovery events from ConnectionChain
 * @param {string} cainId :Chain ID ("ConnectionChain")
 * @param {string} txid :Transaction id
 * @param {string} ccid :Chaincode ID
 * @param {string} func :Invoke execute function
 * @param {[]string} args :Invoke run-time arguments
**/
exports.action_fromCC = function(chainId, txid, ccid, func, args) {
	if (ccid == config.chaincodeID_ec) {
		// events from the chaincode for destination information management
		EcInfoAction.receivedECInfoEvent(func, args);
	} else if (ccid == config.chaincodeID_ns) {
		// events from the chaincode for naming service 
		// No special handling
	} else {
		// events from chaincodes which is user-written (or out of the functions of ConnectionChain)
		EventMediator.receivedUserChaincodeEvent(ccid, func, args);
	}
}

/**
 * Subsequent processing calls for discovery events from the EC (via the pass of connector -> adapter)
 * @param {string} cainId :Chain ID
 * @param {string} eventId :Event ID
 * @param {JSON} eventInfo :Event Information
**/
exports.action_fromEC= function(chainId, eventId, eventInfo) {
	EventMediator.receivedEndchainEvent(chainId, eventId, eventInfo);
}

