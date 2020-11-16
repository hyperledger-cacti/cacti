/*
 * Copyright 2019-2020 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * default.js
 */

export const config = {
//module.exports = {
	// Defined value for the destination independent part. I don't think I can use it only at www, so I think I can write directly there.
	// Destination dependent definition values should be in lib/PluginConfig.js.
	"sslParam" : {
		"port" : 5050,
		"key" : "./core/CA/connector.priv",
		"cert" : "./core/CA/connector.crt"
	},
	// Log level (trace/debug/info/warn/error/fatal)
	"logLevel" : "debug"
}
