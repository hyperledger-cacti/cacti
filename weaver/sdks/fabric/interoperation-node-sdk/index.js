/**
 * Copyright 2016 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

/**
 * This is the main module for the "fabric-interop-client" package.
 */

// Using this module to host the couple of "typedef" sections used by api.js
// because jsdoc3 generator seems to not able to find them in the api.js module
// likely due to that module containing multiple classes

module.exports.RelayHelper = require("./src/Relay.js");
module.exports.InteroperableHelper = require("./src/InteroperableHelper.js");
module.exports.AssetManager = require("./src/AssetManager.js");
module.exports.HashFunctions = require("./src/HashFunctions.js");
module.exports.EventsManager = require("./src/EventsManager.js");
module.exports.MembershipManager = require("./src/MembershipManager.js");
