/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * endchains.js
 */

/* Summary:
 * Destination End-chain Information Management API
*/

var express = require('express');
var config = require('config');
var request = require('request');
var ServiceAPIError = require('../../lib/common/ServiceAPIError.js');
var ServiceAPIUtil = require('../../lib/common/ServiceAPIUtil.js');
var router = express.Router();

/** 
 * Genarate destination end-chain information
 * @name post
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Request Body:
 * 	{
 * 		"chainID": "<Chain ID>",      - ID of the destination end-chain information to register
 * 		"chainName": "<Chain Name>",  - Alias to be used on the UI
 * 		"adapterUrl": "<Adapter URL>" - URL of the adapter server connected to end-chain
 * 	}
 * Response Body:
 * 	{
 * 		"chainID": "<Chain ID>" - ID of registered destination end-chain information
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
		url: config.coreapi.url + '/endchains',
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
 * Update destination end-chain information
 * @name put/:id
 * @function
 * @inner
 * @param {string} path - Chain ID to update
 * @param {callback} middleware - Express middleware
 * Request Body:
 * (Elements that should not be changed can be omitted)
 * 	{
 * 		"chainName": "<Chain Name>",
 * 		"adapterUrl": "<Adapter URL>"
 * 	}
 * Response Body:
 * 	{
 * 		"chainID": "<Chain ID>"  - ID of the updated destination end-chain information
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
		url: config.coreapi.url+ '/endchains/' + req.params.id,
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
 * Delete destination end-chain information
 * @name delete/:id
 * @function
 * @inner
 * @param {string} path - Chain ID to delete
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
		url: config.coreapi.url+ '/endchains/' + req.params.id,
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
 * Get one destination end-chain information
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
		url: config.coreapi.url+ '/endchains/' + req.params.id,
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
 * Get destination end-chain information list
 * @name get
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Response Body: Array of destination end-chain information
**/
router.get('/', function(req, res, next) {
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
		url: config.coreapi.url + '/endchains',
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
