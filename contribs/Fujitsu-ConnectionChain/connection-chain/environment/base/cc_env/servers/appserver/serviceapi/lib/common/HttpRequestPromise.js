/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HttpRequestPromise.js
 */

/* Summary:
 * A library for handling HTTP requests in the form of promises
 * 
 * Entry Point:
 * None
*/

// Base package dependency declaration
var request = require('request');

// Send Http Request
function send(options) {
	return new Promise((resolve, reject) => {
		request(options, function (err, response, body) {
			if (err) {
				return reject(err);
			}
			return resolve(response);
		})
	});
}

exports.send = function(options) {
	return send(options);
}

