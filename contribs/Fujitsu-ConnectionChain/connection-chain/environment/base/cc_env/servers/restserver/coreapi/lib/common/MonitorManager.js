/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MonitorManager.js
 */

/* Summary:
 * Library for managing event monitoring classes
*/

var CCMonitor = require('./fabric_v1.0/CCMonitor.js');
var ExpMonitor  = require('./exp/ECMonitor.js');
var fabricSdkPost = require("./fabric_v1.0/sdk_if.js");
var config = require('config');
// Log settings
var log4js = require('log4js');
var logger = log4js.getLogger('MonitorManager[' + process.pid + ']');
logger.level = config.logLevel;

var ECMonitorTable = {};
var allStarted = false;

/**
 * startAllMonitor: Starts monitoring all (CC, EC) events
**/
exports.startAllMonitor = function() {
	// Run once at server startup
	if (allStarted) return;

	// Start CCMonitor
	var ccm = new CCMonitor(config.chainId, config.network);
	ccm.start();

	// Get registered connection EC information list
	var queryArgs = [];
	fabricSdkPost.queryRequest( config.chainId,
								config.network,
								config.channelName,
								config.chaincodeID_ec,
								'getECInfoList',
								queryArgs)
	.then((response) => {
		var ecList = JSON.parse(response);
		if (ecList) {
			// ECMonitor started for each EC
			for (var i = 0; i < ecList.length; i++) {
				var chainId = ecList[i].id;
				var adapterUrl = ecList[i].adapterUrl;
				addECMonitor(chainId, adapterUrl);
			}
		}
	})
	.catch((err) => {
		logger.error(err);
	});

	allStarted = true;
}

/**
 * addECMonitor: add & start new EC event monitoring
 * @param {string} chainId: Chain ID
 * @param {string} adapterUrl: Adapter server URL
**/
function addECMonitor(chainId, adapterUrl) {
	var ecm = ECMonitorTable[chainId];
	if (ecm) return; // Already added

	ecm = new ExpMonitor(chainId, adapterUrl);
	ECMonitorTable[chainId] = ecm;
	ecm.start();

	logger.info('ECMonitorTable:');
	logger.info(Object.keys(ECMonitorTable));
}

exports.addECMonitor = function(chainId, adapterUrl) {
	return addECMonitor(chainId, adapterUrl);
}

/**
 * removeECMonitor: stops and removes EC event monitoring
 * @param {string} chainId: Chain ID
**/
exports.removeECMonitor = function(chainId) {
	var ecm = ECMonitorTable[chainId];
	if (!ecm) return; // no longer exists

	ecm.end();
	delete ECMonitorTable[chainId];

	logger.info('ECMonitorTable:');
	logger.info(Object.keys(ECMonitorTable));
}
