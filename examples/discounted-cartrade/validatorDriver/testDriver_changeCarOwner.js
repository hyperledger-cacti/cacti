/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 * 
 * testDriver_changeCarOwner.js
 */

const request = require('request');

var param = {
    apiType: "changeCarOwner",
    progress: "",
    data: {
        carId: "CAR1",
        newOwner: "Robert222"
    }
};
var target = 'http://localhost:5000/validatorDriver?validator=fabric&func=requestLedgerOperation&param=' + JSON.stringify(param);

console.log('url : ' + target);

const options = {
    url: target,
    method: 'GET'
};

request(options, (error, response, body) => {
    if (error !== null) {
        console.log('error:', error);
        return (false);
    }

    console.log('statusCode:', response && response.statusCode);
    console.log('body:', body);
});

