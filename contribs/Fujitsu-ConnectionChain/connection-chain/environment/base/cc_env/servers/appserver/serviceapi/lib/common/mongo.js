/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * mongo.js
 */

/* Summary:
 * library for MongoDB operations
*/

var config = require('config');

var db;
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

// Connection URL
var url = config.mongodb.url;

// Use connect method to connect to the Server
MongoClient.connect(url, function(err, mongodb) {
	assert.equal(null, err);
	console.log("Connected correctly to server");
	db = mongodb;
});

var collection = function( name ) {
	return db.collection( name );
}

module.exports = collection;
