/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CoreAPIError.js
 */

/* Summary:
 * Class for error response
*/

// user defined error code & message
var userDefinitions = require('../userImple/UserErrorDef.js');

// Error code & message definition
const definitions = {
// errorCode : errorMessage
	1000 : 'Resource does not exist. ',
	2000 : 'The request is not in JSON format. ',
	3000 : 'Internal error. ',
	9000 : 'Unknown error. ',
// unregistered information
	1001 : 'Account ID not registered. ',
	1002 : 'Unregistered chain ID of the destination. ',
// Request parameter not specified
	2001 : 'No user ID specified. ',
	2002 : 'No chain id specified. ',
	2003 : 'No account ID specified',
	2004 : 'No account display name specified',
	2005 : 'No display name specified for the chain. ',
	2007 : 'The adapter URL is not specified. ',
// duplicate registration
	3001 : 'This is an already registered account ID. ',// unused
	3002 : 'This is the chain ID of the already registered destination. '
};


var CoreAPIError = class {

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

module.exports = CoreAPIError;
