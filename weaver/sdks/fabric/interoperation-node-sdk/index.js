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

module.exports.RelayHelper = require("./build/src/Relay.js");
module.exports.InteroperableHelper = require("./build/src/InteroperableHelper.js");
module.exports.AssetManager = require("./build/src/AssetManager.js");
module.exports.SatpAssetManager = require("./build/src/SatpAssetManager.js");
module.exports.HashFunctions = require("./build/src/HashFunctions.js");
module.exports.EventsManager = require("./build/src/EventsManager.js");
module.exports.MembershipManager = require("./build/src/MembershipManager.js");
