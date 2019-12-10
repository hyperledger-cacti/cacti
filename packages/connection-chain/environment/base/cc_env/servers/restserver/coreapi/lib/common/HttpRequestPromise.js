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
 * None (For lib)
*/

// Dependency declaration of base package
var request = require('request');
var HttpsProxyAgent = require('https-proxy-agent');
var proxy = process.env.http_proxy;
var agent = null;
if (proxy) {
	agent = new HttpsProxyAgent(proxy);
}

// Send Http Request
function send(options) {
	return new Promise((resolve, reject) => {
		if (agent) {
			options.agent = agent;
		}
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

