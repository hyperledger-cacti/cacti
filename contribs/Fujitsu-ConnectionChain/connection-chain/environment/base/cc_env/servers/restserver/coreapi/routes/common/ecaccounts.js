/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ecaccounts.js
 */

/* Summary:
 * EC Account Information Management API
*/

var express = require('express');
var config = require('config');
var fabricSdkPost = require("../../lib/common/fabric_v1.0/sdk_if.js");
var EcInfoAction = require('../../lib/common/EcInfoAction.js');
var CoreAPIError = require('../../lib/common/CoreAPIError.js');
var CoreAPIUtil = require('../../lib/common/CoreAPIUtil.js');
var router = express.Router();


/** 
 * EC account information generation
 * @name post
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Request Body:
 * 	{
 * 		"userID": "<CC User ID>",					- CC user ID tied to the account
 * 		"chainID": "<Chain ID>",					- ID of the EC to which the account belongs
 * 		"accountID": "<Account ID>",				- ID of the EC-side account, such as when using the EC API
 * 		"alias": "<Display Name>",					- display name, for example, on the UI
 * 		"authInfo": "<authentication information>"	- Parameters used when authentication is required for EC-side account operations (Omit if authentication is not required.)
 * 	}
 * Response Body:
 * 	{
 * 		"ECAccountID": "<EC Account ID>"	- ID of the registered EC account information
 * 	}
**/
router.post('/', function(req, res, next) {
	if (!CoreAPIUtil.isValidContentType(req)) {
		next(new CoreAPIError(400, 2000));
		return;
	}

	var userID = req.body.userID;
	if (userID == undefined) {
		next(new CoreAPIError(422, 2001));
		return;
	}
	var chainID = req.body.chainID;
	if (chainID == undefined) {
		next(new CoreAPIError(422, 2002));
		return;
	}
	var accountID = req.body.accountID;
	if (accountID == undefined) {
		next(new CoreAPIError(422, 2003));
		return;
	}
	var alias = req.body.alias;
	if (alias == undefined) {
		next(new CoreAPIError(422, 2004));
		return;
	}

	var invokeArgs = [userID, chainID, accountID, alias];

	// Only in the credential, argument itself omitted if unspecified
	var authInfo = req.body.authInfo;
	if (authInfo != undefined) {
		invokeArgs.push(authInfo);
	}

	fabricSdkPost.invokeRequest(config.chainId,
								config.network,
								config.channelName,
								config.chaincodeID_ns,
								'addECAccount',
								invokeArgs)
	.then((response) => {
		res.header('Content-Type', 'application/json; charset=UTF-8');
		var resObj = {ECAccountID:response.data};
		res.status(201).send(resObj);
	})
	.catch((err) => {
		var detail = err.stack ? err.stack : err;
		next(new CoreAPIError(500, 3000, detail));
		return;
	});
});

/** 
 * Update EC account information
 * @name put/:id
 * @function
 * @inner
 * @param {string} path - EC account ID to update
 * @param {callback} middleware - Express middleware
 * Request Body:
 * * Elements that should not be changed can be omitted.
 * 	{
 * 		"userID": "<CC User ID>",
 * 		"chainID": "<Chain ID>",
 * 		"accountID": "<Account ID>",
 * 		"alias": "<Display Name>",
 * 		"authInfo": "<authentication information>"
 * 	}
 * Response Body:
 * 	{
 * 		"ECAccountID": "<EC Account ID>"	- ID of the updated EC account information
 * 	}
**/
router.put('/:id', function(req, res, next) {
	if (!CoreAPIUtil.isValidContentType(req)) {
		next(new CoreAPIError(400, 2000));
		return;
	}

	var id = req.params.id;

	// Unspecified parameter specifies an empty string (Never Update)
	var userID = req.body.userID;
	if (userID == undefined) {
		userID = '';
	}
	var chainID = req.body.chainID;
	if (chainID == undefined) {
		chainID = '';
	}
	var accountID = req.body.accountID;
	if (accountID == undefined) {
		accountID = '';
	}
	var alias = req.body.alias;
	if (alias == undefined) {
		alias = '';
	}

	var invokeArgs = [id, userID, chainID, accountID, alias];

	// Only in the credential, argument itself omitted if unspecified
	var authInfo = req.body.authInfo;
	if (authInfo != undefined) {
		invokeArgs.push(authInfo);
	}

	fabricSdkPost.invokeRequest(config.chainId,
								config.network,
								config.channelName,
								config.chaincodeID_ns,
								'updateECAccount',
								invokeArgs)
	.then((response) => {
		if (response.data != ''){
			res.header('Content-Type', 'application/json; charset=UTF-8');
			var resObj = {ECAccountID:response.data};
			res.send(resObj);
		}else{
			next(new CoreAPIError(404, 1001));
		}
	})
	.catch((err) => {
		var detail = err.stack ? err.stack : err;
		next(new CoreAPIError(500, 3000, detail));
		return;
	});
});

