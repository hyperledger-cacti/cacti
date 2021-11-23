/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * login.js
 */

var express = require('express');
var router = express.Router();

var ServiceAPIUtil = require('../../lib/common/ServiceAPIUtil.js');
var collection = require( '../../lib/common/mongo.js' );
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

var user_col = 'ccusers';

passport.use(new LocalStrategy(
	function(username, password, done) {

		// Get user information from DB
		collection(user_col).findOne({"userID":{$eq:username}}, {}, function(err, result){
			if (result != undefined) {
				// password check
				var hash = ServiceAPIUtil.getHash(password);
				if (result.password == hash) {
					return done(null, result);
				}
			}
			return done(null, false);
		});
	}
));

/** 
 * Login
 * @name post
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {function} middleware - Passport middleware
 * @param {callback} middleware - Express middleware
 * Request Body:
 * 	{
 * 		"username": "<ConnectionChain User ID>",
 * 		"password": "<Password>"
 * 	}
**/
router.post('/', passport.authenticate('local', {session: true }), function(req, res, next){
		// If "failureRedirect" is not specified in the second argument of authenticate,
		//  directly return error with code 401 on authentication failure

		// Return users and roles as login success only (Do not make screen transitions)
		var resObj = {userName:req.user.userName, role:req.user.role};
		res.send(resObj);
	}
);

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	done(null, user);
});

module.exports = router;
