/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * endchains.js
 */

/* Summary:
 * Destination EC information management API
*/

var express = require('express');
var config = require('config');
var fabricSdkPost = require("../../lib/common/fabric_v1.0/sdk_if.js");
var CoreAPIError = require('../../lib/common/CoreAPIError.js');
var CoreAPIUtil = require('../../lib/common/CoreAPIUtil.js');
var router = express.Router();


/** 
 * Destination EC information generation
 * @name post
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Request Body:
 * 	{
 * 		"chainID": "<Chain ID>",		- ID of the destination EC information to register
 * 		"chainName": "<Chain Name>",	- display name, for example, on the UI
 * 		"adapterUrl": "<Adapter URL>"	- URL of the adapter server to the appropriate EC
 * 	}
 * Response Body:
 * 	{
 * 		"chainID": "<Chain ID>"	- ID of registered destination EC information
 * 	}
**/
router.post('/', function(req, res, next) {
	if (!CoreAPIUtil.isValidContentType(req)) {
		next(new CoreAPIError(400, 2000));
		return;
	}

	var chainID = req.body.chainID;
	if (chainID == undefined) {
		next(new CoreAPIError(422, 2002));
		return;
	}
	var chainName = req.body.chainName;
	if (chainName == undefined) {
		next(new CoreAPIError(422, 2005));
		return;
	}
	var adapterUrl = req.body.adapterUrl;
	if (adapterUrl == undefined) {
		next(new CoreAPIError(422, 2007));
		return;
	}

	var invokeArgs = [chainID, chainName, adapterUrl];

	fabricSdkPost.invokeRequest(config.chainId,
								config.network,
								config.channelName,
								config.chaincodeID_ec,
								'addECInfo',
								invokeArgs)
	.then((response) => {
		if (response.data != ''){
			res.header('Content-Type', 'application/json; charset=UTF-8');
			var resObj = {chainID:response.data};
			res.status(201).send(resObj);
		}else{
			next(new CoreAPIError(500, 3002));
		}
	})
	.catch((err) => {
		var detail = err.stack ? err.stack : err;
		next(new CoreAPIError(500, 3000, detail));
		return;
	});
});

/** 
 * Update destination EC information
 * @name put/:id
 * @function
 * @inner
 * @param {string} path - Chain ID to update
 * @param {callback} middleware - Express middleware
 * Request Body:
 * * Elements that should not be changed can be omitted.
 * 	{
 * 		"chainName": "<Chain Name>",
 * 		"adapterUrl": "<Adapter URL>"
 * 	}
 * Response Body:
 * 	{
 * 		"chainID": "<Chain ID>"	- ID of the updated destination EC information
 * 	}
**/
router.put('/:id', function(req, res, next) {
	if (!CoreAPIUtil.isValidContentType(req)) {
		next(new CoreAPIError(400, 2000));
		return;
	}

	var id = req.params.id;

	// Unspecified parameter specifies an empty string (Never Update)
	var chainName = req.body.chainName;
	if (chainName == undefined) {
		chainName = '';
	}
	var adapterUrl = req.body.adapterUrl;
	if (adapterUrl == undefined) {
		adapterUrl = '';
	}

	var invokeArgs = [id, chainName, adapterUrl];

	fabricSdkPost.invokeRequest(config.chainId,
								config.network,
								config.channelName,
								config.chaincodeID_ec,
								'updateECInfo',
								invokeArgs)
	.then((response) => {
		if (response.data != ''){
			res.header('Content-Type', 'application/json; charset=UTF-8');
			var resObj = {chainID:response.data};
			res.send(resObj);
		}else{
			next(new CoreAPIError(404, 1002));
		}
	})
	.catch((err) => {
		var detail = err.stack ? err.stack : err;
		next(new CoreAPIError(500, 3000, detail));
		return;
	});
});

/** 
 * Delete destination EC information
 * @name delete/:id
 * @function
 * @inner
 * @param {string} path - Chain ID to delete
 * @param {callback} middleware - Express middleware
**/
router.delete('/:id', function(req, res, next) {
	var invokeArgs = [req.params.id];
	fabricSdkPost.invokeRequest( config.chainId,
								config.network,
								config.channelName,
								config.chaincodeID_ec,
								'deleteECInfo',
								invokeArgs)
	.then((response) => {
		res.status(204).send();
	})
	.catch((err) => {
		var detail = err.stack ? err.stack : err;
		next(new CoreAPIError(500, 3000, detail));
		return;
	});
});

/** 
 * Obtain one destination EC information
 * @name get/:id
 * @function
 * @inner
 * @param {string} path - Chain ID to get
 * @param {callback} middleware - Express middleware
 * Response Body:
 * 	{
 * 		"id": "<Chain ID>",
 * 		"chainName": "<Chain Name>",
 * 		"adapterUrl": "<Adapter URL>"
 * 	}
**/
router.get('/:id', function(req, res, next) {
	var queryArgs = [req.params.id];
	fabricSdkPost.queryRequest( config.chainId,
								config.network,
								config.channelName,
								config.chaincodeID_ec,
								'getECInfo',
								queryArgs)
	.then((response) => {
		if (response != ''){
			res.header('Content-Type', 'application/json; charset=UTF-8');
			res.send(JSON.parse(response));
		}else{
			next(new CoreAPIError(404, 1002));
		}
	})
	.catch((err) => {
		var detail = err.stack ? err.stack : err;
		next(new CoreAPIError(500, 3000, detail));
		return;
	});
});

/** 
 * Get the list of destination EC information
 * @name get
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Response Body:Array of destination EC information
**/
router.get('/', function(req, res, next) {
	var queryArgs = [];

	fabricSdkPost.queryRequest( config.chainId,
								config.network,
								config.channelName,
								config.chaincodeID_ec,
								'getECInfoList',
								queryArgs)
	.then((response) => {
		res.header('Content-Type', 'application/json; charset=UTF-8');
		res.send(JSON.parse(response));
	})
	.catch((err) => {
		var detail = err.stack ? err.stack : err;
		next(new CoreAPIError(500, 3000, detail));
		return;
	});
});

module.exports = router;
