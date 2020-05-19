/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * transfers.js
 */

/* Summary:
 * Asset Transfer Transaction Information Management API
*/

var express = require('express');
var config = require('config');
var request = require('request');
var ServiceAPIError = require('../../lib/common/ServiceAPIError.js');
var ServiceAPIUtil = require('../../lib/common/ServiceAPIUtil.js');
var router = express.Router();

/** 
 * Generate asset transfer transaction information
 * @name post
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Request Body:
 * 	{
 * 		"txID" "<Operation ID>",			- ID of the asset transfer transaction information. The default is set automatically.
 * 		"ruleID": "<Rule ID>",				- ID of the conversion rule to apply"
 * 		"fromChain":{						- Source information
 * 			"chainID": "<Chain ID>",		- ID of Source End-chain
 * 			"accountID": "<Account ID>",	- ID of Source account
 * 			"asset": "<Transfer Amount>"	- Amount of assets in Source End-chain.(This can be omitted when "asset" of "toChain" is specified.)
 * 		},
 * 		"toChain":{							- Destination information
 * 			"chainID": "<Chain ID>",		- ID of Destination End-chain
 * 			"accountID": "<Account ID>",	- ID of Destination account
 * 			"asset": "<Transfer Amount>"	- Amount of assets in Destination End-chain.(This can be omitted when "asset" of "fromChain" is specified.)
 * 		}
 * 	}
 * Response Body:
 * 	{
 * 		"txID": "<Operation ID>"	- ID of the generated asset transfer transaction information
 * 	}
**/
router.post('/', function(req, res, next) {
	if (!ServiceAPIUtil.isValidContentType(req)) {
		next(new ServiceAPIError(400, 2000));
		return;
	}
	var ccUserID = req.user.userID;
	var headers = {
		'Content-Type':'application/json',
		'X-CCUser':ccUserID
	}
	// Pass parameters as-is, leave checks to core API
	var options = {
		url: config.coreapi.url + '/transfers',
		method: 'POST',
		headers: headers,
		json: true,
		body: req.body
	}
	// console.log(options);
	// console.log(options.body);
	request(options, function (err, response, body) {
		if (err) {
			var detail = err.stack ? err.stack : err;
			next(new ServiceAPIError(500, 3000, detail));
			return;
		}
		// console.log(body);
		res.status(response.statusCode).send(body);
	})
});


