/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * This is the main module for the "fabric-interop-client" package.
 */

// Using this module to host the couple of "typedef" sections used by api.js
// because jsdoc3 generator seems to not able to find them in the api.js module
// likely due to that module containing multiple classes

module.exports.AssetManager = require("./src/AssetManager.js");
module.exports.HashFunctions = require("./src/HashFunctions.js");
