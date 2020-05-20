/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AssetConverter.js
 */

/* Summary:
 * Library for conversion of asset transfer
*/

var CoreAPIError = require('../common/CoreAPIError.js');

var AssetConverter = class {

	/**
	 * Conversion of asset transfer
	 * @param {JSON} rule: Conversion rule information
	 * @param {string} fromAsset: Source asset information (Amount/ID)
	 * @param {string} toAsset: Destination asset information (Amount/ID)
	 * @return{} Object composed by the source/destination asset (JSON) or CoreAPIError
	**/
	static convert(rule, fromAsset, toAsset) {
		var retObj = {fromAsset:fromAsset, toAsset:toAsset};
		var fromType = rule.fromChain.assetType;
		var toType = rule.toChain.assetType;
		return new Promise((resolve, reject) => {

			if (fromType == 'number' && toType == 'number') {
				// only one of the assets must be specified
				if (!isSpecified(fromAsset) && !isSpecified(toAsset)) {
					return reject(new CoreAPIError(422, 2023));
				}
				if (isSpecified(fromAsset) && isSpecified(toAsset)) {
					return reject(new CoreAPIError(422, 2022));
				}
			} else {
				// Not supported when the assets are not numeric
				return reject(new CoreAPIError(422, 3104));
			}

			// At this moment, only the source/destination asset information is specified or both are not specified.
			var isFrom = true;
			var input = fromAsset;
			if (isSpecified(toAsset)) {
				isFrom = false;
				input = toAsset;
			}

			// Apply conversion rules based on the asset types of source and destination asset
			// For numeric to numeric, apply conversion ratio and commission
			if (fromType == 'number') {
				var ratio = parseFloat(rule.rule);
				var commission = rule.commission;
				var com_cons = 0; // commission constant value
				var com_rate = 0; // commission ratio
				var percentIndex = commission.indexOf('%');
				if (percentIndex == -1) {
					// Commission is represented as a constant
					com_cons = parseInt(commission, 10);
				} else if (percentIndex > 0) {
					// Commission is represented as a ratio
					com_rate = parseFloat(commission); // parseFloat can remove the percent notation
				}// * If the first character is "%" (percentIndex = = 0), it is treated as zero commission.

				if (!isFinite(ratio) || !isFinite(com_cons) || !isFinite(com_rate) || com_rate >= 100) {
					logger.error('Rule or commission values are inappropriate.');
					return reject(new CoreAPIError(500, 3101));
				}

				// number -> number
				if (toType == 'number') {
					var inputAsset = parseInt(input, 10);
					var retAsset = 0;
					if (isFrom) {
						retAsset = (inputAsset * (100 - com_rate) / 100 - com_cons) * ratio / 100;
						// TODO: what if the result is a decimal?
						// Truncate as is
						retAsset = Math.floor(retAsset);
						retObj.toAsset = retAsset;
					} else {
						retAsset = (inputAsset * 100 / ratio) * 100 / (100 - com_rate) + com_cons;
						// Round up in the calculation (to => from)
						retAsset =  Math.ceil(retAsset);
						retObj.fromAsset = retAsset;
					}
					return resolve(retObj);
				}
			}
		});
	}
}

function isSpecified(src) {
	if (src != undefined && src != '') {
		return true;
	}
	return false;
}

module.exports = AssetConverter;