/** 
 * Delete EC account information
 * @name delete/:id
 * @function
 * @inner
 * @param {string} path - EC account ID to delete
 * @param {callback} middleware - Express middleware
**/
router.delete('/:id', function(req, res, next) {
	var invokeArgs = [req.params.id];
	fabricSdkPost.invokeRequest( config.chainId,
								config.network,
								config.channelName,
								config.chaincodeID_ns,
								'deleteECAccount',
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
 * Acquire one of EC account information
 * @name get/:id
 * @function
 * @inner
 * @param {string} path - EC account ID to retrieve
 * @param {callback} middleware - Express middleware
 * Response Body:
 * 	{
 * 		"id": "<EC Account ID>",
 * 		"userID": "<CC User ID>",
 * 		"chainID": "<Chain ID>",
 * 		"chainName": "<Display name of the EC>",
 * 		"accountID": "<Account ID>",
 * 		"alias": "<Display name of the EC account>",
 * 		"authInfo": "<authentication information>"
 * 	}
**/
router.get('/:id', function(req, res, next) {
	var queryArgs = [req.params.id];
	var resInfo = {};
	fabricSdkPost.queryRequest( config.chainId,
								config.network,
								config.channelName,
								config.chaincodeID_ns,
								'getECAccount',
								queryArgs)
	.then((response) => {
		if (response != ''){
			resInfo = JSON.parse(response);
			// Get destination EC information by specifying chain ID
			return EcInfoAction.getECInfoCache(resInfo.chainID);
		}else{
			next(new CoreAPIError(404, 1001));
		}
	})
	.then((ecCache) => {
		resInfo.chainName = ecCache._chainName; // give a chain name
		res.header('Content-Type', 'application/json; charset=UTF-8');
		res.send(resInfo);
	})
	.catch((err) => {
		var detail = err.stack ? err.stack : err;
		next(new CoreAPIError(500, 3000, detail));
		return;
	});
});

/** 
 * Acquisition of EC account information list
 * @name get
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Response Body:Array of EC account information
**/
router.get('/', function(req, res, next) {
	var queryArgs = [];
	var userID = req.query.userID;
	var chainID = req.query.chainID;

	if (userID != undefined) {
		queryArgs.push(userID);
		if (chainID != undefined) {
			queryArgs.push(chainID);
		}
	} else {
		// Error if the specified arguments is only the chain ID
		if (chainID != undefined) {
			next(new CoreAPIError(422, 2001));
			return;
		}
	}
	var resArray = [];
	fabricSdkPost.queryRequest( config.chainId,
								config.network,
								config.channelName,
								config.chaincodeID_ns,
								'getECAccountList',
								queryArgs)
	.then((response) => {
		resArray = JSON.parse(response);
		// Provide a chain name for each EC account information in the array
		return setChainName(resArray, 0)
	})
	.then((accountList) => {
		res.header('Content-Type', 'application/json; charset=UTF-8');
		res.send(accountList);
	})
	.catch((err) => {
		var detail = err.stack ? err.stack : err;
		next(new CoreAPIError(500, 3000, detail));
		return;
	});
});

function setChainName(accountList, index) {
	var listLength = 0;
	if (accountList != null) {
		listLength = accountList.length;
	}
	return new Promise((resolve, reject) => {
		if (index < listLength) {
			EcInfoAction.getECInfoCache(accountList[index].chainID)
			.then((ecCache) => {
				accountList[index].chainName = ecCache._chainName; // give a chain name
				return setChainName(accountList, index+1)
			})
			.then((returnList) => {
				// resolve below (accountList); Returns the return value from to the nested caller in order
				/*
					Chain name given to accountList [0]
						Chain name given to accountList [1]
							Chain name given to accountList [2]
								resolve(accountList);
							resolve(returnList);
						resolve(returnList);
					resolve(returnList); <- To the original call Acquisition of EC account information list of "then"
				*/
				return resolve(returnList);
			})
			.catch((err) => {
				return reject(err);
			});
		} else {
			// When all the EC account information in the array has been processed, return
			return resolve(accountList);
		}
	});
}

module.exports = router;
