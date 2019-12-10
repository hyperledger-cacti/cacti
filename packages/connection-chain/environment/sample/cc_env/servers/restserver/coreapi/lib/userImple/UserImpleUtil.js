/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * UserImpleUtil.js
 */

/* Summary:
 * Utility classes for user implementations
*/

var UserImpleUtil = class {

	/**
	 * time stamp string creation
	 * @return{string} Current time string (YYYYMMDDDThhmmss format)
	**/
	static getTimestampString() {
		var dateObj = new Date();
		var y = dateObj.getFullYear();
		var m = ('0' + (dateObj.getMonth() + 1)).slice(-2);
		var d = ('0' + dateObj.getDate()).slice(-2);
		var h = ('0' + dateObj.getHours()).slice(-2);
		var min = ('0' + dateObj.getMinutes()).slice(-2);
		var s = ('0' + dateObj.getSeconds()).slice(-2);
		return ''+ y + m + d + 'T' + h + min + s;
	}

	/**
	 * Create Date object from timestamp string
	 * @param {string} tsString: Timestamp string (YYYYMMDDDThhmmss format)
	 * @return{object} Date object
	**/
	static getDateObject(tsString) {
		var y = parseInt(tsString.substr(0,4), 10);
		var m = parseInt(tsString.substr(4,2), 10) -1;
		var d = parseInt(tsString.substr(6,2), 10);
		var h = parseInt(tsString.substr(9,2), 10);
		var min = parseInt(tsString.substr(11,2), 10);
		var s = parseInt(tsString.substr(13,2), 10);
		return new Date(y, m, d, h, min, s);
	}

	/**
	 * Retrieves data from a JsonObject at the named location
	 * @param {JSON} input: JsonObject (Example: {testData:{response:{result:100}}})
	 * @param {string} fieldName: Field names in the hierarchy separated by periods (Example: "testdata.response.result")
	 * @return{} data at that location (Example: 100)
	 *           If the specified field contains an array, return a single array of values stored in those fields
	 *           (Example:
	 *            input:[{user:A, asset:10}, {user:B, asset:11}]
	 *            fieldName:".asset" * If each element in the array is not named, connect the empty string with a period
	 *            -> Return [10, 11]
	 *           )
	**/
	static getFieldData(input, fieldName) {
		var fieldData = input;
		var fieldNames = [];
		if (fieldName != null && fieldName != undefined && fieldName != '') {
			fieldNames = fieldName.split('.');
		}
		for (var i = 0; i < fieldNames.length; i++) {
			if (fieldData != null && fieldNames[i] != '') {
				fieldData = fieldData[fieldNames[i]];
			}
			if (fieldData == null || fieldData == undefined) {
				break;
			}
			// If fieldData is an array and fieldNames still follows
			if ((fieldData instanceof Array) && (i < fieldNames.length -1)) {
				var fieldDataArray = [];
				// Reconnect subsequent field names with a period
				var subFieldName = fieldNames[i + 1];
				for (var j = i + 2; j < fieldNames.length; j++) {
					subFieldName = subFieldName + '.' + fieldNames[j];
				}
				for (var j = 0; j < fieldData.length; j++) {
					// Reapply this function to each element of the array
					fieldDataArray[j] = this.getFieldData(fieldData[j], subFieldName);
				}
				// If each element is an array, combine them into one
				var newArray = [];
				var isConcat = false;
				for (var j = 0; j < fieldDataArray.length; j++) {
					if (fieldDataArray[j] instanceof Array) {
						newArray = newArray.concat(fieldDataArray[j]);
						isConcat = true;
					}
				}
				if (isConcat) {
					fieldData = newArray;
				} else {
					fieldData = fieldDataArray;
				}
				break;
			}
		}
		return fieldData;
	}
}

module.exports = UserImpleUtil;
