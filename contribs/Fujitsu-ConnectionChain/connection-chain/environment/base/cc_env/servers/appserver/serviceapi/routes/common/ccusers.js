/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ccusers.js
 */

/* Summary:
 * ConnectionChain User Information Management API
*/

var express = require('express');
var collection = require( '../../lib/common/mongo.js' );
var ServiceAPIError = require('../../lib/common/ServiceAPIError.js');
var ServiceAPIUtil = require('../../lib/common/ServiceAPIUtil.js');
var router = express.Router();

var user_col = 'ccusers';

/** 
 * Generate ConnetionChain user
 * @name post
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Request Body:
 * 	{
 * 		"userID": "<ConnectionChain User ID>" ,  - ID of the ConnectionChain user to register
 * 		"password": "<Password>" ,               - Password to login
 * 		"userName": "<Display Name>",            - Alias to use on the UI
 * 		"role": "<User Type>",                   -"admin" or "user", etc. Other than "admin", any string can be set.
 * 	}
 * Response Body:
 * 	{
 * 		"userID": "<ConnectionChain User ID>"  - ID of the registered ConnectionChain user"
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

	var userID = req.body.userID;
	if (userID == undefined) {
		next(new ServiceAPIError(422, 2001));
		return;
	}
	var password = req.body.password;
	if (password == undefined) {
		next(new ServiceAPIError(422, 2027));
		return;
	}
	var userName = req.body.userName;
	if (userName == undefined) {
		next(new ServiceAPIError(422, 2028));
		return;
	}
	var role = req.body.role;
	if (role == undefined) {
		next(new ServiceAPIError(422, 2029));
		return;
	}

	// Get user information from DB
	collection(user_col).findOne({"userID":{$eq:userID}}, {}, function(err, result){
		if (err) {
			var detail = err.stack ? err.stack : err;
			next(new ServiceAPIError(500, 3000, detail));
			return;
		}
		if (result != undefined) {
			// Registered user
			next(new ServiceAPIError(422, 3005));
			return;
		}

		// Hash password and register in DB
		var hash = ServiceAPIUtil.getHash(password);
		collection(user_col).insertOne({"userID": userID,
										"password": hash,
										"userName": userName,
										"role": role},
										function(err, result){
			if (err) {
				var detail = err.stack ? err.stack : err;
				next(new ServiceAPIError(500, 3000, detail));
				return;
			}
			var resObj = {userID:userID};
			res.status(201).send(resObj);
		});
	});
});

/** 
 * Update ConnectionChain user information
 * @name put/:id
 * @function
 * @inner
 * @param {string} path - ConnectionChain user ID to update
 * @param {callback} middleware - Express middleware
 * Request Body:
 * (Elements that should not be changed can be omitted)
 * 	{
 * 		"password": "<Password>",
 * 		"userName": "<Display Name>"
 * 	}
 *  Response Body:
 * 	{
 * 		"userID": "<ConnectionChain User ID>"  - ID of the updated ConnectionChain user"
 * 	}
**/
router.put('/:id', function(req, res, next) {
	if (!ServiceAPIUtil.isValidContentType(req)) {
		next(new ServiceAPIError(400, 2000));
		return;
	}

	var id = req.params.id;
	if (!ServiceAPIUtil.isAdminUser(req)) {
		// If not admin, you can only change your own information
		if (id != req.user.userID) {
			next(new ServiceAPIError(403, 4000));
			return;
		}
	}

	// Get user information from DB
	collection(user_col).findOne({"userID":{$eq:id}}, {}, function(err, result){
		if (err) {
			var detail = err.stack ? err.stack : err;
			next(new ServiceAPIError(500, 3000, detail));
			return;
		}
		if (result == undefined) {
			// Unregistered user
			next(new ServiceAPIError(404, 1005));
			return;
		}


		var update_obj = {};
		// Do not update unspecified parameters
		var password = req.body.password;
		if (password != undefined) {
			// Hash the password
			var hash = ServiceAPIUtil.getHash(password);
			update_obj["password"] = hash;
		}
		var userName = req.body.userName;
		if (userName != undefined) {
			update_obj["userName"] = userName;
		}
		
		collection(user_col).updateOne({"userID":{$eq:id}}, {$set: update_obj},
										function(err, result){
			if (err) {
				var detail = err.stack ? err.stack : err;
				next(new ServiceAPIError(500, 3000, detail));
				return;
			}
			var resObj = {userID:id};
			res.status(200).send(resObj);
		});
	});
});

/** 
 * Delete ConnectionChain user information
 * @name delete/:id
 * @function
 * @inner
 * @param {string} path - ConnectionChain user ID to delete
 * @param {callback} middleware - Express middleware
**/
router.delete('/:id', function(req, res, next) {
	if (!ServiceAPIUtil.isAdminUser(req)) {
		next(new ServiceAPIError(403, 4000));
		return;
	}
	var id = req.params.id;
	// Remove user information from DB
	collection(user_col).deleteOne({"userID":{$eq:id}}, {}, function(err, result){
		if (err) {
			var detail = err.stack ? err.stack : err;
			next(new ServiceAPIError(500, 3000, detail));
			return;
		}
		res.status(204).send();
	});
});

/** 
 * Get one ConnectionChain user information
 * @name get/:id
 * @function
 * @inner
 * @param {string} path - ConnectionChain user ID to get
 * @param {callback} middleware - Express middleware
 * Response Body:
 * 	{
 * 		"id": "<ConnectionChain User ID>",
 * 		"password": "<Password>",
 * 		"userName": "<Display Name>",
 * 		"role": "<User Type>"
 * 	}
**/
router.get('/:id', function(req, res, next) {
	var id = req.params.id;
	if (!ServiceAPIUtil.isAdminUser(req)) {
		// If not admin, you can only get your own information
		if (id != req.user.userID) {
			next(new ServiceAPIError(403, 4000));
			return;
		}
	}

	// Get user information from DB
	collection(user_col).findOne({"userID":{$eq:id}}, {}, function(err, result){
		if (err) {
			var detail = err.stack ? err.stack : err;
			next(new ServiceAPIError(500, 3000, detail));
			return;
		}
		if (result == undefined) {
			// Unregistered user
			next(new ServiceAPIError(404, 1005));
			return;
		}
		var resObj = result;
		res.status(200).send(resObj);
	});
});

/** 
 * Get ConnectionChain user information list
 * @name get
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Response Body: Array of ConnectionChain user information
**/
router.get('/', function(req, res, next) {
	if (!ServiceAPIUtil.isAdminUser(req)) {
		next(new ServiceAPIError(403, 4000));
		return;
	}
	// Get user information from DB
	collection(user_col).find().toArray(function(err, result){
		if (err) {
			var detail = err.stack ? err.stack : err;
			next(new ServiceAPIError(500, 3000, detail));
			return;
		}
		var resObj = result;
		res.status(200).send(resObj);
	});
});

module.exports = router;
