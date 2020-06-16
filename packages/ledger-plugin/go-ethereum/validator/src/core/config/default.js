/*
 * Copyright 2019-2020 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * default.js
 */

module.exports = {
	// Defined value for the destination independent part.
	// Destination dependent definition values should be in lib/PluginConfig.js.
	"sslParam" : {
		"port" : 5050,
		"key" : './CA/connector.priv',
		"cert" : './CA/connector.crt'
	},
	// Log level (trace/debug/info/warn/error/fatal)
	"logLevel" : "debug"
};