/** 
 * Get one asset transfer transaction information
 * @name get/:id
 * @function
 * @inner
 * @param {string} path - Operation ID to get
 * @param {callback} middleware - Express middleware
 * Response Body:
 * Each event ID and timestamp is displayed only when the corresponding operation is performed.
 * 	{
 * 		"id": "<Operation ID>",
 * 		"userID": "<ConnectionChain User ID>",		- ID of the user who generated the asset transfer transaction information
 * 		"ruleID": "<Rule ID>",
 * 		"fromChain":{
 * 			"chainID": "<Chain ID>",
 * 			"accountID": "<Account ID>",
 * 			"asset": "<Transfer Amount>",
 * 			"settlementAccountID": "<Representative ID>",
 * 			"escrowAccountID": "<Escrow ID>",
 * 			"escrowEvID":" <Escrow Event ID>",		- Event ID of  asset transfer request to escrow account
 * 			"settlementEvID": "<Freeze Event ID>",	- Event ID of asset transfer request to representative account
 * 			"restoreEvID": "<Recover Event ID>"		- Event ID of  asset transfer request from escrow account to source account
 * 		},
 * 		"toChain":{
 * 			"chainID": "<Chain ID>",
 * 			"accountID": "<Account ID>",
 * 			"asset": "<Transfer Amount>",
 * 			"settlementAccountID": "<Representative ID>",
 * 			"paymentEvID": "<Payment Event ID>"		- Event ID of asset transfer request from representative account to destination account
 * 		},
 * 		"progress": "<Transfer Status>",			- Current asset transfer transaction progress
 * 		"timestamps" :{								- Timestamp at each progress of the asset transfer transaction
 * 			"create": "<Date Created>",
 * 			"requestMargin": "<Recorded date of Escrow Event ID>",
 * 			"fixedMargin": "<Recorded date of Escrow commitment status>",
 * 			"failedMargin": "<Recorded date of Escrow failure status>",
 * 			"requestDirectFreeze": "<Recorded date of Freeze Event ID (Non-escrow)>",
 * 			"fixedDirectFreeze": "<Recorded date of Freeze commitment status (Non-escrow)>",
 * 			"failedDirectFreeze": "<Recorded date of Freeze failure status (Non-escrow)>",
 * 			"requestCredit": "<Recorded date of Payment Event ID>",
 * 			"fixedCredit": "<Recorded date of Payment commitment status>",
 * 			"failedCredit": "<Recorded date of Payment failure status>",
 * 			"requestRecovery": "<Recorded date of Recovery Event ID>",
 * 			"fixedRecovery": "<Recorded date of Recorvery commitment status>",
 * 			"requestFreeze": "<Recorded date of Frozen Event ID(escrow)>",
 * 			"fixedFreeze": "<Recorded date of Freeze commitment status(escrow)>"
 * 		}
 * 	}
**/
router.get('/:id', function(req, res, next) {
	if (!ServiceAPIUtil.isValidContentType(req)) {
		next(new ServiceAPIError(400, 2000));
		return;
	}
	var ccUserID = req.user.userID;
	var headers = {
		'Content-Type':'application/json',
		'X-CCUser':ccUserID
	}
	var options = {
		url: config.coreapi.url+ '/transfers/' + req.params.id,
		method: 'GET',
		headers: headers,
		json: true
	}
	request(options, function (err, response, body) {
		if (err) {
			var detail = err.stack ? err.stack : err;
			next(new ServiceAPIError(500, 3000, detail));
			return;
		}
		if (!ServiceAPIUtil.isAdminUser(req)) {
			// If not admin, then only the information associated with the logged-in user is visible.
			if (response.statusCode == 200) {
				if (ccUserID != body.userID) {
					next(new ServiceAPIError(403, 4000));
					return;
				}
			}
		}
		res.status(response.statusCode).send(body);
	})
});

/** 
 * Get Asset transfer transaction information list
 * @name get
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Request Body:
 * Filter condition. You can omit elements that you do not want to filter.
 *  (You can only specify your own userID while you are logged in as a non-administrator)
 * 	{
 * 		"userID": "<ConnectionChain User ID>",
 * 		"progress": "<Transfer Status>",
 * 		"createdBefore": "<Creation Date (Before the specified date)>",
 * 		"createdAfter": "<Creation Date(After the specified date)>",
 * 		"updatedBefore": "<Last Updated Date(Before the specified date)>",
 * 		"updatedAfter": "<Last Updated (After the specified date)>"
 * 	}
 * Response Body: Array of asset transfer transaction information
**/
router.get('/', function(req, res, next) {
	if (!ServiceAPIUtil.isValidContentType(req)) {
		next(new ServiceAPIError(400, 2000));
		return;
	}

	var ccUserID = req.user.userID;
	var qUserID = req.query.userID;
	if (!ServiceAPIUtil.isAdminUser(req)) {
		// If not admin, then only the information associated with the logged-in user is visible.
		if (qUserID == undefined) {
			req.query.userID = ccUserID;
		} else if (qUserID != ccUserID) {
			next(new ServiceAPIError(403, 4000));
			return;
		}
	}

	var headers = {
		'Content-Type':'application/json',
		'X-CCUser':ccUserID
	}
	var options = {
		url: config.coreapi.url + '/transfers',
		method: 'GET',
		headers: headers,
		json: true,
		qs: req.query
	}
	request(options, function (err, response, body) {
		if (err) {
			var detail = err.stack ? err.stack : err;
			next(new ServiceAPIError(500, 3000, detail));
			return;
		}
		res.status(response.statusCode).send(body);
	})
});

module.exports = router;

