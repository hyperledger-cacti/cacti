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

module.exports.RelayHelper = require("./dist/lib/Relay.js");
module.exports.InteroperableHelper = require("./dist/lib/InteroperableHelper.js");
module.exports.AssetManager = require("./dist/lib/AssetManager.js");
module.exports.SatpAssetManager = require("./dist/lib/SatpAssetManager.js");
module.exports.HashFunctions = require("./dist/lib/HashFunctions.js");
module.exports.EventsManager = require("./dist/lib/EventsManager.js");
module.exports.MembershipManager = require("./dist/lib/MembershipManager.js");
