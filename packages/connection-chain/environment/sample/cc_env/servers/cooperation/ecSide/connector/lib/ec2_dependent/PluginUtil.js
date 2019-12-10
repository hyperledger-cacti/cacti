/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PluginUtil.js
 */

/*
 * Summary:
 * Cooperation server: utility library dependent on endchains
 * For example, implementing internal functions that should not be exposed as functions of server plugins.
 */

/*
 * convNum
 *
 * @param {String/Number} value: The scientific string or numeric value to be converted. For numbers, it is returned as is.
 * @param {String/Number} default_value: The value to use if conversion was not possible. Text or number in scientific notation. Optional.
 *
 * @return {Number} The value converted to a number, or the default_value if the conversion failed.
 *
 * @desc exponentiation is also supported. The following formats are supported:. (value, default_value)
 *         3.78*10^14
 *         3.78e14
 */
exports.convNum = function(value, default_value) {
	var retvalue = 0;
	var def_value = 0;

	switch(typeof(default_value)) {
		case "number":
			def_value = default_value;
			break;
		case "string":
			var def_value_str = default_value.replace(/\*10\^/g, "e");
			def_value = parseFloat(def_value_str);
			break;
		default:	// undefined should also be included here.
			// Fixed value because of cumbersome handling.
			def_value = 0;
			break;
	}	// switch(typeof(default_value))

	if(def_value==NaN) {	// number is guaranteed.
		def_value = 0;
	}

	switch(typeof(value)) {
		case "number":
			retvalue = value;
			break;
		case "string":
			var value_str = value.replace(/\*10\^/g, "e");
			retvalue = parseFloat(value_str);
			break;
		default:
			// Set default value.
			retvalue = def_value;
			break;
	}	// switch(typeof(value))

	if(retvalue==NaN) {	// number is guaranteed.
		retvalue = def_value;
	}

	return retvalue;
}

