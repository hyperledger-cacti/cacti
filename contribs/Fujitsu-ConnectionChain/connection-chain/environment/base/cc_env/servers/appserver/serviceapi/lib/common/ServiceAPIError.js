/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ServiceAPIError.js
 */

/* Summary:
 * error response class
*/

// user defined error code & message
var userDefinitions = require('../userImple/UserErrorDef.js');

// Error code & message definition
const definitions = {
// errorCode : errorMessage
	1000 : 'Resource does not exist.',
	2000 : 'JSON format error.',
	3000 : 'Internal error.',
	4000 : 'Permission error.',
	9000 : 'Unknown error.',
// unregistered information
	1005 : 'Unregistered user ID.',
// Request parameter not specified
	2001 : 'No user ID specified.',
	2027 : 'No password specified.',
	2028 : 'No user display name specified.',
	2029 : 'No user type specified.',
// duplicate registration
	3005 : 'The user ID already registered.'
};


var ServiceAPIError = class {

	constructor(statusCode, errorCode, detail) {
		this.statusCode = statusCode;
		this.errorCode = errorCode;
		var message = userDefinitions[errorCode] || definitions[errorCode] || definitions[9000];
		if (detail != undefined) {
			message = message + detail;
		}
		this.message = message;
		var errorBody = 
		{
			"error" :
			{
				"code" : errorCode,
				"message" : message
			}
		};
		this.errorBody = errorBody;
	}
}

module.exports = ServiceAPIError;
