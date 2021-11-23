/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CoreAPIUtil.js
 */

/* Summary:
 * Utility classes for the core API
*/

var CoreAPIUtil = class {

	/**
	 * Content type check
	 * @param {Obj} req: request
	 * @return{bool} true: enabled/false: disabled
	**/
	static isValidContentType(req) {
		var cType = req.header('Content-type');
		if (cType != undefined) {
			// whether it is JSON format or not
			if (cType.toLowerCase().indexOf('application/json') != -1) {
				return true;
			}
		}
		return false;
	}
}

module.exports = CoreAPIUtil;
