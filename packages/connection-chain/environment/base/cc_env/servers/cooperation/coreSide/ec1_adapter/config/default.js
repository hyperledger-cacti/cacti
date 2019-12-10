/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * default.js
 */

module.exports = {
	// definition value for a connector-independent part
	// Destination dependent definition values should be in lib/PluginConfig.js.
	"sslParam" : {
		"port" : 5030,
		"key" : './CA/adapter.priv',
		"cert" : './CA/adapter.crt'
	},
	// URL of the connector server
	"connecter_url" : 'https://xx.xx.xx.xx:5040',
	// Log level (trace/debug/info/warn/error/fatal)
	"logLevel" : "debug"
};
