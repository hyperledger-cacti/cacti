/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * default.js
 */

module.exports = {
	// Defined value for the destination independent part. I don't think I can use it only at www, so I think I can write directly there.
	// Destination dependent definition values should be in lib/PluginConfig.js.
	"sslParam" : {
		"port" : 5040,
		"key" : './CA/connector.priv',
		"cert" : './CA/connector.crt'
	},
	// Log level (trace/debug/info/warn/error/fatal)
	"logLevel" : "debug"
};
