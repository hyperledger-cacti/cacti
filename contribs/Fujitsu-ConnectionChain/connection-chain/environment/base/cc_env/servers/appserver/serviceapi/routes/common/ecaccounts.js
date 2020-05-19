/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ecaccounts.js
 */

/* Summary:
 * End-chain Account Information Management API
*/

var express = require('express');
var config = require('config');
var request = require('request');
var ServiceAPIError = require('../../lib/common/ServiceAPIError.js');
var ServiceAPIUtil = require('../../lib/common/ServiceAPIUtil.js');
var router = express.Router();

/** 
 * Generate end-chain account information
 * @name post
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Request Body:
 * 	{
 * 		"userID": "<ConnectionChain User ID>",     - CC user ID tied to the account
 * 		"chainID": "<Chain ID>",                   - ID of end-chain to which the account belongs
 * 		"accountID":"<Account ID>",                - ID of end-chain account, used by end-chain API
 * 		"alias": "<Display Name>",                 - Alias to be used on the UI
 * 		"authInfo": "<authentication information>" - Parameters used when authentication is required for end-chain account operations (Omit if authentication is not required)
 * 	}
 * Response Body:
 * 	{
 * 		"ECAccountID": "<End-chain Account ID>" - ID of the registered end-chain account information
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
		url: config.coreapi.url + '/ecaccounts',
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
 * Update end-chain Account Information
 * @name put/:id
 * @function
 * @inner
 * @param {string} path - End-chain account ID to update
 * @param {callback} middleware - Express middleware
 * Request Body:
 * (Elements that should not be changed can be omitted)
 * 	{
 * 		"userID": "<ConnectionChain User ID>",
 * 		"chainID": "<Chain ID>",
 * 		"accountID": "<Account ID>",
 * 		"alias": "<Display Name>",
 * 		"authInfo": "<authentication information>"
 * 	}
 * Response Body:
 * 	{
 * 		"ECAccountID": "<End-chain Account ID>" - ID of the updated End-chain account information
 * 	}
**/
router.put('/:id', function(req, res, next) {
	if (!ServiceAPIUtil.isValidContentType(req)) {
		next(new ServiceAPIError(400, 2000));
		return;
	}

	var ccUserID = req.user.userID;
	var ecAccountID = req.params.id;
	var headers = {
		'Content-Type':'application/json',
		'X-CCUser':ccUserID
	}

	if (!ServiceAPIUtil.isAdminUser(req)) {
		// If not admin, only the information associated with the login user can be modified.
		// Get information and then judge if this ConnectionChain user can operate.
		var date = new Date(); // dummy body data to not return cache on GET after change
		var options = {
			url: config.coreapi.url+ '/ecaccounts/' + ecAccountID,
			method: 'GET',
			headers: headers,
			json: true,
			body: {ts: date}
		}
		request(options, function (err, response, body) {
			if (err) {
				var detail = err.stack ? err.stack : err;
				next(new ServiceAPIError(500, 3000, detail));
				return;
			}
			if (response.statusCode == 200) {
				if (ccUserID != body.userID) {
					next(new ServiceAPIError(403, 4000));
					return;
				}
			}
		})
	}

	var options = {
		url: config.coreapi.url+ '/ecaccounts/' + ecAccountID,
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
 * Delete end-chain Account Information
 * @name delete/:id
 * @function
 * @inner
 * @param {string} path - End-chain account ID to delete
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
		url: config.coreapi.url+ '/ecaccounts/' + req.params.id,
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
 * Get one end-chain account information
 * @name get/:id
 * @function
 * @inner
 * @param {string} path - End-chain account ID to get
 * @param {callback} middleware - Express middleware
 * Response Body:
 * 	{
 * 		"id": "<End-chain Account ID>",
 * 		"userID": "<ConnectionChain User ID>",
 * 		"chainID": "<Chain ID>",
 * 		"chainName": "<Display name of end-chain>",
 * 		"accountID": "<Account ID>",
 * 		"alias": "<Display name of the End-chain account>",
 * 		"authInfo": "<authentication information>"
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
		url: config.coreapi.url+ '/ecaccounts/' + req.params.id,
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
			// If not admin, only the information associated with the login user can get.
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
 * Get end-chain account information list
 * @name get
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Response Body:Array of end-chain account information
**/
router.get('/', function(req, res, next) {
	if (!ServiceAPIUtil.isValidContentType(req)) {
		next(new ServiceAPIError(400, 2000));
		return;
	}

	var ccUserID = req.user.userID;
	var qUserID = req.query.userID;
	if (!ServiceAPIUtil.isAdminUser(req)) {
		// If not admin, only the information associated with the login user can get.
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
		url: config.coreapi.url + '/ecaccounts',
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
