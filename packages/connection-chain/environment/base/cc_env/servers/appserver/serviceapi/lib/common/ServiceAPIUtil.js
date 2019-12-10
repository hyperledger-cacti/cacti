/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ServiceAPIUtil.js
 */

/* Summary:
 * Utility classes for the service API
*/

var crypto = require("crypto");

var ServiceAPIUtil = class {

	/**
	 * Content Type Check
	 * @param {Obj} req: Request object
	 * @return{bool} true: enabled/false: disabled
	**/
	static isValidContentType(req) {
		var cType = req.header('Content-type');
		if (cType != undefined) {
			// JSON format Check
			if (cType.toLowerCase().indexOf('application/json') != -1) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Role Check
	 * @param {Obj} req: Request object
	 * @return{bool} true: Administrator/false: General User
	**/
	static isAdminUser(req) {
		var user = req.user;
		if (user != undefined) {
			if (user.role == 'admin') {
				return true;
			}
		}
		return false;
	}

	/**
	 * hash generation
	 * @param {string} input: Input character
	 * @return{string} Hex digest with sha256
	**/
	static getHash(input) {
		var sha256 = crypto.createHash('sha256');
		sha256.update(input);
		var hash = sha256.digest('hex');
		return hash;
	}

}

module.exports = ServiceAPIUtil;
