/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * default.js
 */

module.exports = {
	// DB information to Store ConnectionChain user information
	mongodb: {
		url: "mongodb://localhost:27017/test"
	},
	// Core API connection destination information
	coreapi: {
		url: "http://rest-server:3030"
	}
};