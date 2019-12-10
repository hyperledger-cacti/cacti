/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * UserErrorDef.js
 */

/* Summary:
 * User Defined Error
*/

// Error code & message definition
const definitions = {
// Describe in errorCode:"errorMessage" format
// unregistered information
	1003 : 'Unregistered conversion rule ID.',
	1004 : 'Unregistered transaction ID.',
// Request parameter not specified
	2010 : 'No escrow account ID specified.',
	2011 : 'No representative account ID specified.',
	2012 : 'No display name for the transformation rule specified.',
	2013 : 'No sender end-chain ID specified.',
	2014 : 'No asset type of the sender specified.', // unused
	2015 : 'No receiver end-chain ID specified.',
	2016 : 'No asset type of the receiver specified.', // unused
	2017 : 'No conversion rule specified', // unused
	2018 : 'No commission specified.', // unused
	2019 : 'No transformation rule ID specified.',
	2020 : 'No sender end-chain account ID has been specified.',
	2021 : 'No receiver end-chain account ID has been specified.',
	2022 : 'Both the assets of the sender and the receiver are specified.',
	2023 : 'Either sender or reveiver asset information is required.',
	2024 : 'No sender end-chain information specified.',
	2025 : 'No receiver end-chain information specified.',
	2027 : 'Escrow or no escrow specified.', // unused
	2028 : 'The escrow account and the representative account are duplicated.',
	2029 : 'The sender account and the receiver account are duplicated.',
	2030 : 'The sender account and the representative account of the sender end-chain are duplicated.',
	2031 : 'The receiver account and the representative account of the receiver end-chain are duplicated.',
	2032 : 'The specified end-chain ID and the end-chain ID defined in the transformation rule do not match.',
// duplicated registration
	3003 : 'The conversion rule ID is already registered.', // unused
	3004 : 'This is the already registered transaction ID.', // unused
// Other (related in asset conversion)
	3101 : 'Incorrect conversion ratio or commission value.',
	3104 : 'This is not a asset type which can be converted.'
};

module.exports = definitions;
