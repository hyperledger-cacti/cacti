/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * rules.js
 */

/* Summary:
 * Conversion Rules Information Management API
*/

var express = require('express');
var config = require('config');
var request = require('request');
var ServiceAPIError = require('../../lib/common/ServiceAPIError.js');
var ServiceAPIUtil = require('../../lib/common/ServiceAPIUtil.js');
var router = express.Router();

/** 
 * Generate Conversion Rule Information
 * @name post
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Request Body:
 * 	{
 * 		"ruleName": "<Rule Name>",							- Alias to be used on the UI
 * 		"fromChain":{										- Source information
 * 			"chainID": "<Chain ID>",						- ID of Source End-chain
 * 			"settlementAccountID": "<Representative ID>",	- ID of the representative account of Source End-chain
 * 			"escrowAccountID": "<Escrow ID>"				- ID of the escrow account of Source End-chain. If omitted, no escrow occurs in transaction.
 * 		},
 * 		"toChain":{											- Destination information
 * 			"chainID": "<Chain ID>",						- ID of Destination End-chain
 * 			"settlementAccountID": "<Representative ID>"	- ID of the representative account of Destination End-chain
 * 		},
 * 		"rule": "<Conversion Rate>"							- Conversion ratio (%) from the source asset to the destination asset. The default is 100.
 * 		"commission": "<commission>"						- Amount to deduct from the source asset before conversion. The default is 0.
 * 	}
 * Response Body:
 * 	{
 * 		"ruleID": "<Rule ID>"	- ID of the registered conversion rule information
 * 	}
**/
router.post('/', function(req, res, next) {
	if (!ServiceAPIUtil.isValidContentType(req)) {
		next(new ServiceAPIError(400, 2000));
		return;
	}
	if (!ServiceAPIUtil.isAdminUser(req)) {
		next(new ServiceAPIError(403, 4000));
		return;
	}
	var ccUserID = req.user.userID;
	var headers = {
		'Content-Type':'application/json',
		'X-CCUser':ccUserID
	}
	// Pass parameters as-is, leave checks to core API
	var options = {
		url: config.coreapi.url + '/rules',
		method: 'POST',
		headers: headers,
		json: true,
		body: req.body
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

/** 
 * Update conversion rule information
 * @name put/:id
 * @function
 * @inner
 * @param {string} path - Rule ID to update
 * @param {callback} middleware - Express middleware
 * Request Body:
 * (Elements that you do not change can be omitted.)
 * 	{
 * 		"ruleName": "<Rule Name>",
 * 		"fromChain":{
 * 			"chainID": "<Chain ID>",
			"isEscrow" <Deposited (boolean)>,   - True when non-escrow -> escrow, False when escrow -> non-escrow
 * 			"settlementAccountID": "<Representative ID>",
 * 			"escrowAccountID": "<Escrow ID>"
 * 		},
 * 		"toChain":{
 * 			"chainID": "<Chain ID>",
 * 			"settlementAccountID": "<Representative ID>"
 * 		},
 * 		"rule": "<Conversion Rate>",
 * 		"commission": "<commission>"
 * 	}
 * Response Body:
 * 	{
 * 		"ruleID": "<Rule ID>"	- ID of the updated conversion rule information
 * 	}
**/
router.put('/:id', function(req, res, next) {
	if (!ServiceAPIUtil.isValidContentType(req)) {
		next(new ServiceAPIError(400, 2000));
		return;
	}
	if (!ServiceAPIUtil.isAdminUser(req)) {
		next(new ServiceAPIError(403, 4000));
		return;
	}
	var ccUserID = req.user.userID;
	var headers = {
		'Content-Type':'application/json',
		'X-CCUser':ccUserID
	}

	var options = {
		url: config.coreapi.url+ '/rules/' + req.params.id,
		method: 'PUT',
		headers: headers,
		json: true,
		body: req.body
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

/** 
 * Delete Conversion Rule Information
 * @name delete/:id
 * @function
 * @inner
 * @param {string} path - Rule ID to delete
 * @param {callback} middleware - Express middleware
**/
router.delete('/:id', function(req, res, next) {
	if (!ServiceAPIUtil.isAdminUser(req)) {
		next(new ServiceAPIError(403, 4000));
		return;
	}

	var ccUserID = req.user.userID;
	var headers = {
		'Content-Type':'application/json',
		'X-CCUser':ccUserID
	}
	var options = {
		url: config.coreapi.url+ '/rules/' + req.params.id,
		method: 'DELETE',
		headers: headers,
		json: true
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

/** 
 * Get one conversion rule information
 * @name get/:id
 * @function
 * @inner
 * @param {string} path - Rule ID to get
 * @param {callback} middleware - Express middleware
 * Response Body:
 * 	{
 * 		"id": "<Rule ID>",
 * 		"ruleName": "<Rule Name>",
 * 		"fromChain":{
 * 			"chainID": "<Chain ID>",
 * 			"settlementAccountID": "<Representative ID>",
 * 			"escrowAccountID": "<Escrow ID>"
 * 		},
 * 		"toChain":{
 * 			"chainID": "<Chain ID>",
 * 			"settlementAccountID": "<Representative ID>"
 * 		},
 * 		"rule": "<Conversion Rate>",
 * 		"commission": "<commission>"
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
		url: config.coreapi.url+ '/rules/' + req.params.id,
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
		res.status(response.statusCode).send(body);
	})
});

/** 
 * Get conversion rule information list
 * @name get
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Request Body:
 * Filter condition. You can omit elements that you do not want to filter.
 * 	{
 * 		"fromChainID": "<Chain ID of Source End-chain>",
 * 		"toChainID": "<Chain ID of Destination End-chain>"
 * 	}
 * Response Body:Response body: Array of conversion rule information
**/
router.get('/', function(req, res, next) {
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
		url: config.coreapi.url + '/rules',
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
